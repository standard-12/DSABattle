# Frontend Overview

Next.js 16 (App Router, Turbopack) + React 19 + TypeScript. Located in
[`Frontend/`](../../Frontend).

## Architectural style

**Server-first.** Pages are React Server Components that fetch data directly
via Supabase and pass plain props down; interactivity is pushed into leaf
`"use client"` components. There is no global client state store — see
[state-management.md](state-management.md).

```
request → middleware.ts (session + guards)
        → server component (data fetch via lib/ query helpers)
        → client components (Monaco editor, WebSocket hooks, forms)
```

## Layers

| Layer | Location | Rules |
|---|---|---|
| Routes | `app/` | Server components by default; `dynamic = "force-dynamic"` on data-live pages (problems, room) |
| API routes | `app/api/execute`, `app/api/submit` | The only places the frontend talks to Judge0 |
| Components | `components/` | Domain-grouped (`home/`, `auth/`, `problems/`, `editor/`, `workspace/`, `battle/`, `ui/`) |
| Hooks | `hooks/` | WebSocket clients, auth form logic, UI utilities |
| Data access | `lib/` | One function per file (`getProblems`, `getProfile`, …); server-only |
| Supabase clients | `utils/supabase/` | `client` (browser), `server` (RSC), `middleware`, `admin` (service-role) |
| Types | `types/` | `problem.ts`, `language.ts`, `execution.ts` |
| Content tooling | `scripts/`, `data/` | Problem pipeline — see [../content-pipeline.md](../content-pipeline.md) |

## Key patterns and why

- **Query helpers return `null`/`[]` on failure, never throw.** Every function
  in `lib/queries/`, `lib/problems/`, `lib/battles/` catches, logs
  (`console.error`), and returns a safe fallback so pages degrade instead of
  500ing.
- **Service-role usage is confined** to `utils/supabase/admin.ts` (used by
  `/api/submit` and `lib/battles/getBattleRoom.ts`) and `lib/supabase/admin.ts`
  (used by seed scripts). Neither is ever imported from a client component.
- **The workspace trio** (`WorkspaceShell` + `ProblemPanel` + editor pane) is
  shared between practice and battle pages so the two-pane LeetCode-style UI
  stays identical; only the submission transport differs
  (HTTP `/api/submit` vs WS `battle_submit`). See [components.md](components.md).
- **Judge privacy contract**: `getProblemBySlug` selects only
  `visibility = 'PUBLIC'` test cases and only their `display_*` fields;
  verdict objects expose `stderr` only for public/pre-execution failures.

## Build & tooling

- `npm run dev` / `npm run build` (Turbopack).
- Tailwind CSS v4 via `@tailwindcss/postcss` (no `tailwind.config` file —
  tokens live in `app/globals.css`; see [styling.md](styling.md)).
- shadcn/ui components generated into `components/ui/` (`components.json`).
- ⚠️ `next.config.mjs` sets `typescript.ignoreBuildErrors: true` — builds do
  **not** type-check. Run `npx tsc --noEmit` manually
  (see [../code-quality.md](../code-quality.md)).
- `middleware.ts` uses the Next.js middleware convention, which Next 16
  reports as deprecated in favor of `proxy` — currently a warning only.

## Performance notes

- Landing-page background is a dependency-free Canvas 2D engine
  (`lib/living-graph/engine.ts`) with DPR capping, adaptive quality,
  visibility pause, and reduced-motion fallback ([components.md](components.md#living-graph-background)).
- Problem/room pages opt out of caching (`force-dynamic`, `revalidate = 0`)
  because verdicts and battle state must be live.
- `images.unoptimized: true` — no Next image optimization pipeline is used.
