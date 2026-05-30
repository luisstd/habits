# habits

a local-first habit tracker. data lives in the browser via opfs + wa-sqlite, syncs with postgres via electric sql. passkey-only auth.

![habits](./preview.png)

## stack

| layer      | choice                                        |
| ---------- | --------------------------------------------- |
| runtime    | node 24 + pnpm                                |
| framework  | react router v7 (ssr)                         |
| ui         | base ui + tailwind css v4                     |
| data/sync  | tanstack db + electric sql + opfs (wa-sqlite) |
| server db  | postgres 18                                   |
| orm        | drizzle orm                                   |
| auth       | better-auth + passkey                         |
| validation | zod                                           |
| pwa        | vite-plugin-pwa + workbox                     |
| tooling    | biome + husky + vitest                        |

## prerequisites

- [node 24](https://nodejs.org)
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

| command            | description                      |
| ------------------ | -------------------------------- |
| `pnpm dev`         | start dev server                 |
| `pnpm build`       | production build                 |
| `pnpm start`       | serve production build           |
| `pnpm lint`        | check with biome                 |
| `pnpm format`      | format with biome                |
| `pnpm typecheck`   | run typescript checks            |
| `pnpm test`        | run tests                        |
| `pnpm test:watch`  | run tests in watch mode          |
| `pnpm db:generate` | generate drizzle migrations      |
| `pnpm db:migrate`  | run drizzle migrations           |
| `pnpm db:push`     | push schema to database          |
| `pnpm db:reset`    | nuke db volume and repush schema |
| `pnpm db:studio`   | open drizzle studio              |
| `pnpm db:auth`     | regenerate better-auth schema    |

## architecture

```mermaid
flowchart TB
    subgraph browser
        ui(react ui) ---|useLiveQuery| db(tanstack db)
        db --- cache[(opfs · wa-sqlite)]
    end

    db -- mutations --> sync

    subgraph server
        sync("/api/sync") -->|drizzle| pg[(postgres)]
        pg --> electric{{electric sql}}
        electric --> shapes("/api/shapes/*")
    end

    shapes -. shape streams .-> db
```

- **writes** flow down: tanstack db -> /api/sync -> drizzle -> postgres
- **reads** stream up: postgres -> electric -> shape proxy -> tanstack db -> opfs cache

## self-hosting

this command will run everything (postgres, electric, the app) and serve it at `http://localhost:5173`:

```bash
docker compose --profile full up -d --build
```

migrations run on startup and the localhost defaults are enough to register a passkey and try it out.

to put it online, set your own `BETTER_AUTH_SECRET` (`openssl rand -base64 32`) and point `RP_ID` and `AUTH_ORIGIN` at your domain over https.

under the hood it's a node server, a postgres database (with `wal_level=logical`), and an electric instance. `railway.json` is a working example for deployment on railway.
