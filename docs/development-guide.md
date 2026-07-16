# Development Guide

## Prerequisites

- Node.js 20+ and npm
- A **Supabase** project (free tier works) with the schema from
  [backend/database.md](backend/database.md) created manually (no migrations
  in repo) and auth providers configured
- **Judge0 CE** — either:
  - local: `docker compose up -d` from the official Judge0 CE release
    (listens on `http://localhost:2358`, the code's default fallback), or
  - remote: any reachable Judge0 instance via `AWS_VM_URL`/`JUDGE0_URL`
- Windows, macOS, or Linux (repo developed on Windows; commands below in
  PowerShell where it matters)

## First-time setup

```powershell
# 1. Env files
#    Frontend/.env.local  — see environment.md (⚠ .env.example is incomplete)
#    server/.env          — copy server/.env.example and fill in

# 2. Install
cd Frontend; npm install
cd ../server; npm install

# 3. Create the DB schema in Supabase (SQL editor) — tables in backend/database.md

# 4. Seed the 15 bundled problems
cd ../Frontend; npm run seed:problems
```

## Running locally

Two processes, two terminals:

```powershell
# Terminal 1 — WebSocket server (ws://localhost:8080)
cd server; npm run dev        # tsx src/index.ts

# Terminal 2 — Frontend (http://localhost:3000)
cd Frontend; npm run dev      # next dev (Turbopack)
```

> `CLAUDE.md` mentions a root `dev.bat` convenience script; it is not present
> in the repo — start both processes manually.

Verify: the server terminal prints `[Server] Ready`; open
`http://localhost:3000`, sign up, complete onboarding, open a problem and hit
**Run** (exercises Judge0 end-to-end).

To test a battle alone: two browsers (one incognito), two accounts, both visit
`/matchmaking` with overlapping rating ranges and join the queue.

## Useful scripts

### Frontend (`Frontend/package.json`)

| Script | Purpose |
|---|---|
| `npm run dev` / `build` / `start` | Next.js lifecycle |
| `npm run lint` | ESLint |
| `npm run validate` | Full problem-content validation (schema, ordering, reference solvers) |
| `npm run validate:testcases` / `validate:reference` | Focused validators |
| `npm run seed:problems` | Upsert `data/problems/*` into Supabase (service-role) |
| `npm run discover:problems` / `generate:top-supported` / `export:existing-problems` | Content pipeline — see [content-pipeline.md](content-pipeline.md) |
| `npx tsc --noEmit` | **Manual type-check** — builds skip it (`ignoreBuildErrors: true`) |

### Server (`server/package.json`)

| Script | Purpose |
|---|---|
| `npm run dev` | tsx watch-less dev run |
| `npm run build` / `start` | Compile to `dist/` / run compiled |
| `npm run type-check` | `tsc --noEmit` |

## Development workflow

1. Branch from `main`.
2. Make changes; run `npx tsc --noEmit` in the package you touched (builds
   won't catch type errors).
3. If you touched **judge logic or the WS protocol**, update both mirrors:
   - `Frontend/lib/judge0/*` ⟷ `server/src/services/judge0.ts`
   - `Frontend/lib/websocket.ts` ⟷ `server/src/types/index.ts`
4. If you touched problem content, `npm run validate` before seeding.
5. Respect the invariants in [`CLAUDE.md`](../CLAUDE.md) (private test cases,
   service-role confinement, no direct Judge0 calls from the browser, no
   `matchmaking_queue` table).

## Database changes

There are no migration files — apply schema changes in the Supabase SQL
editor and update **both** [backend/database.md](backend/database.md) and the
schema block in [`CLAUDE.md`](../CLAUDE.md). Consider introducing Supabase
CLI migrations (`supabase/migrations/`) as the project grows.

## Seed data

`Frontend/data/problems/<slug>/{problem.json,testcases.json}` — 15 problems.
`seed:problems` upserts by slug and **deletes + reinserts** that problem's
test cases. Adding new problems: [content-pipeline.md](content-pipeline.md).
