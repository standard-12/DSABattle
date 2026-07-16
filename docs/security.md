# Security

## Model summary

| Concern | Mechanism |
|---|---|
| Authentication | Supabase Auth (email confirmation, Google/GitHub OAuth); cookie sessions via `@supabase/ssr` — no custom password/token handling anywhere in the codebase |
| Session refresh | Middleware on every request (`updateSession`) |
| Route authorization | Middleware redirects (`/dashboard`, `/matchmaking`, `/room`, `/battle`, `/profile`) |
| Data authorization | RLS with the anon key for page reads; service-role + explicit app-level checks for battle tables (`getBattleRoom` verifies participation) |
| Secrets | `SUPABASE_SERVICE_ROLE_KEY` and Judge0 URLs are server-only env vars; service-role clients exist only in server-side modules |
| Untrusted code execution | Delegated entirely to Judge0's `isolate` sandbox with 2 s CPU / 5 s wall / 128 MB limits per run |
| SQL injection | No raw SQL — all DB access through supabase-js query builders |
| XSS | React's default escaping; no `dangerouslySetInnerHTML` in app code; problem descriptions rendered as text |
| CSRF | State-changing app operations require the Supabase session cookie; Supabase SSR tokens are the auth boundary. No separate CSRF tokens (**assumption:** acceptable given cookie-based Supabase auth + same-site defaults — verify cookie `SameSite` settings in production) |
| Log hygiene | WS server redacts submitted source code and truncates long strings before logging (`summarizePayload`) |

## Designed-in protections worth knowing

- **Private test cases never reach the browser.** Problem pages select only
  `visibility='PUBLIC'` rows and only their `display_*` fields; verdicts
  expose `stderr` only when the failing case is PUBLIC or the failure is
  pre-execution (compile/syntax) — because a runtime traceback can echo the
  private input. This gating is duplicated in both judge paths.
- **Opponents get verdicts only** (`opponent_submitted {username, verdict}`)
  — never compile output, stderr, or code.
- **Room access**: `/room/[roomId]` returns 404 for non-participants (checked
  server-side against `battle_participants`), so battle URLs being guessable
  UUIDs doesn't leak anything.

## ⚠ Known gaps (discovered in review — prioritized)

1. **The WebSocket is unauthenticated.** The server trusts `userId` in every
   payload. Anyone who can reach the WS port can:
   - queue as an arbitrary `userId`/`username`,
   - `join_battle` + `battle_submit` as either participant of any battle id
     they learn, winning/losing battles and moving ELO on someone else's
     behalf.
   *Fix direction:* pass the Supabase access token on connect (query param or
   first message), verify it server-side (`supabase.auth.getUser(jwt)`), and
   bind the session's `userId` from the token instead of the payload.
2. **`battle_submit.problemId` is client-supplied** and not checked against
   the room's `problemId`. A client could submit against a different
   (easier) problem's test cases and still win the battle.
   *Fix:* use `room.problemId`, ignore the payload field.
3. **`/api/execute` and `/api/submit` require no authentication** and have
   **no rate limiting**. Anyone can burn Judge0 capacity (and on `/api/submit`
   enumerate verdicts). *Fix:* require a session (401 otherwise) and add
   per-user rate limits.
4. **No rate limiting on the WS server** either — queue join/leave floods and
   submit spam are possible; each submit triggers a full Judge0 run.
5. **No WS origin check** — browsers from any origin can connect (native
   clients always can; origin checks are a mitigation, not a boundary).
6. **RLS policies are unverifiable from the repo.** The privacy of PRIVATE
   test cases currently *provably* depends on app-side filtering; whether the
   anon key can read them directly depends on dashboard-configured RLS.
   Verify: `problem_test_cases` should deny anon SELECT (or at minimum deny
   PRIVATE rows), battle tables should deny all anon access.
7. **Onboarding username is unvalidated** beyond non-empty: no length cap or
   charset restriction (it's rendered by React, so XSS is not the issue —
   abuse/UX is).
8. **Judge0 is trusted infrastructure.** Anyone who can reach it directly can
   execute arbitrary code on that host — lock it down to the two app
   processes at the network level ([deployment.md](deployment.md)).

## Secrets management

- Local: `.env.local` / `server/.env`, both gitignored. `.env.example` files
  contain no secrets.
- The service-role key appears in exactly four server-side modules
  (`utils/supabase/admin.ts`, `lib/supabase/admin.ts`,
  `server/src/services/supabase.ts`, and via config) — keep it that way.
- No secret-scanning or vault tooling is configured (**guidance:** enable
  GitHub secret scanning / push protection on the repo).
