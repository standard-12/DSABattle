import Link from "next/link";
import { Swords, Dumbbell } from "lucide-react";

export function StartBattleCard() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Battle */}
      <Link
        href="/matchmaking"
        className="group relative bg-linear-to-br from-card to-background rounded-2xl p-8 border border-border shadow-lg overflow-hidden transition-all duration-200 hover:border-primary/50 hover:shadow-xl"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -z-10 group-hover:bg-primary/10 transition-colors" />
        <div className="flex flex-col items-center justify-center text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center">
            <Swords className="w-7 h-7 text-primary" />
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground">Battle</h2>
          <p className="text-foreground/70 text-sm md:text-base max-w-xs">
            Get matched with a coder near your rating and race to solve the problem first
          </p>
          <span className="mt-2 px-6 py-2.5 bg-primary group-hover:bg-primary/90 text-background font-semibold rounded-xl transition-all group-hover:scale-105">
            Find a Match
          </span>
        </div>
      </Link>

      {/* Practice */}
      <Link
        href="/problems"
        className="group relative bg-linear-to-br from-card to-background rounded-2xl p-8 border border-border shadow-lg overflow-hidden transition-all duration-200 hover:border-accent/50 hover:shadow-xl"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full blur-3xl -z-10 group-hover:bg-accent/10 transition-colors" />
        <div className="flex flex-col items-center justify-center text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-accent/15 border border-accent/30 flex items-center justify-center">
            <Dumbbell className="w-7 h-7 text-accent-foreground" />
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground">Practice</h2>
          <p className="text-foreground/70 text-sm md:text-base max-w-xs">
            Browse the problem set and sharpen your skills at your own pace — no rating at stake
          </p>
          <span className="mt-2 px-6 py-2.5 bg-secondary group-hover:bg-secondary/80 text-secondary-foreground font-semibold rounded-xl transition-all group-hover:scale-105 border border-border">
            Browse Problems
          </span>
        </div>
      </Link>
    </div>
  );
}
