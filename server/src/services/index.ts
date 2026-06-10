import { generateBattleRoomId } from '../utils';
import { getClientSession, broadcastToClient, sendErrorToClient } from './connection';
import { MatchFoundMessage, QueueJoinedMessage } from '../types';

interface QueuedUser {
  clientId: string;
  userId: string;
  username: string;
  joinedAt: number;
}

const matchmakingQueue: QueuedUser[] = [];
const queuedUserIds = new Set<string>();

export function getQueueSize(): number {
  return matchmakingQueue.length;
}

export function isUserInQueue(userId: string): boolean {
  return queuedUserIds.has(userId);
}

export function addToQueue(clientId: string, userId: string, username: string): boolean {
  if (queuedUserIds.has(userId)) {
    sendErrorToClient(clientId, 'Already in queue', 'DUPLICATE_QUEUE');
    return false;
  }

  const session = getClientSession(clientId);
  if (!session) return false;

  matchmakingQueue.push({ clientId, userId, username, joinedAt: Date.now() });
  queuedUserIds.add(userId);
  session.inQueue = true;
  session.userId = userId;
  session.username = username;

  console.log(`[Matchmaking] ${username} joined queue. Size: ${matchmakingQueue.length}`);

  // Confirm to the joining client
  const confirmation: QueueJoinedMessage = {
    type: 'queue_joined',
    payload: { queueSize: matchmakingQueue.length },
    timestamp: Date.now(),
  };
  broadcastToClient(clientId, confirmation);

  tryMatchUsers();
  return true;
}

export function removeFromQueue(userId: string): boolean {
  const index = matchmakingQueue.findIndex((u) => u.userId === userId);
  if (index === -1) return false;

  const [removed] = matchmakingQueue.splice(index, 1);
  queuedUserIds.delete(userId);

  const session = getClientSession(removed.clientId);
  if (session) session.inQueue = false;

  console.log(`[Matchmaking] ${removed.username} left queue. Size: ${matchmakingQueue.length}`);
  return true;
}

export function removeFromQueueByClientId(clientId: string): boolean {
  const index = matchmakingQueue.findIndex((u) => u.clientId === clientId);
  if (index === -1) return false;

  const [removed] = matchmakingQueue.splice(index, 1);
  queuedUserIds.delete(removed.userId);

  const session = getClientSession(clientId);
  if (session) session.inQueue = false;

  console.log(`[Matchmaking] ${removed.username} removed from queue (disconnect). Size: ${matchmakingQueue.length}`);
  return true;
}

/** Called from the WS close handler — always safe to call even if not in queue. */
export function cleanupOnDisconnect(clientId: string): void {
  removeFromQueueByClientId(clientId);
}

function tryMatchUsers(): void {
  if (matchmakingQueue.length < 2) return;

  const user1 = matchmakingQueue.shift()!;
  const user2 = matchmakingQueue.shift()!;

  queuedUserIds.delete(user1.userId);
  queuedUserIds.delete(user2.userId);

  const session1 = getClientSession(user1.clientId);
  const session2 = getClientSession(user2.clientId);
  if (session1) session1.inQueue = false;
  if (session2) session2.inQueue = false;

  const battleRoomId = generateBattleRoomId();
  const now = Date.now();

  const matchFor1: MatchFoundMessage = {
    type: 'match_found',
    payload: { battleRoomId, opponent: { userId: user2.userId, username: user2.username } },
    timestamp: now,
  };
  const matchFor2: MatchFoundMessage = {
    type: 'match_found',
    payload: { battleRoomId, opponent: { userId: user1.userId, username: user1.username } },
    timestamp: now,
  };

  broadcastToClient(user1.clientId, matchFor1);
  broadcastToClient(user2.clientId, matchFor2);

  console.log(`[Matchmaking] Match! Room: ${battleRoomId} | ${user1.username} vs ${user2.username}`);

  // Recursively match remaining users
  if (matchmakingQueue.length >= 2) tryMatchUsers();
}
