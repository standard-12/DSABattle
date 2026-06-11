import { getClientSession, broadcastToClient, sendErrorToClient } from './connection';
import { QueueJoinedMessage } from '../types';
import { createBattleAndNotify } from './battle';

interface QueuedUser {
  clientId: string;
  userId: string;
  username: string;
  rating: number;
  ratingLower: number;
  ratingUpper: number;
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

export function addToQueue(
  clientId: string,
  userId: string,
  username: string,
  rating: number,
  ratingLower: number,
  ratingUpper: number,
): boolean {
  if (queuedUserIds.has(userId)) {
    sendErrorToClient(clientId, 'Already in queue', 'DUPLICATE_QUEUE');
    return false;
  }

  const session = getClientSession(clientId);
  if (!session) return false;

  matchmakingQueue.push({ clientId, userId, username, rating, ratingLower, ratingUpper, joinedAt: Date.now() });
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

function isCompatible(a: QueuedUser, b: QueuedUser): boolean {
  // b must fall within a's configured range, and a must fall within b's configured range
  const bInA = b.rating >= a.rating + a.ratingLower && b.rating <= a.rating + a.ratingUpper;
  const aInB = a.rating >= b.rating + b.ratingLower && a.rating <= b.rating + b.ratingUpper;
  return bInA && aInB;
}

function pairUsers(user1: QueuedUser, user2: QueuedUser): void {
  queuedUserIds.delete(user1.userId);
  queuedUserIds.delete(user2.userId);

  const session1 = getClientSession(user1.clientId);
  const session2 = getClientSession(user2.clientId);
  if (session1) session1.inQueue = false;
  if (session2) session2.inQueue = false;

  console.log(
    `[Matchmaking] Pairing ${user1.username} (${user1.rating}) vs ${user2.username} (${user2.rating})`
  );

  // Create the battle in the DB + room state, then notify both clients.
  // Fire-and-forget: matchmaking stays synchronous, battle creation is async.
  void createBattleAndNotify(
    { clientId: user1.clientId, userId: user1.userId, username: user1.username },
    { clientId: user2.clientId, userId: user2.userId, username: user2.username },
  );
}

function tryMatchUsers(): void {
  if (matchmakingQueue.length < 2) return;

  // For each player (in join order), find the first compatible opponent after them
  let matched = false;
  for (let i = 0; i < matchmakingQueue.length - 1; i++) {
    const a = matchmakingQueue[i];
    for (let j = i + 1; j < matchmakingQueue.length; j++) {
      const b = matchmakingQueue[j];
      if (isCompatible(a, b)) {
        // Remove higher index first to keep indices valid
        matchmakingQueue.splice(j, 1);
        matchmakingQueue.splice(i, 1);
        pairUsers(a, b);
        matched = true;
        break;
      }
    }
    if (matched) break;
  }

  // If we found a match, try again — there may be more compatible pairs
  if (matched && matchmakingQueue.length >= 2) tryMatchUsers();
}
