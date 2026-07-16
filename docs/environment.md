# Environment Variables

Two env files — one per process. Both `.env.example` files exist;
⚠ `Frontend/.env.example` currently omits the Supabase variables, so the
complete sets are documented here.

## `Frontend/.env.local`

| Variable | Required | Default | Purpose | Security |
|---|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | — | Supabase project URL. Used by browser, SSR, middleware, and admin clients | Public by design (`NEXT_PUBLIC_`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | — | Anon key for browser/SSR clients; RLS applies | Public by design; safety depends on correct RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ for `/api/submit`, seeding, battle-room pages | — | Service-role client (`utils/supabase/admin.ts`, `lib/supabase/admin.ts`) — bypasses RLS to read private test cases and battle tables | **Secret.** Server-only; never prefix with `NEXT_PUBLIC_`, never import its clients in client components |
| `AWS_VM_URL` | optional | — | Remote pre-provisioned Judge0 VM. **Takes priority** over everything when set | Server-only. Points at an unauthenticated code-execution service — do not expose |
| `JUDGE0_URL` | optional | `http://localhost:2358` | Manual Judge0 override (used when `AWS_VM_URL` unset) | Server-only |
| `NEXT_PUBLIC_WS_URL` | optional | `ws://localhost:8080` | WebSocket server URL for matchmaking/battle clients | Public. Use `wss://` in production |

Example:

```env
NEXT_PUBLIC_SUPABASE_URL=https://abcd1234.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...      # server-only
AWS_VM_URL=                                   # e.g. http://54.12.34.56:2358
JUDGE0_URL=                                   # manual override
NEXT_PUBLIC_WS_URL=ws://localhost:8080
```

## `server/.env`

| Variable | Required | Default | Purpose | Security |
|---|---|---|---|---|
| `WS_PORT` | optional | `8080` | WebSocket listen port | — |
| `SUPABASE_URL` | ✅ for battles | — | Same Supabase project as the frontend (`NEXT_PUBLIC_SUPABASE_URL` is read as fallback) | — |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ for battles | — | Service-role client — battle creation, test cases, submissions, ELO writes | **Secret** |
| `AWS_VM_URL` | optional | — | Same priority rule as frontend | Server-only |
| `JUDGE0_URL` | optional | `http://localhost:2358` | Same fallback rule as frontend | Server-only |
| `NODE_ENV` | optional | `development` | Read into config; not currently branched on | — |

The Supabase client is created **lazily** — the server boots for pure
matchmaking without DB env, and battle features throw a clear
"Supabase not configured" error until it's set.

## Judge0 URL resolution (both processes, identical)

```
AWS_VM_URL  →  JUDGE0_URL  →  http://localhost:2358 (local Docker)
```

Implemented in `Frontend/lib/judge0/execute.ts` and
`server/src/config/index.ts`. Note the difference in binding time: the WS
server resolves once at startup (config), the frontend resolves per call.

## Rules

- Both processes must point at the **same** Supabase project and the same
  Judge0 instance.
- Judge0 URLs and the service-role key must never reach the browser — no
  `NEXT_PUBLIC_` prefix, ever.
- After editing env files, restart the affected process (Next.js only picks
  up `.env.local` at boot; the WS server reads env once via dotenv).
