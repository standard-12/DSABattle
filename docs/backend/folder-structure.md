# Backend Folder Structure

```
server/
├── package.json          # deps: ws, @supabase/supabase-js, dotenv
│                         # scripts: dev (tsx), build (tsc), start (dist), type-check
├── tsconfig.json
├── .env / .env.example   # WS_PORT, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
│                         # AWS_VM_URL, JUDGE0_URL
└── src/
    ├── index.ts          # WebSocketServer bootstrap + message router
    │                     #   - connection/close/error handlers
    │                     #   - 30s stats + stale-connection sweep
    ├── config/
    │   └── index.ts      # env loading (dotenv) + Judge0 URL resolution
    ├── services/
    │   ├── connection.ts # ClientSession map, send primitives, heartbeats
    │   ├── index.ts      # matchmaking queue + mutual-range pairing
    │   ├── battle.ts     # activeRooms, join/submit handlers, ELO finalize
    │   ├── judge0.ts     # executeCode + judgeSubmission (mirror of Frontend/lib/judge0)
    │   └── supabase.ts   # lazy service-role client
    ├── types/
    │   └── index.ts      # WS protocol types + type guards (mirror of Frontend/lib/websocket.ts)
    └── utils/
        └── index.ts      # parseMessage, summarizePayload (code redaction), id gens
```

Conventions:

- Plain module-level state, no framework/DI — the process **is** the state.
- `services/index.ts` is the matchmaking module (imported as
  `from './services'`); connection functions are imported explicitly
  `from './services/connection'`.
- Two files are deliberate mirrors of frontend counterparts and must be kept
  in sync when the protocol or verdict logic changes:
  - `src/types/index.ts` ⟷ `Frontend/lib/websocket.ts`
  - `src/services/judge0.ts` ⟷ `Frontend/lib/judge0/{execute,judgeSubmission,compare}.ts`
- ESM (`"type": "module"`); dev runs TypeScript directly via `tsx`,
  production compiles to `dist/` with `tsc`.
