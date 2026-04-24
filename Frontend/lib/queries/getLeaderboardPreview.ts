import { createClient } from "@/utils/supabase/server";

export type LeaderboardUser = {
  username: string;
  rating: number;
};

export async function getLeaderboardPreview(): Promise<LeaderboardUser[]> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("profiles")
      .select("username, rating")
      .order("rating", { ascending: false })
      .limit(5);

    if (error) {
      console.error("Error fetching leaderboard preview:", error.message);
      return [];
    }

    if (!data) {
      return [];
    }

    return data.map((row) => ({
      username: row.username ?? "Unknown",
      rating: row.rating ?? 1200,
    }));
  } catch (err) {
    console.error("Unexpected leaderboard preview error:", err);
    return [];
  }
}
