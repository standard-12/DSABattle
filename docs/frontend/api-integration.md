# Frontend API Integration

Three integration surfaces: Supabase (data + auth), the two Next.js API
routes (judging), and the WebSocket server (real-time).

## Supabase clients — which one to use

| File | Key | Where it runs | Use for |
|---|---|---|---|
| `utils/supabase/client.ts` | anon | browser | auth state, client-side profile reads |
| `utils/supabase/server.ts` | anon + cookies | RSC / route handlers / server actions | all page data fetching (RLS applies) |
| `utils/supabase/middleware.ts` | anon + req/res cookies | middleware | session refresh (`updateSession`) |
| `utils/supabase/admin.ts` | **service-role** | server only | private test cases (`/api/submit`), battle-room reads (`getBattleRoom`) |
| `lib/supabase/admin.ts` | **service-role** + dotenv | seed/CLI scripts | seeding (loads `.env.local` itself) |

**Never import an admin client from a client component.** The duplication of
the two admin clients is known debt
([../code-quality.md](../code-quality.md)).

Data access goes through one-purpose helper functions rather than inline
queries:

```
lib/problems/getProblems.ts        → problem list
lib/problems/getProblemBySlug.ts   → detail + PUBLIC display examples only
lib/queries/getProfile.ts          → profile with defaulted fields
lib/queries/getLeaderboardPreview.ts → top 5 by rating
lib/battles/getBattleRoom.ts       → battle metadata (service-role + participant check)
```

All of them catch errors, `console.error`, and return `null`/`[]`.

## Internal API routes

Both wrap the Judge0 client in `lib/judge0/` — the browser never calls Judge0
directly. Full request/response schemas:
[../backend/api.md](../backend/api.md).

- **`POST /api/execute`** — one run with custom stdin (the "Run" button).
  Body `{ code, language, stdin }` → raw Judge0-shaped result
  (`stdout/stderr/compileOutput/status/time/memory`).
- **`POST /api/submit`** — full judge (the practice "Submit" button).
  Body `{ problemId, sourceCode, language }`. Fetches **all** test cases with
  the service-role client, runs `lib/judge0/judgeSubmission.ts`
  (sequential, early-exit), persists a `submissions` row with
  `battle_id = null` when a user session exists (persistence failure does not
  fail the request), returns the verdict object.

`lib/judge0/execute.ts` resolves the Judge0 URL as
`AWS_VM_URL → JUDGE0_URL → http://localhost:2358` and polls each submission
token every 500 ms (up to 30×). Performance characteristics and the
optimization plan: [../judging-performance.md](../judging-performance.md).

## WebSocket integration

- `lib/websocket.ts` — the protocol module: `WS_URL`
  (`NEXT_PUBLIC_WS_URL`, default `ws://localhost:8080`), shared
  message/`Language` types, and `create*Message` factory functions. This file
  mirrors `server/src/types/index.ts` — **keep them in sync**.
- `hooks/useWebSocket.ts` (matchmaking) and `hooks/useBattleSocket.ts`
  (battle room) own the socket lifecycle: connect on mount, 30 s heartbeats,
  3 s auto-reconnect, intentional-close guard. Message-by-message protocol:
  [../backend/api.md](../backend/api.md#websocket-protocol).

## Error handling summary

| Surface | Strategy |
|---|---|
| Query helpers | catch → log → `null`/`[]`; pages render fallbacks or `notFound()` |
| API routes | 400 for missing fields, 500 with `{ error }` otherwise |
| WS hooks | server `error` messages land in `state.error`; UI banners render it |
| Forms | `hooks/auth/*` map Supabase errors into field-level messages |
