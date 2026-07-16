# Code Quality — Conventions & Technical Debt

## Conventions

### Naming & structure
- **Frontend data access:** one exported function per file, file named after
  it (`getProblemBySlug.ts`). Helpers catch, `console.error`, and return
  `null`/`[]` — never throw to pages.
- **Components:** feature folders (`problems/`, `battle/`, `workspace/`) use
  PascalCase files; home/dashboard components use kebab-case. Both exist —
  match the folder.
- **Hooks:** `useX.ts` camelCase (`useBattleSocket`); auth hooks under
  `hooks/auth/`.
- **Server services:** module-level state + exported functions, no classes
  (except the frontend's `LivingGraphEngine`, which is a class by design).
- **Types:** WS protocol and judge types defined as unions + type guards;
  DB row shapes typed inline at the query site with local `type X = {...}`.

### Architectural patterns
- Server-first React; client components only at interaction leaves.
- Service-role Supabase access confined to server-only modules.
- Deliberate **mirror files** (must change together):
  - `Frontend/lib/websocket.ts` ⟷ `server/src/types/index.ts`
  - `Frontend/lib/judge0/*` ⟷ `server/src/services/judge0.ts`
- Fire-and-forget async from the WS message router (`void handle...()`) so the
  socket loop never blocks.
- The non-negotiable invariants live in [`CLAUDE.md`](../CLAUDE.md) and
  `.github/architecture-rules.md` / `.github/non-negotiable.md`.

### Reusable utilities
- `Frontend/lib/utils.ts#cn` — class merging.
- `Frontend/lib/starter-code/` — per-language editor templates.
- `server/src/utils/summarizePayload` — log redaction.
- `scripts/lib/` — converters, zod schemas, reference solvers for content.

## Technical debt (verified against current code)

### Correctness
1. **stdin not normalized before Judge0** — `\r` is stripped from *outputs*
   during comparison but not from *inputs*; CRLF test data can break C++
   `cin`. (`Frontend/lib/judge0/execute.ts`, `server/src/services/judge0.ts`)
2. **`base64_encoded=false`** everywhere — plain-text payloads can corrupt on
   exotic characters; Judge0's own docs recommend base64. Same two files.
3. **Python-biased compile detection** — substring match on
   `SyntaxError`/`IndentationError` in combined output can false-positive
   (e.g. a solution that *prints* "SyntaxError").
4. **`finalizeBattle` is ~7 sequential non-transactional writes** (battle,
   2× participants, 2× profiles, 2× history) — a crash mid-way leaves
   inconsistent state. A Postgres function/RPC would make it atomic.
5. **Rating updates are read-modify-write** (`wins + 1` computed in JS) —
   concurrent finalizations could lose increments; single-instance WS makes
   this unlikely today.

### Security (full list in [security.md](security.md))
6. Unauthenticated WebSocket (client-supplied `userId`).
7. `battle_submit.problemId` not validated against the room's problem.
8. No auth/rate limiting on `/api/execute`, `/api/submit`.

### Consistency / hygiene
9. **Two service-role clients** — `utils/supabase/admin.ts` (app) and
   `lib/supabase/admin.ts` (scripts, loads dotenv itself). Consolidation
   candidate.
10. **`typescript.ignoreBuildErrors: true`** in `next.config.mjs` — builds
    don't type-check; CI should run `tsc --noEmit`.
11. **`pnpm` listed as a runtime dependency** in `Frontend/package.json` —
    accidental install.
12. **Dead code:** `Frontend/styles/globals.css` (app uses `app/globals.css`),
    `generateBattleRoomId` in server utils (rooms now use `battles.id`),
    `hooks/use-mobile.ts` vs `components/ui/use-mobile.tsx` duplication.
13. **No DB migrations** — schema exists only as documentation; environments
    are hand-built.
14. **`local-explanation/` is stale** (June 2026 review; several "blocking"
    items listed there — server imports, missing battle gameplay, unpersisted
    submissions — have since been fixed). Prefer `docs/` + `CLAUDE.md`;
    consider deleting or archiving that folder.
15. **`CLAUDE.md` references a root `dev.bat`** that doesn't exist in the
    repo.
16. **`Frontend/.env.example` is incomplete** (missing the Supabase vars) —
    [environment.md](environment.md) is authoritative.
17. **Per-problem `time_limit_ms`/`memory_limit_kb` are stored but unused** —
    judges apply fixed limits (2 s/5 s/128 MB).
18. **Unused schema states** — `battles.status` WAITING/COUNTDOWN never set by
    the current flow.

### Performance
19. **Sequential per-testcase judging** — the dominant latency problem, with a
    full remediation plan in [judging-performance.md](judging-performance.md)
    (batch API + worker scaling recommended first).
20. Matchmaking is O(n²) per join — irrelevant at current scale, fine.

## Suggested priorities

1. WS authentication + `problemId` validation (#6, #7) — integrity of ratings.
2. Judge input hygiene: `\r` strip + base64 (#1, #2) — quiet correctness wins.
3. Batch judging (#19) — biggest UX improvement per line of code.
4. `tsc --noEmit` in CI + drop `ignoreBuildErrors` (#10).
5. Transactional finalization via Postgres function (#4, #5).
