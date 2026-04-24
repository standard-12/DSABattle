import { createClient } from "@/utils/supabase/server";

export interface UserProfile {
  id: string;
  username: string;
  rating: number;
  wins: number;
  losses: number;
  battles_played: number;
}

export async function getProfile(userId: string): Promise<UserProfile | null> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("profiles")
      .select("id, username, rating, wins, losses, battles_played")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Error fetching profile:", error.message);
      return null;
    }

    if (!data) {
      console.error("Profile not found for user:", userId);
      return null;
    }

    // Normalize data with defaults to ensure no undefined values reach UI
    return {
      id: data.id,
      username: data.username ?? "Unknown",
      rating: data.rating ?? 1200,
      wins: data.wins ?? 0,
      losses: data.losses ?? 0,
      battles_played: data.battles_played ?? 0,
    };
  } catch (err) {
    console.error("Unexpected error fetching profile:", err);
    return null;
  }
}
