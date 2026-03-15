# habits

a local-first habit tracker. data lives in the browser, syncs with postgres via electric sql. single-user, passkey-only auth.

## stack

| layer | choice |
|-------|--------|
| runtime | node 22 + pnpm |
| framework | react router v7 (ssr) |
| ui | shadcn/ui + tailwind css |
| data/sync | tanstack db + electric sql |
| server db | postgres 16 |
| orm | drizzle orm |
| auth | better-auth + passkey |

## prerequisites

- [node 22](https://nodejs.org)
- [pnpm](https://pnpm.io)
- [docker](https://docker.com)

## local dev

```bash
cp .env.example .env
docker compose up -d
pnpm install
pnpm db:push
pnpm dev
```

app runs at `http://localhost:5173`

## commands

| command | description |
|---------|-------------|
| `pnpm dev` | start dev server |
| `pnpm build` | production build |
| `pnpm start` | serve production build |
| `pnpm lint` | check with biome |
| `pnpm format` | format with biome |
| `pnpm typecheck` | run typescript checks |
| `pnpm db:generate` | generate drizzle migrations |
| `pnpm db:migrate` | run drizzle migrations |
| `pnpm db:push` | push schema to database |
| `pnpm db:reset` | nuke db volume and repush schema |
| `pnpm db:auth` | regenerate better-auth schema |

## architecture

```
browser (wa-sqlite) <-> electric sql <-> postgres
         |                                  |
    tanstack db                        drizzle orm
```

- **reads**: electric sql streams changes to the browser via tanstack db
- **writes**: client sends mutations through api routes -> drizzle -> postgres -> electric pushes back

## deployment

configured for railway via `railway.toml` and `Dockerfile`.
