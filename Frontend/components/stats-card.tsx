type StatsCardProps = {
  profile: {
    rating: number;
    wins: number;
    losses: number;
    battles_played: number;
  };
};

export function StatsCard({ profile }: StatsCardProps) {
  const winRate =
    profile.battles_played > 0
      ? Math.round((profile.wins / profile.battles_played) * 100)
      : 0;

  const stats = [
    { label: "Battles Played", value: profile.battles_played },
    { label: "Wins", value: profile.wins },
    { label: "Losses", value: profile.losses },
    { label: "Win Rate", value: `${winRate}%` },
  ];

  return (
    <section className="bg-card border border-border rounded-2xl p-6 shadow-lg">
      <h2 className="text-lg font-semibold text-foreground">Your Stats</h2>

      <div className="mt-4 rounded-xl border border-primary/20 bg-primary/10 p-4">
        <p className="text-sm text-muted-foreground">Rating</p>
        <p className="mt-1 text-3xl font-bold text-primary">{profile.rating}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 mt-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-xl border border-border/80 bg-background/40 p-3">
            <p className="text-xs text-muted-foreground">{stat.label}</p>
            <p className="mt-1 text-lg font-semibold text-foreground">{stat.value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
