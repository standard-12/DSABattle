export function StartBattleCard() {
  return (
    <div className="relative bg-linear-to-r from-card to-background rounded-2xl p-8 border border-border shadow-lg overflow-hidden">
      {/* Subtle accent decoration */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-accent/5 rounded-full blur-3xl -z-10" />

      {/* Content */}
      <div className="flex flex-col items-center justify-center text-center space-y-4">
        {/* Title */}
        <h2 className="text-3xl md:text-4xl font-bold text-foreground">Find a Match</h2>

        {/* Description */}
        <p className="text-foreground/70 text-base md:text-lg max-w-md">
          Battle another coder in real time and climb the leaderboard
        </p>

        {/* CTA Button */}
        <button
          disabled
          className="mt-4 px-8 py-3 bg-primary hover:bg-primary/90 text-background font-semibold rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Start Battle (Coming Soon)
        </button>

        {/* Subtext */}
        <p className="text-xs text-foreground/50 mt-2">Real-time competitive coding challenges</p>
      </div>
    </div>
  );
}
