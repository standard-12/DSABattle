import Link from "next/link";
import { getLeaderboardPreview } from "@/lib/queries/getLeaderboardPreview";

function getRankClass(rank: number) {
  if (rank === 0) {
    return "text-primary";
  }

  if (rank === 1) {
    return "text-accent";
  }

  if (rank === 2) {
    return "text-chart-5";
  }

  return "text-muted-foreground";
}

export async function LeaderboardPreview() {
  const users = await getLeaderboardPreview();

  return (
    <section className="bg-card border border-border rounded-2xl p-6 shadow-lg">
      <h2 className="text-lg font-semibold text-foreground">Leaderboard</h2>

      {users.length === 0 ? (
        <div className="mt-6 rounded-xl border border-border/80 bg-background/40 p-4 text-center">
          <p className="font-medium text-foreground">No leaderboard data yet.</p>
          <p className="mt-1 text-sm text-muted-foreground">Check back after more players complete battles.</p>
        </div>
      ) : (
        <div className="mt-4">
          {users.map((entry, index) => (
            <div
              key={`${entry.username}-${index}`}
              className="flex items-center justify-between py-2 border-b border-border last:border-b-0"
            >
              <div className="flex items-center gap-3">
                <span className={`w-6 text-sm font-semibold ${getRankClass(index)}`}>#{index + 1}</span>
                <span className="text-sm text-foreground">{entry.username}</span>
              </div>
              <span className="text-sm font-semibold text-foreground">{entry.rating}</span>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4">
        <Link href="/leaderboard" className="text-sm text-primary hover:underline">
          View Full Leaderboard {"->"}
        </Link>
      </div>
    </section>
  );
}
