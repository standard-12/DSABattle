/**
 * Matchmaking query layer
 *
 * This module provides a clean, reusable interface for matchmaking operations.
 * It encapsulates all database interactions for queue management and opponent matching.
 *
 * Usage:
 * ```ts
 * import { joinQueue, findMatch, removeFromQueue } from '@/lib/queries/matchmaking';
 *
 * // Join the queue
 * await joinQueue({ userId: "user123", difficulty: "medium" });
 *
 * // Find an opponent
 * const opponent = await findMatch("user123", "medium");
 *
 * // Remove from queue
 * await removeFromQueue("user123");
 * ```
 */

export * from "./joinQueue";
export * from "./findMatch";
export * from "./removeFromQueue";
