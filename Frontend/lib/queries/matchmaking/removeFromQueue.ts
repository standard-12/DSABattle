import { createClient } from "@/utils/supabase/server";

export type RemoveFromQueueResult = {
  success: boolean;
  error?: string;
};

/**
 * Remove a user from the matchmaking queue.
 *
 * Safe to call even if the user is not in the queue
 * (idempotent: multiple calls have the same effect as one call).
 *
 * Use this when:
 * - A match is found and the user needs to be removed
 * - User cancels matchmaking
 * - Queue timeout occurs
 *
 * @param userId - User to remove from queue
 * @returns success flag and optional error message
 */
export async function removeFromQueue(
  userId: string
): Promise<RemoveFromQueueResult> {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from("matchmaking_queue")
      .delete()
      .eq("user_id", userId);

    if (error) {
      console.error("Error removing from queue:", error.message);
      return {
        success: false,
        error: error.message,
      };
    }

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Unexpected error removing from queue:", message);
    return {
      success: false,
      error: message,
    };
  }
}
