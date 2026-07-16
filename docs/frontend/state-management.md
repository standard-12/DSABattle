# Frontend State Management

There is **no global state library** (no Redux/Zustand/Context stores). State
is managed at three levels, matching the server-first architecture.

## 1. Server state → React Server Components

Pages fetch straight from Supabase in the component body and pass plain props:

```tsx
// app/dashboard/page.tsx
const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();
const profile = await getProfile(user.id);
return <StatsCard profile={profile} />;
```

Freshness is controlled per route (`force-dynamic` on problems/room pages).
There is no client-side cache layer (no React Query/SWR); a full navigation
re-fetches.

## 2. Local UI state → `useState` in leaf components

Editor code/language/stdin (`EditorPane`), mobile menu toggles, form fields.
Nothing is lifted higher than needed. Submission results are held where the
submit happens (`SolverWorkspace` / `useBattleSocket`) and passed down as
props.

## 3. Real-time state → WebSocket hooks

The interesting state lives in two symmetric hooks that own a raw
`WebSocket` and reduce server messages into a state object:

### `hooks/useWebSocket.ts` — matchmaking

```ts
state: { connected, inQueue, matchFound, battleRoomId, opponent, error, queueSize }
api:   { joinQueue(), leaveQueue(), disconnect() }
```

- Connects on mount; auto-reconnects after 3 s unless intentionally closed
  (`intentionalRef` guard).
- 30 s heartbeat starts on `connected`; server terminates sessions silent for
  60 s.
- `inQueue` becomes true only on the server's `queue_joined` confirmation —
  the UI never assumes.
- `match_found` sets `battleRoomId`; the matchmaking page watches it and
  `router.push(/room/{id})`.

### `hooks/useBattleSocket.ts` — battle room

```ts
state: { connected, joined, submitting, result, opponentSubmitted,
         battleEnded, outcome, ratingChange, newRating, winnerUsername, error }
api:   { submit(problemId, code, language) }
```

- On `connected` it immediately sends `join_battle` to bind this socket to the
  room (server rebuilds the room from the DB if needed — refresh-safe).
- `submission_result` carries the full verdict detail for **your own**
  submission; `opponent_submitted` carries only `{username, verdict}`.
- `battle_ended` freezes the UI and carries the ELO outcome relative to the
  recipient.

Both hooks deliberately connect **once on mount**
(`useEffect(..., [])` with an eslint-disable) — options changing mid-session
(e.g. rating sliders) apply on the next `join_queue` send, not by reconnecting.

## Auth state

- Server: `supabase.auth.getUser()` per request (middleware + pages).
- Client: `components/home/navbar.tsx` subscribes to
  `supabase.auth.onAuthStateChange` — the `INITIAL_SESSION` event supplies the
  current user without a separate `getUser()` call (avoids a Web Lock race,
  documented inline).
- Auth mutations live in `services/auth.service.ts` (signup/login/logout/OAuth)
  and thin `hooks/auth/*` wrappers used by the form components.

## Theme state

`next-themes` (provider in `app/layout.tsx`) persists the choice in
`localStorage` and toggles the `dark` class on `<html>`. Consumers read
`useTheme().resolvedTheme` — e.g. `LivingGraphBackground` re-reads canvas
colors when it changes.
