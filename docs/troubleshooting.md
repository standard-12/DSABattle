# Troubleshooting

## Startup

**WS server: "Supabase not configured — set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"**
Matchmaking still works (the client is lazy); battles need `server/.env`
filled in. Restart after editing.

**Frontend: "Another next dev server is already running" / port 3000 taken**
A previous `next dev` is alive. `taskkill /PID <pid> /F` (the error prints the
PID) or let it auto-pick :3001 — but then update OAuth redirect expectations.

**`Error: supabaseUrl is required` at boot or in API routes**
`Frontend/.env.local` missing/incomplete — note that `Frontend/.env.example`
does **not** list the Supabase vars; see [environment.md](environment.md).

## Judging

**Run/Submit hangs then "Execution timed out"**
Judge0 unreachable or overloaded. Checklist:
1. `curl http://localhost:2358/about` (or your `AWS_VM_URL`).
2. Remember resolution order `AWS_VM_URL → JUDGE0_URL → localhost:2358` — an
   empty-but-set `AWS_VM_URL=""` is falsy and safe, but a stale value wins
   silently.
3. Judge0 workers dead: `docker compose ps` / restart the compose stack.

**Submit takes 30–70 s with many test cases — is it stuck?**
No — the judge runs one sandbox per test case, sequentially (~0.5–1 s each).
Known issue with a written optimization plan:
[judging-performance.md](judging-performance.md). Scale workers
(`docker compose up -d --scale workers=6`) for immediate relief.

**Judge0 "Internal Error" (status 13) or cgroup errors**
Query the submission with `&fields=*` to surface the hidden `message` field
(see [judging-performance.md](judging-performance.md#5-judge0-quick-reference)).
On newer kernels Judge0 needs cgroup v1 compatibility
(`systemd.unified_cgroup_hierarchy=0`) — symptom:
`No such file or directory @ rb_sysopen - /box/script.py`.

**C++ solutions fail on inputs that look correct**
Known gap: stdin is sent to Judge0 **without `\r` normalization**; Windows
line endings in test data can break `cin` parsing. Output comparison *is*
normalized, input is not ([code-quality.md](code-quality.md)).

## Matchmaking & battles

**Two players queue but never match**
Ranges must be *mutually* satisfied — a 1000-rated player with ±50 will never
match a 1200-rated player regardless of the other's range. Widen both.
Also confirm both clients show `Connected` (WS up on :8080).

**`error NO_PROBLEMS` on match**
The `problems` table is empty or has no `is_active = true` rows — run
`npm run seed:problems`.

**Room page 404s for a real battle**
`getBattleRoom` returns null both for missing battles **and** for
non-participants — check you're signed in as one of the two matched accounts.

**"Reconnecting" forever in the battle room**
WS server down or `NEXT_PUBLIC_WS_URL` wrong (it's baked in at build time —
rebuild the frontend after changing it). Clients retry every 3 s.

**Queue lost after WS server restart**
Expected — the queue is in-memory. Clients auto-reconnect; users must rejoin
the queue. Active battles survive (rebuilt from DB on `join_battle`).

## Auth

**Redirect loop to /onboarding**
The user has no `profiles` row and profile creation is failing — check the
server logs for the upsert error (RLS on `profiles` must allow
`id = auth.uid()` inserts).

**OAuth lands on /auth/auth-code-error**
Redirect URL not whitelisted in Supabase (`<origin>/auth/confirm` for every
environment), or the code was already exchanged (double-visit).

**Email signup never confirms**
Supabase email settings (SMTP/rate limits) — the confirm link must point at
`/auth/confirm` with a `code` or `token_hash`.

## Build

**Type errors in production that `npm run build` didn't catch**
`next.config.mjs` sets `ignoreBuildErrors: true`. Run `npx tsc --noEmit`.

**`middleware` deprecation warning on build**
Next 16 renamed the convention to `proxy` — warning only, currently
harmless.

## Debugging tips

- WS server logs are verbose by design: `[Matchmaking]`, `[Battle][id][user]`,
  `[Judge0]`, plus a `[Stats] clients=N queued=M` line every 30 s. Submitted
  code is redacted from logs.
- Talk to the WS server by hand (Node ≥ 21 has `WebSocket` built in; else
  `npx wscat -c ws://localhost:8080`):

  ```json
  { "type": "join_queue", "payload": { "userId": "<uuid>", "username": "t", "rating": 1000, "ratingLower": -300, "ratingUpper": 300 }, "timestamp": 0 }
  ```
- Inspect a Judge0 run directly:
  `curl "http://localhost:2358/submissions/<token>?base64_encoded=false&fields=*"`.
- DB state questions: `battles.status`, `battle_participants.finish_position`,
  and `submissions.verdict` tell the whole battle story.
