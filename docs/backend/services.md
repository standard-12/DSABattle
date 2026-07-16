# Backend Services

The WS server's logic lives in four service modules under
[`server/src/services/`](../../server/src/services). All state is
module-level (no classes/DI) — simple and single-instance by design.

## Connection service (`connection.ts`)

Owns `connectedClients: Map<clientId, ClientSession>`.

```ts
ClientSession = { clientId, userId|null, username|null, inQueue, lastHeartbeat, ws }
```

- `createClientSession(ws)` — mints `client_<ts>_<rand>`, stores the session,
  immediately sends `connected {clientId}`.
- `broadcastToClient(clientId, data)` — the **only** send primitive
  (JSON-stringifies; failures logged, never thrown).
- `sendErrorToClient(clientId, message, code?)` — typed `error` frames.
- `cleanupStaleConnections(60_000)` — called every 30 s from `index.ts`;
  `ws.terminate()` on sessions whose `lastHeartbeat` is stale, which fires the
  normal `close` handler → full cleanup path.

## Matchmaking service (`index.ts`)

In-memory only (the old `matchmaking_queue` table was **dropped** — never
re-add it). State: `matchmakingQueue: QueuedUser[]` (join order) +
`queuedUserIds: Set` (duplicate guard).

```ts
QueuedUser = { clientId, userId, username, rating, ratingLower, ratingUpper, joinedAt }
```

- `addToQueue(...)` — rejects duplicates (`DUPLICATE_QUEUE`), confirms with
  `queue_joined {queueSize}`, then runs matching.
- Matching (`tryMatchUsers`) — greedy scan in join order: for each player,
  the first later player passing the **mutual** range check is paired:

  ```ts
  bInA = b.rating ∈ [a.rating + a.ratingLower, a.rating + a.ratingUpper]
  aInB = a.rating ∈ [b.rating + b.ratingLower, b.rating + b.ratingUpper]
  compatible = bInA && aInB
  ```

  On a match it splices both, calls `pairUsers` → fire-and-forget
  `createBattleAndNotify`, and recurses while ≥2 remain.
- `cleanupOnDisconnect(clientId)` — removes a queued user when their socket
  closes (called from the `close` handler after `disconnectClient`).

## Battle service (`battle.ts`)

Owns `activeRooms: Map<battleId, BattleRoom>`.

```ts
BattleRoom = { battleId, problemId, problemSlug,
               participants: [{ userId, username, clientId|null, finished }],
               ended }
```

- **`createBattleAndNotify(a, b)`** — picks a uniform-random `is_active`
  problem, inserts the `battles` row (`status: 'ACTIVE'`, `started_at: now`)
  and both `battle_participants`, registers the room, and sends each player
  `match_found {battleRoomId, opponent}`. Failures send `NO_PROBLEMS` /
  `BATTLE_CREATE_FAILED` to both.
- **`rebuildRoomFromDb(battleId)`** — reconstructs a room (battle +
  participants + usernames) when it isn't in memory; this is what makes page
  refreshes and server restarts survivable. `getRoom()` = memory ?? rebuild.
- **`handleJoinBattle`** — binds the caller's `clientId` to their participant
  entry and replies `battle_joined {status, opponent}` (`NOT_PARTICIPANT` if
  the userId isn't in the battle).
- **`handleBattleSubmit`** — the core path:
  1. Guard: room exists, not `ended`.
  2. Fetch **all** test cases (`input, expected_output, visibility`) ordered
     by `order_index` (service-role).
  3. `judgeSubmission(...)` (below).
  4. Persist to `submissions` (with `battle_id`); insert failure logged, not
     fatal.
  5. `submission_result` (full detail) to the submitter;
     `opponent_submitted {username, verdict}` to the opponent.
  6. If `ACCEPTED` and `!room.ended`: set `room.ended = true`
     **synchronously** (double-finalize guard within this single-threaded
     process) → `finalizeBattle`.
- **`finalizeBattle(room, winnerId)`** — reads both profiles, computes ELO,
  then sequentially: battle → `ENDED`+`ended_at`; winner
  `finish_position=1, solved_at`; loser `finish_position=2`; both profiles
  (rating, wins/losses, battles_played); two `ratings_history` rows; sends
  each connected player `battle_ended` with recipient-relative
  `outcome/ratingChange/newRating`; deletes the room from memory.
  ⚠ These are ~7 separate non-transactional writes — a crash mid-way leaves
  partial state ([../code-quality.md](../code-quality.md)).

### ELO

```ts
K = 32
expected(w) = 1 / (1 + 10^((Rl − Rw)/400))
newWinner = round(Rw + K·(1 − expected(w)))
newLoser  = round(Rl + K·(0 − expected(l)))
```

## Judge0 service (`judge0.ts`)

A near-verbatim port of `Frontend/lib/judge0/*` — **keep verdict logic in sync**
(stated at the top of both files).

- `executeCode` — `POST /submissions?base64_encoded=false&wait=false` with
  `{ source_code, language_id, stdin, cpu_time_limit: 2, wall_time_limit: 5,
  memory_limit: 128000 }`, then polls the token every 500 ms (≤30×) until
  `status.id >= 3`. Language ids: python 71, java 62, cpp 54.
- `judgeSubmission` — sequential per-test-case loop with early exit:
  - Python `SyntaxError`/`IndentationError` in any output → `COMPILATION_ERROR`
    (pre-execution).
  - Judge0 status 5 → `TIME_LIMIT_EXCEEDED`; 6 → `COMPILATION_ERROR`;
    7–12 → `RUNTIME_ERROR`; any other non-3 → `RUNTIME_ERROR`.
  - stdout vs expected: `\r\n → \n` + trim, strict equality.
  - **Privacy gating:** the `fail(verdict, preExecution)` helper only includes
    `stderr` when `preExecution` or the failing case is `PUBLIC`; details
    truncated to 2000 chars.
- Latency analysis and the batch/harness optimization plan:
  [../judging-performance.md](../judging-performance.md).

## Supabase service (`supabase.ts`)

Lazily-created singleton service-role client (`autoRefreshToken: false`,
`persistSession: false`). Lazy so the server can boot for pure matchmaking
even without DB env; battle features throw a clear config error instead.

## Utils (`utils/index.ts`)

- `parseMessage` — Buffer|string → JSON object, else `null` (silently drops
  binary/garbage frames; the Buffer handling matters because `ws` delivers
  Buffers by default).
- `summarizePayload` — log-safe payloads: redacts `code`/`sourceCode`/
  `source_code`, truncates >120-char strings.
- `generateClientId` / `generateBattleRoomId` (the latter is legacy — room ids
  are now `battles.id`).
