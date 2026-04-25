import { createClient } from "@/utils/supabase/server";

export type MatchedUser = {
  id: string;
  user_id: string;
  difficulty: "easy" | "medium" | "hard";
  joined_at: string;
};

/**
 * Find a suitable opponent for a given user.
 *
 * Matching rules:
 * - Same difficulty level
 * - NOT the requesting user themselves
 * - First user in queue (FIFO fairness)
 *
 * @param userId - The user looking for a match
 * @param difficulty - The difficulty level they're queued for
 * @returns Matched opponent or null if no match found
 */
export async function findMatch(
  userId: string,
  difficulty: "easy" | "medium" | "hard"
): Promise<MatchedUser | null> {
  try {
    const supabase = await createClient();

    // Query for the earliest-joined user with matching difficulty,
    // excluding the requesting user
    const { data, error } = await supabase
      .from("matchmaking_queue")
      .select("*")
      .eq("difficulty", difficulty)
      .neq("user_id", userId)
      .order("joined_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Error finding match:", error.message);
      return null;
    }

    if (!data) {
      return null;
    }

    return {
      id: data.id,
      user_id: data.user_id,
      difficulty: data.difficulty,
      joined_at: data.joined_at,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Unexpected error finding match:", message);
    return null;
  }
}
