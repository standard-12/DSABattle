import { supabaseAdmin } from "@/utils/supabase/admin";

export type BattleRoomInfo = {
  battleId: string;
  status: string;
  problemId: string;
  problemSlug: string;
  opponent: { userId: string; username: string } | null;
  finished: boolean; // has the current user already solved it
};

/**
 * Loads battle room metadata for the room page. Returns null if the battle
 * doesn't exist or the current user is not a participant.
 */
export async function getBattleRoom(
  roomId: string,
  userId: string,
): Promise<BattleRoomInfo | null> {
  try {
    // Battle tables have RLS with no public SELECT policy, so the WS server
    // writes them with the service-role key. We read them the same way here
    // (server-side only) and authorize by verifying participation below.
    const supabase = supabaseAdmin;

    const { data: battle, error: battleErr } = await supabase
      .from("battles")
      .select("id, status, problem_id")
      .eq("id", roomId)
      .maybeSingle();

    if (battleErr || !battle) return null;
    const b = battle as { id: string; status: string; problem_id: string };

    const { data: parts, error: partErr } = await supabase
      .from("battle_participants")
      .select("user_id, finish_position")
      .eq("battle_id", roomId);

    if (partErr || !parts || parts.length === 0) return null;
    const participants = parts as { user_id: string; finish_position: number | null }[];

    const self = participants.find((p) => p.user_id === userId);
    if (!self) return null; // not a participant — no access

    const opponentPart = participants.find((p) => p.user_id !== userId);

    const { data: problem } = await supabase
      .from("problems")
      .select("slug")
      .eq("id", b.problem_id)
      .maybeSingle();

    let opponent: BattleRoomInfo["opponent"] = null;
    if (opponentPart) {
      const { data: oppProfile } = await supabase
        .from("profiles")
        .select("id, username")
        .eq("id", opponentPart.user_id)
        .maybeSingle();

      if (oppProfile) {
        const op = oppProfile as { id: string; username: string };
        opponent = { userId: op.id, username: op.username };
      }
    }

    return {
      battleId: b.id,
      status: b.status,
      problemId: b.problem_id,
      problemSlug: (problem as { slug: string } | null)?.slug ?? "",
      opponent,
      finished: self.finish_position != null,
    };
  } catch (error) {
    console.error("Unexpected error loading battle room:", error);
    return null;
  }
}
