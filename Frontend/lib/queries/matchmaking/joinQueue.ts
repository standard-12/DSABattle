import { createClient } from "@/utils/supabase/server";

export type JoinQueueInput = {
  userId: string;
  difficulty: "easy" | "medium" | "hard";
};

export type JoinQueueResult = {
  success: boolean;
  error?: string;
};

/**
 * Add or update a user in the matchmaking queue.
 *
 * This is idempotent: if the user is already in the queue,
 * their entry is updated with the latest difficulty and timestamp.
 * This prevents duplicate queue entries even if the user clicks multiple times.
 *
 * @param userId - Unique user identifier
 * @param difficulty - Problem difficulty level
 * @returns success flag and optional error message
 */
export async function joinQueue({
  userId,
  difficulty,
}: JoinQueueInput): Promise<JoinQueueResult> {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from("matchmaking_queue")
      .upsert(
        {
          user_id: userId,
          difficulty,
          joined_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id",
        }
      );

    if (error) {
      console.error("Error joining queue:", error.message);
      return {
        success: false,
        error: error.message,
      };
    }

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Unexpected error joining queue:", message);
    return {
      success: false,
      error: message,
    };
  }
}
