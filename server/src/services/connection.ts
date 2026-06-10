import { WebSocket } from 'ws';
import { ConnectedMessage, ErrorMessage } from '../types';
import { generateClientId } from '../utils';

export interface ClientSession {
  clientId: string;
  userId: string | null;
  username: string | null;
  inQueue: boolean;
  lastHeartbeat: number;
  ws: WebSocket;
}

export const connectedClients = new Map<string, ClientSession>();

export function createClientSession(ws: WebSocket): ClientSession {
  const clientId = generateClientId();
  const session: ClientSession = {
    clientId,
    userId: null,
    username: null,
    inQueue: false,
    lastHeartbeat: Date.now(),
    ws,
  };

  connectedClients.set(clientId, session);
  console.log(`[Connection] Client connected: ${clientId}`);

  const connectedMessage: ConnectedMessage = {
    type: 'connected',
    payload: { clientId },
    timestamp: Date.now(),
  };
  ws.send(JSON.stringify(connectedMessage));

  return session;
}

export function disconnectClient(clientId: string): void {
  const session = connectedClients.get(clientId);
  if (!session) return;

  connectedClients.delete(clientId);
  console.log(`[Connection] Client disconnected: ${clientId}`);
}

export function getClientSession(clientId: string): ClientSession | undefined {
  return connectedClients.get(clientId);
}

export function updateHeartbeat(clientId: string): void {
  const session = connectedClients.get(clientId);
  if (session) {
    session.lastHeartbeat = Date.now();
  }
}

export function broadcastToClient(clientId: string, data: unknown): void {
  const session = connectedClients.get(clientId);
  if (!session) return;

  try {
    session.ws.send(JSON.stringify(data));
  } catch (err) {
    console.error(`[Connection] Failed to send to ${clientId}:`, err);
  }
}

export function sendErrorToClient(clientId: string, message: string, code?: string): void {
  const errorMessage: ErrorMessage = {
    type: 'error',
    payload: { message, code },
    timestamp: Date.now(),
  };
  broadcastToClient(clientId, errorMessage);
}

export function getConnectedClientCount(): number {
  return connectedClients.size;
}

/**
 * Force-terminates connections that haven't sent a heartbeat within timeoutMs.
 * Uses ws.terminate() so the 'close' event fires on each socket, which lets
 * the normal close handler run disconnectClient + cleanupOnDisconnect.
 */
export function cleanupStaleConnections(timeoutMs: number = 60_000): number {
  const now = Date.now();
  const stale: ClientSession[] = [];

  for (const session of connectedClients.values()) {
    if (now - session.lastHeartbeat >= timeoutMs) {
      stale.push(session);
    }
  }

  for (const session of stale) {
    console.log(`[Connection] Terminating stale connection: ${session.clientId}`);
    session.ws.terminate(); // triggers 'close' event → handled by index.ts
  }

  return stale.length;
}
