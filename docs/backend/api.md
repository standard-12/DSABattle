# API Reference

Two surfaces: **HTTP** (Next.js route handlers) and the **WebSocket protocol**
(standalone server, `ws://localhost:8080` by default).

Shared enums:

```
Language = 'python' | 'java' | 'cpp'
Verdict  = 'ACCEPTED' | 'WRONG_ANSWER' | 'TIME_LIMIT_EXCEEDED'
         | 'RUNTIME_ERROR' | 'COMPILATION_ERROR'
```

---

## HTTP endpoints

### `POST /api/execute`

Run code once against custom stdin (the editor's **Run** button).

- **Auth:** none required ⚠ (see [../security.md](../security.md))
- **Body:**
  ```json
  { "code": "print(input())", "language": "python", "stdin": "42" }
  ```
  `code` and `language` required; `stdin` optional (defaults `""`).
- **200 response** (Judge0 passthrough shape):
  ```json
  {
    "stdout": "42\n",
    "stderr": "",
    "compileOutput": "",
    "status": { "id": 3, "description": "Accepted" },
    "time": "0.012",
    "memory": 3456
  }
  ```
- **Errors:** `400 { "error": "Code and language are required" }` ·
  `500 { "error": "<message>" }` (Judge0 unreachable, unsupported language,
  poll timeout).

### `POST /api/submit`

Judge a **practice** submission against all of a problem's test cases
(public + private), sequentially with early exit.

- **Auth:** none required to judge ⚠; if a session cookie is present the
  submission is persisted to `submissions` with `battle_id = null`
  (persistence failure never fails the request).
- **Body:**
  ```json
  { "problemId": "<uuid>", "sourceCode": "...", "language": "python" }
  ```
- **200 response** (`JudgeResult`):
  ```json
  {
    "verdict": "WRONG_ANSWER",
    "passedTestcases": 3,
    "totalTestcases": 12,
    "runtimeMs": 48,
    "memoryKb": 3512,
    "statusDescription": "Accepted",
    "compileOutput": null,
    "stderr": null,
    "failedTestcase": 4
  }
  ```
  Privacy gating: `stderr` is non-null **only** when the failing test case is
  `PUBLIC` or the failure was pre-execution (compile/syntax). `runtimeMs` and
  `memoryKb` are the max across executed cases; they are `null` on
  pre-execution failures. `failedTestcase` is 1-based; `null` when accepted.
- **Errors:** `400` missing fields · `500 { "error": ... }` (test-case fetch
  failure or judge crash).

### `GET /auth/confirm`

Auth callback (not a JSON API): exchanges `?code=` (PKCE) or
`?token_hash=&type=` (legacy OTP) for a session; redirects to `?next=`
(default `/dashboard`) on success, `/auth/auth-code-error` on failure.

---

## WebSocket protocol

Endpoint: `NEXT_PUBLIC_WS_URL` (default `ws://localhost:8080`). All frames are
JSON:

```json
{ "type": "<MessageType>", "payload": { ... }, "timestamp": 1730000000000 }
```

Malformed frames and unknown types are dropped server-side (no error reply).
Types are defined twice — `server/src/types/index.ts` and
`Frontend/lib/websocket.ts` — **keep in sync**.

### Client → Server

| Type | Payload | Notes |
|---|---|---|
| `join_queue` | `{ userId, username, rating, ratingLower, ratingUpper }` | `ratingLower` is a negative delta (e.g. `-200`), `ratingUpper` positive; defaults ±200 if omitted. Duplicate userId → `error DUPLICATE_QUEUE` |
| `leave_queue` | `{ userId }` | Also implicit on disconnect |
| `heartbeat` | `{ userId }` | Every 30 s from the client; sessions silent ≥ 60 s are terminated |
| `join_battle` | `{ battleId, userId, username }` | Binds this socket to a room participant; room rebuilt from DB if not in memory |
| `battle_submit` | `{ battleId, userId, problemId, code, language }` | Judged server-side; see flow in [../architecture.md](../architecture.md#battle-lifecycle) |

### Server → Client

| Type | Payload | Sent when |
|---|---|---|
| `connected` | `{ clientId }` | Immediately on connection |
| `queue_joined` | `{ queueSize }` | Queue insertion confirmed |
| `match_found` | `{ battleRoomId, opponent: { userId, username } }` | Both players, on pairing. `battleRoomId` = `battles.id` |
| `battle_joined` | `{ battleId, status: 'ACTIVE'\|'ENDED', opponent \| null }` | Reply to `join_battle` |
| `submission_result` | `{ verdict, passedTestcases, totalTestcases, runtimeMs, memoryKb, statusDescription, compileOutput, stderr, failedTestcase }` | To the **submitter only** — full detail, same privacy gating as `/api/submit` |
| `opponent_submitted` | `{ username, verdict }` | To the opponent — verdict only, never error detail |
| `battle_ended` | `{ winnerId, winnerUsername, outcome: 'WIN'\|'LOSS', ratingChange, newRating }` | Both players; `outcome`/rating fields are relative to the recipient |
| `error` | `{ message, code? }` | Any failure |

### Error codes

`DUPLICATE_QUEUE` · `NO_PROBLEMS` · `BATTLE_CREATE_FAILED` ·
`BATTLE_NOT_FOUND` · `NOT_PARTICIPANT` · `JOIN_FAILED` · `BATTLE_ENDED` ·
`TESTCASE_LOAD_FAILED` · `SUBMIT_FAILED`

### Typical session (battle)

```
C→S  (connect)
S→C  connected {clientId}
C→S  join_battle {battleId, userId, username}
S→C  battle_joined {status: ACTIVE, opponent}
C→S  heartbeat            (every 30s)
C→S  battle_submit {...}
S→C  submission_result {verdict: WRONG_ANSWER, failedTestcase: 2, ...}
     (opponent receives opponent_submitted)
C→S  battle_submit {...}
S→C  submission_result {verdict: ACCEPTED, ...}
S→C  battle_ended {outcome: WIN, ratingChange: +16, newRating: 1016}
```
