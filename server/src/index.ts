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
import {
  isJoinQueueMessage,
  isLeaveQueueMessage,
  isHeartbeatMessage,
  ClientMessage,
} from './types';
import { parseMessage } from './utils';
import config from './config';

const wss = new WebSocketServer({ port: config.port });

console.log(`[Server] WebSocket server starting on port ${config.port}...`);

wss.on('connection', (ws: WebSocket) => {
  const session = createClientSession(ws);

  ws.on('message', (data: unknown) => {
    try {
      const message = parseMessage(data);

      if (!message || typeof message.type !== 'string') {
        return; // silently drop malformed frames
      }

      if (!getClientSession(session.clientId)) return;

      const typed = message as unknown as ClientMessage;

      if (isJoinQueueMessage(typed)) {
        const { userId, username, rating, ratingLower, ratingUpper } = typed.payload;
        if (!userId || !username || rating == null) return;
        addToQueue(session.clientId, userId, username, rating, ratingLower ?? -200, ratingUpper ?? 200);

      } else if (isLeaveQueueMessage(typed)) {
        const { userId } = typed.payload;
        if (!userId) return;
        removeFromQueue(userId);

      } else if (isHeartbeatMessage(typed)) {
        updateHeartbeat(session.clientId);

      } else {
        console.warn(`[Server] Unknown message type: ${message.type}`);
      }
    } catch (err) {
      console.error('[Server] Error processing message:', err);
    }
  });

  ws.on('error', (err: Error) => {
    console.error(`[Server] Socket error (${session.clientId}):`, err.message);
  });

  ws.on('close', () => {
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
