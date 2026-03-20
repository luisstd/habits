# Sync Mutation Layer — Schema Duplication + String-Typed Dispatch

## Cluster

- `app/lib/collections.client.ts` — client-side Zod schemas + `syncMutation()` fetch wrapper
- `app/routes/api.sync.ts` — server-side Zod schemas + switch-case mutation handler
- `app/routes/dashboard.tsx` — mutation callbacks that pass raw data to collections

## Problem

Client and server independently define Zod schemas for the same entities. The schemas diverge in meaningful ways:

- Client `habitSchema` accepts any `z.string()` for `id`, server `createHabitSchema` requires `z.string().uuid()`
- Client doesn't enforce `min(1)` on name/color, server does
- Server has `optional().default()` on `archived`, client doesn't

Mutation types are bare strings (`'createHabit'`, `'updateHabit'`) with no shared type contract. Adding a field or mutation type requires changes in 3+ files with no compiler help to catch mismatches.

The `syncMutation` function accepts `Record<string, unknown>` — fully untyped at the call boundary.

## Why It Matters

- Silent runtime failures when client sends data the server rejects
- No way to catch mutation contract drift at build time
- Adding a new mutation (e.g. `archiveHabit`) requires manual coordination across files

## Possible Direction

A shared mutation contract (types or schemas) imported by both client and server. This could be:
- Shared Zod schemas in a `app/lib/mutations.ts` file
- A typed `syncMutation<T extends MutationType>(type: T, data: MutationData[T])` wrapper
- Server handler generated from the same schema definitions

## Test Impact

A typed sync contract would let you test mutations at the boundary (valid/invalid payloads in, expected DB state out) instead of tracing through UI callbacks → fetch → switch statement.

## Files to Modify

- `app/lib/collections.client.ts`
- `app/routes/api.sync.ts`
- New: shared schema/contract file
