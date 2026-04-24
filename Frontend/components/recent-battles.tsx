export function RecentBattles() {
  return (
    <section className="bg-card border border-border rounded-2xl p-6 shadow-lg">
      <h2 className="text-lg font-semibold text-foreground">Recent Battles</h2>

      <div className="flex flex-col items-center justify-center py-10 text-center">
        <p className="text-base font-semibold text-foreground">No battles yet.</p>
        <p className="mt-2 text-sm text-muted-foreground">Start your first match to build your battle history.</p>
      </div>
    </section>
  );
}
