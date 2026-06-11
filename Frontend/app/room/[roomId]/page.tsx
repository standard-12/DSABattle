import { notFound, redirect } from "next/navigation";

import { createClient } from "@/utils/supabase/server";
import { getBattleRoom } from "@/lib/battles/getBattleRoom";
import { getProblemBySlug } from "@/lib/problems/getProblemBySlug";
import { BattleRoomClient } from "@/components/battle/BattleRoomClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type RoomPageProps = {
  params: Promise<{ roomId: string }>;
};

export default async function RoomPage({ params }: RoomPageProps) {
  const { roomId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const room = await getBattleRoom(roomId, user.id);
  if (!room) {
    notFound();
  }

  const problem = await getProblemBySlug(room.problemSlug);
  if (!problem) {
    notFound();
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .single();

  return (
    <BattleRoomClient
      battleId={room.battleId}
      initialStatus={room.status}
      alreadyFinished={room.finished}
      startedAt={room.startedAt}
      userId={user.id}
      username={profile?.username ?? "You"}
      opponent={room.opponent}
      problem={problem}
    />
  );
}
