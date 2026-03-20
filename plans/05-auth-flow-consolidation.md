# Auth Flow — Session Race + Fragmented State

## Cluster

- `app/.server/auth.ts` — Better Auth config (anonymous + passkey plugins)
- `app/lib/auth.client.ts` — Client-side auth methods
- `app/routes/setup.tsx` — Anonymous sign-in + passkey registration
- `app/routes/login.tsx` — Passkey sign-in
- `app/routes/layout.tsx` — Session guard (redirect to /login if no session)

## Problem

The auth flow is an implicit state machine spread across 5 files:

1. **Setup** (`setup.tsx`): calls `authClient.signIn.anonymous()` → `authClient.passkey.addPasskey()` → `window.location.href = '/'`
2. **Login** (`login.tsx`): calls `authClient.signIn.passkey()` → `navigate('/')`
3. **Layout guard** (`layout.tsx`): checks `auth.api.getSession()`, redirects to `/login` if missing

Issues:
- **Session race**: `setup.tsx` does a hard `window.location.href = '/'` after passkey registration. This doesn't await the session cookie being fully established. If the network is slow, the layout loader may not see the session yet.
- **Partial registration**: If passkey setup fails after anonymous sign-in succeeds, the user is in a liminal state — authenticated anonymously but with no passkey. The setup page checks for this, but the check is a loader that queries the DB directly.
- **Inconsistent auth checks**: `layout.tsx` uses `auth.api.getSession()`, while `setup.tsx` and `login.tsx` loaders query the DB (`db.select()`) to check if the user has credentials. These are different sources of truth.

## Why It Matters

- The setup→login→dashboard flow has untestable race conditions
- Adding a new auth method (e.g. email/password) means touching multiple files and understanding the implicit state machine
- No single place to understand "what states can a user be in"

## Possible Direction

Consolidate auth state into an explicit state machine or a single `getAuthState()` server function that returns:

```ts
type AuthState =
  | { status: 'unauthenticated' }
  | { status: 'anonymous'; userId: string }  // has session, no passkey
  | { status: 'authenticated'; userId: string }  // has session + passkey
```

All route loaders call this one function. Setup/login routes handle transitions. No hard redirects — use React Router's `navigate()` consistently.

## Test Impact

A single `getAuthState()` function is testable with mocked session/DB state. The state machine transitions (unauthenticated → anonymous → authenticated) become explicit and verifiable.

## Files to Modify

- `app/.server/auth.ts` — add `getAuthState()` or similar
- `app/routes/setup.tsx` — use shared auth state, fix race condition
- `app/routes/login.tsx` — use shared auth state
- `app/routes/layout.tsx` — use shared auth state
