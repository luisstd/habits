# Dashboard Monolith — Data, State, and Presentation Interleaved

## Cluster

- `app/routes/dashboard.tsx` (~450 LOC)
- `app/lib/collection-context.client.ts`
- `app/lib/use-responsive-day-count.ts`

## Problem

`HabitGrid` owns everything: queries, mutation handlers, drag-drop reorder logic, date math, completion lookups, dialog state, and rendering. Every UI change requires understanding the full data flow.

Specific interleaving:
- `handleDragEnd` (reorder logic, ~30 lines) lives between `handleToggle` and the loading check
- `completionSet` and `completionLookup` are derived state computed inline
- Date utilities (`getDays`, `formatDay`, `formatDateRange`) are module-level but only used here
- `HABIT_COLORS` type and `habitColorVar` are UI constants mixed with data logic

## Why It Matters

- Can't test habit CRUD or reorder logic without rendering the full component
- Can't reuse mutation logic (e.g. from a future mobile view or CLI import)
- Understanding "how does reorder work" requires reading through unrelated query and render code

## Possible Direction

Extract a data/mutation layer that HabitGrid consumes:
- A `useHabits()` hook that encapsulates queries + mutation handlers (add, delete, toggle, reorder)
- Date utilities moved to their own module
- Color constants/types shared (see plan 01 for schema sharing)

Keep the component as a thin presentation layer that calls into the hook.

## Test Impact

Extracting mutation and reorder logic into a hook or service would let you test habit CRUD and position reassignment without rendering components or mocking Electric.

## Files to Modify

- `app/routes/dashboard.tsx` — extract logic out
- New: `app/lib/use-habits.ts` or similar data hook
- New: `app/lib/dates.ts` for date utilities
