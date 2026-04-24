import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getProfile } from "@/lib/queries/getProfile";
import { Navbar } from "@/components/navbar";
import { StartBattleCard } from "@/components/start-battle-card";
import { StatsCard } from "../../components/stats-card";
import { LeaderboardPreview } from "../../components/leaderboard-preview";
import { RecentBattles } from "../../components/recent-battles";

export default async function DashboardPage() {
  // Get authenticated user
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Redirect to login if not authenticated
  if (!user) {
    redirect("/login");
  }

  // Fetch user profile
  const profile = await getProfile(user.id);

  // Fallback UI if profile not found
  if (!profile) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">Profile Not Found</h1>
          <p className="text-muted-foreground">Unable to load your profile data. Please contact support.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navbar */}
      <Navbar profile={profile} />

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {/* Start Battle - Main CTA */}
        <StartBattleCard />

        {/* Stats + Leaderboard Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <StatsCard profile={profile} />
          <LeaderboardPreview />
        </div>

        {/* Recent Battles Section */}
        <RecentBattles />
      </main>
    </div>
  );
}
