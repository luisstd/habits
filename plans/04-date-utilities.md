# Date/Time Utilities — Timezone-Fragile, Scattered, Untested

## Cluster

- `app/routes/dashboard.tsx` — `getDays()`, `formatDay()`, `formatDateRange()`, inline `today` computation

## Problem

All date logic lives inside `dashboard.tsx` as module-level functions. Several known issues:

1. **`today` uses `toISOString().slice(0, 10)`** — this converts to UTC, so near midnight the "today" marker can be wrong relative to the user's local date
2. **`getDays()` uses `new Date()` directly** — untestable without mocking globals, and the offset logic depends on local time
3. **`formatDay()` parses as `T12:00:00`** — a hack to avoid timezone shifts that only works if the user's timezone is within ±12h of UTC
4. **`formatDateRange()` hardcodes `'en'` locale** — not internationalization-ready, though this may be fine for now

None of these functions are tested despite being pure and extractable.

## Why It Matters

- Date edge cases (midnight, DST transitions, timezone boundaries) are the most likely source of subtle bugs
- Can't test any of this without rendering the dashboard
- The `new Date()` dependency makes deterministic testing impossible

## Possible Direction

Extract to `app/lib/dates.ts` with an injectable "now" parameter:

```ts
export function getDays(count: number, offset: number, now = new Date()): string[]
export function getToday(now = new Date()): string
export function formatDay(dateStr: string): { weekday: string; day: number }
export function formatDateRange(days: string[]): string
```

Use `toLocaleDateString` date formatting consistently, or switch to explicit UTC-based date math with `Date.UTC()`.

## Test Impact

All date edge cases (midnight rollover, DST, timezone boundaries) become directly testable with injected timestamps. No component rendering needed.

## Files to Modify

- `app/routes/dashboard.tsx` — extract functions, import from new module
- New: `app/lib/dates.ts`
