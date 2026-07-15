import { WebSocketServer, WebSocket } from 'ws';
import {
  createClientSession,
  disconnectClient,
  getClientSession,
  updateHeartbeat,
  getConnectedClientCount,
  cleanupStaleConnections,
} from './services/connection';
import {
  addToQueue,
  removeFromQueue,
  cleanupOnDisconnect,
  getQueueSize,
} from './services';
import { handleJoinBattle, handleBattleSubmit } from './services/battle';
import {
  isJoinQueueMessage,
  isLeaveQueueMessage,
  isHeartbeatMessage,
  isJoinBattleMessage,
  isBattleSubmitMessage,
  ClientMessage,
} from './types';
import { parseMessage, summarizePayload } from './utils';
import config from './config';

const wss = new WebSocketServer({ port: config.port });

console.log(`[Server] WebSocket server starting on port ${config.port}...`);

wss.on('connection', (ws: WebSocket, req) => {
  const session = createClientSession(ws);
  console.log(`[Server] Connection opened: ${session.clientId} from ${req.socket.remoteAddress}`);

  ws.on('message', (data: unknown) => {
    try {
      const message = parseMessage(data);

      if (!message || typeof message.type !== 'string') {
        console.warn(`[Server] Dropped malformed frame from ${session.clientId}:`, data);
        return; // silently drop malformed frames
      }

      console.log(`[Server] Received "${message.type}" from ${session.clientId}:`, summarizePayload(message.payload));

      if (!getClientSession(session.clientId)) {
        console.warn(`[Server] Dropped "${message.type}" — no active session for ${session.clientId}`);
        return;
      }

      const typed = message as unknown as ClientMessage;

      if (isJoinQueueMessage(typed)) {
        const { userId, username, rating, ratingLower, ratingUpper } = typed.payload;
        if (!userId || !username || rating == null) {
          console.warn(`[Server] Dropped "join_queue" from ${session.clientId} — missing userId/username/rating`);
          return;
        }
        addToQueue(session.clientId, userId, username, rating, ratingLower ?? -200, ratingUpper ?? 200);

      } else if (isLeaveQueueMessage(typed)) {
        const { userId } = typed.payload;
        if (!userId) {
          console.warn(`[Server] Dropped "leave_queue" from ${session.clientId} — missing userId`);
          return;
        }
        removeFromQueue(userId);

      } else if (isHeartbeatMessage(typed)) {
        updateHeartbeat(session.clientId);

      } else if (isJoinBattleMessage(typed)) {
        const { battleId, userId, username } = typed.payload;
        if (!battleId || !userId) {
          console.warn(`[Server] Dropped "join_battle" from ${session.clientId} — missing battleId/userId`);
          return;
        }
        void handleJoinBattle(session.clientId, { battleId, userId, username });

      } else if (isBattleSubmitMessage(typed)) {
        const { battleId, userId, problemId, code, language } = typed.payload;
        const missing = [
          !battleId && 'battleId',
          !userId && 'userId',
          !problemId && 'problemId',
          !code && 'code',
          !language && 'language',
        ].filter(Boolean);
        if (missing.length > 0) {
          console.warn(`[Server] Dropped "battle_submit" from ${session.clientId} — missing field(s): ${missing.join(', ')}`);
          return;
        }
        console.log(`[Server] Dispatching battle_submit: battle=${battleId} user=${userId} problem=${problemId} lang=${language} codeLen=${code.length}`);
        void handleBattleSubmit(session.clientId, { battleId, userId, problemId, code, language });

      } else {
        console.warn(`[Server] Unknown message type: ${message.type}`);
      }
    } catch (err) {
      console.error(`[Server] Error processing message from ${session.clientId}:`, err);
    }
  });

  ws.on('error', (err: Error) => {
    console.error(`[Server] Socket error (${session.clientId}):`, err.message);
  });

  ws.on('close', (code: number, reason: Buffer) => {
    console.log(`[Server] Connection closed: ${session.clientId} code=${code} reason=${reason.toString('utf8') || '(none)'}`);
    // Always run both — order matters: remove from session map first,
    // then clean up the queue (removeFromQueueByClientId needs the clientId only).
    disconnectClient(session.clientId);
    cleanupOnDisconnect(session.clientId);
  });
});

wss.on('error', (err: Error) => {
  console.error('[Server] Server error:', err);
});

// Periodic stats + stale connection cleanup
setInterval(() => {
  const cleaned = cleanupStaleConnections(60_000);
  if (cleaned > 0) {
    console.log(`[Server] Cleaned up ${cleaned} stale connection(s)`);
  }
  console.log(`[Stats] clients=${getConnectedClientCount()} queued=${getQueueSize()}`);
}, 30_000);

console.log(`[Server] Listening on ws://localhost:${config.port}`);
console.log(`[Server] Ready`);
