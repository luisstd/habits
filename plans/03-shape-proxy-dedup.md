# Shape Proxy Routes — Boilerplate Duplication

## Cluster

- `app/routes/api.shapes.habits.ts`
- `app/routes/api.shapes.completions.ts`

## Problem

These two files are 95% identical. Both:
1. Check auth via `auth.api.getSession()`
2. Build a URL to the Electric SQL shape endpoint
3. Forward a hardcoded list of `ELECTRIC_PROTOCOL_QUERY_PARAMS` from the request
4. Add a `where` clause scoping to the current user
5. Proxy the response back

The only differences are the table name and the `where` column (`user_id` vs `userId` depending on the table's column naming).

Additionally, both forward unvalidated query params to Electric with no allowlist beyond the protocol params — if Electric adds new params that expose data, both routes inherit the vulnerability.

## Why It Matters

- Adding a new synced table means copy-pasting a third file
- A bug fix or security hardening must be applied in every copy
- No tests for what params are safe to forward

## Possible Direction

A single factory function like `createShapeProxy({ table, userColumn })` that returns a loader. Each route file becomes a one-liner:

```ts
export const loader = createShapeProxy({ table: 'habits', userColumn: 'user_id' })
```

## Test Impact

A single parameterized proxy would be testable once (auth check, param forwarding, user scoping) instead of needing duplicate tests per table.

## Files to Modify

- `app/routes/api.shapes.habits.ts`
- `app/routes/api.shapes.completions.ts`
- New: `app/.server/shape-proxy.ts` or similar
