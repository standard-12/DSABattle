# Frontend Routing

App Router (`Frontend/app/`). All pages are server components unless noted.

## Route map

| Route | File | Auth | Purpose |
|---|---|---|---|
| `/` | `app/page.tsx` | public | Landing page (hero, features, CTA) over the Living Graph canvas |
| `/auth/login` | `app/auth/login/page.tsx` | guests only¹ | Email + OAuth login |
| `/auth/signup` | `app/auth/signup/page.tsx` | guests only¹ | Registration |
| `/auth/forgot-password` | `app/auth/forgot-password/page.tsx` | public | Request reset email |
| `/auth/reset-password` | `app/auth/reset-password/page.tsx` | public | Set new password |
| `/auth/confirm` | `app/auth/confirm/route.ts` | public | **Route handler** — exchanges PKCE `code` / `token_hash` for a session, redirects to `next` (default `/dashboard`) |
| `/auth/auth-code-error` | `app/auth/auth-code-error/page.tsx` | public | Failed confirmation landing |
| `/onboarding` | `app/onboarding/page.tsx` | authed | Username form (server action creates `profiles` row) |
| `/dashboard` | `app/dashboard/page.tsx` | protected | Stats, leaderboard preview, recent battles, Start Battle |
| `/problems` | `app/problems/page.tsx` | public² | Problem list with search + difficulty filter |
| `/problems/[slug]` | `app/problems/[slug]/page.tsx` | public² | Practice workspace (`force-dynamic`) |
| `/matchmaking` | `app/matchmaking/page.tsx` | protected | Client component — queue UI with rating-range sliders |
| `/room/[roomId]` | `app/room/[roomId]/page.tsx` | protected + participant | Battle workspace (`force-dynamic`); `roomId` **is** `battles.id` |
| `/api/execute` | `app/api/execute/route.ts` | none³ | Run code with custom stdin |
| `/api/submit` | `app/api/submit/route.ts` | none³ | Judge against all test cases |

¹ Authenticated users with a profile are redirected to `/dashboard` by middleware.
² Not in the middleware `protectedRoutes` list — problem browsing is public by
  design; data visibility is limited by RLS/PUBLIC-testcase filtering.
³ No auth check before judging — see [../security.md](../security.md).

## Middleware protection

[`Frontend/middleware.ts`](../../Frontend/middleware.ts) runs on everything
except `_next/static`, `_next/image`, `favicon.ico`:

```
protectedRoutes = /dashboard, /battle, /profile, /matchmaking, /room
authRoutes      = /auth/login, /auth/signup
```

Decision order:

1. Refresh session (`utils/supabase/middleware.ts#updateSession`) — one
   `getUser()` round-trip, reused for the checks below.
2. No user + protected route → redirect `/auth/login`.
3. User without a `profiles` row → redirect `/onboarding` (from anywhere
   except `/onboarding` itself).
4. User **with** profile visiting an auth route → redirect `/dashboard`.

Note: `/battle` and `/profile` are protected but no such pages exist yet
(reserved). `redirectTo()` copies session cookies onto the redirect response so
the refreshed session isn't lost.

## Layout hierarchy

```
app/layout.tsx           ← fonts (Inter, JetBrains Mono), ThemeProvider
└── page-level layouts: none — each page composes its own chrome
    ├── landing:   Navbar + sections + Footer (components/home/)
    ├── dashboard: components/navbar.tsx (profile-aware)
    └── workspace: WorkspaceShell (fills viewport, no navbar)
```

`app/layout.tsx` wraps everything in `ThemeProvider`
(`attribute="class"`, `defaultTheme="dark"`, `enableSystem`) and sets
`suppressHydrationWarning` on `<html>` for next-themes.

## Dynamic rendering

`/problems/[slug]` and `/room/[roomId]` export
`dynamic = "force-dynamic"` and `revalidate = 0` — both must reflect live DB
state (submissions, battle status) on every request. `/room/[roomId]` returns
`notFound()` when the battle doesn't exist **or** the user isn't a participant
(deliberately indistinguishable).
