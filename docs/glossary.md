# Glossary

| Term | Meaning in this codebase |
|---|---|
| **Battle** | A 1-v-1 match: one shared problem, first player to get `ACCEPTED` wins. Row in `battles`; its `id` doubles as the **room id** |
| **Room** | The live battle page `/room/[roomId]` plus the WS server's in-memory `BattleRoom` state. `roomId === battles.id` |
| **Practice** | Solo solving on `/problems/[slug]`; judged via `POST /api/submit`; persisted with `battle_id = null` |
| **Participant** | Row in `battle_participants`; `finish_position` `1` = winner, `2` = runner-up, `NULL` = unfinished |
| **Verdict** | Judge outcome: `ACCEPTED`, `WRONG_ANSWER`, `TIME_LIMIT_EXCEEDED`, `RUNTIME_ERROR`, `COMPILATION_ERROR` |
| **Judge / judging** | Running a submission against all of a problem's test cases via Judge0, sequentially with early exit |
| **Judge0** | Open-source code-execution service (sandboxed via `isolate`) driven over REST; local Docker at `:2358` or a remote VM |
| **Test case (machine vs display)** | `input`/`expected_output` = exact stdin/stdout for Judge0; `display_input`/`display_output` = human-readable examples for the UI. Never derived from each other |
| **PUBLIC / PRIVATE** | Test-case visibility. PRIVATE cases (and their stderr) must never reach the browser |
| **Pre-execution failure** | Compile/syntax error — happened before the program read stdin, so its diagnostics are safe to show regardless of visibility |
| **Matchmaking queue** | In-memory array on the WS server (the old `matchmaking_queue` DB table was dropped — never re-add it) |
| **Rating range** | Per-player deltas (`ratingLower` ≤ 0 ≤ `ratingUpper`, default ±200) defining who they'll face; a match requires **mutual** fit |
| **ELO** | Rating system; K-factor 32; updated on battle finalization, logged in `ratings_history` |
| **Finalization** | The first-ACCEPTED sequence: battle → `ENDED`, positions set, profiles updated, history written, `battle_ended` sent |
| **Heartbeat** | Client keep-alive every 30 s; sessions silent ≥ 60 s are terminated by the server sweep |
| **Room rebuild** | `rebuildRoomFromDb` — reconstructing in-memory room state from Supabase after refresh/restart |
| **Service-role client** | Supabase client using the service-role key: bypasses RLS; server-side only |
| **Anon client** | Supabase client using the public anon key; RLS enforced; used by browser/SSR |
| **Onboarding** | Post-signup step creating the `profiles` row (username + rating 1000); enforced by middleware |
| **Content pipeline** | discover → generate → validate → seed tooling that produces problems from a dataset ([content-pipeline.md](content-pipeline.md)) |
| **Reference solver** | Known-good solution used by validators to verify test-case correctness |
| **Living Graph** | The animated Canvas landing-page background (`lib/living-graph/engine.ts`) — a real BFS visualization, thematically on-brand |
| **Starter code** | Per-language editor template (`lib/starter-code/`) |
| **RSC** | React Server Component — the default rendering model in `app/` |
