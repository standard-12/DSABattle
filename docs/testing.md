# Testing

## Current state — honest assessment

**There is no automated test suite.** No test framework (Jest/Vitest/
Playwright) is installed in either package, and no `*.test.*` / `*.spec.*`
files exist.

What exists instead:

| Check | Command | Covers |
|---|---|---|
| Content validation | `cd Frontend; npm run validate` | Problem/testcase JSON schemas (zod), ordering, visibility rules, **reference-solver correctness** against public test cases — this is the closest thing to a test suite and guards the judging data |
| Type checking | `npx tsc --noEmit` (Frontend), `npm run type-check` (server) | Static correctness. ⚠ Must be run manually — `next build` skips it (`ignoreBuildErrors: true`) |
| Linting | `cd Frontend; npm run lint` | ESLint |

## Recommended minimum-viable checks before merging

1. `npx tsc --noEmit` in every package you touched.
2. `npm run validate` if you touched anything under `Frontend/data/` or
   `Frontend/scripts/`.
3. Manual smoke: sign in → open a problem → **Run** → **Submit** (exercises
   auth, RSC data fetch, `/api/execute`, `/api/submit`, Judge0, persistence).
4. For WS changes: two browsers → matchmaking → battle → submit wrong → submit
   right → verify `battle_ended`, ELO delta, and DB rows.

## If you introduce a test framework (guidance)

The codebase's highest-value, lowest-effort test targets are pure functions
with no I/O:

- `lib/judge0/compare.ts` — output normalization/comparison
- verdict mapping in `judgeSubmission` (mock `executeCode`) — including the
  stderr privacy gating (PUBLIC vs PRIVATE vs pre-execution), the most
  security-sensitive logic in the app
- `server/src/services/index.ts#isCompatible` — mutual rating-range matching
- `computeElo` in `server/src/services/battle.ts`
- `server/src/utils/summarizePayload` — code redaction

Vitest fits both packages (ESM + TS, zero config). Keep the two judge
implementations covered by the **same** test vectors to enforce their
keep-in-sync contract mechanically.
