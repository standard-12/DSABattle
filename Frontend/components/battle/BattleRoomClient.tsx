"use client";

import Link from "next/link";

import { ProblemDetail } from "@/components/problems/ProblemDetail";
import { BattleWorkspace } from "@/components/battle/BattleWorkspace";
import { Badge } from "@/components/ui/badge";
import { useBattleSocket } from "@/hooks/useBattleSocket";
import type { ProblemDetail as ProblemDetailType } from "@/types/problem";

type BattleRoomClientProps = {
  battleId: string;
  initialStatus: string;
  alreadyFinished: boolean;
  userId: string;
  username: string;
  opponent: { userId: string; username: string } | null;
  problem: ProblemDetailType;
};

export function BattleRoomClient({
  battleId,
  initialStatus,
  alreadyFinished,
  userId,
  username,
  opponent,
  problem,
}: BattleRoomClientProps) {
  const battle = useBattleSocket({ battleId, userId, username });

  const ended = battle.battleEnded || initialStatus === "ENDED" || alreadyFinished;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Battle header bar */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold text-primary">Battle</span>
            <Badge variant="outline" className="font-mono text-xs">
              {battleId.slice(0, 8)}
            </Badge>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm">
              <div
                className={`h-2.5 w-2.5 rounded-full ${
                  battle.connected ? "bg-green-500" : "bg-red-500"
                }`}
              />
              <span className="text-muted-foreground">
                {battle.connected ? "Connected" : "Reconnecting..."}
              </span>
            </div>
            <div className="text-sm text-muted-foreground">
              vs <span className="font-medium text-foreground">{opponent?.username ?? "Opponent"}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Live status banner */}
      <StatusBanner battle={battle} ended={ended} alreadyFinished={alreadyFinished} />

      <main className="mx-auto max-w-6xl space-y-8 px-4 pb-12 sm:px-6 lg:px-8">
        <ProblemDetail problem={problem} />
        <BattleWorkspace
          onSubmit={battle.submit}
          problemId={problem.id}
          submitting={battle.submitting}
          result={battle.result}
          disabled={ended}
        />
      </main>
    </div>
  );
}

function StatusBanner({
  battle,
  ended,
  alreadyFinished,
}: {
  battle: ReturnType<typeof useBattleSocket>;
  ended: boolean;
  alreadyFinished: boolean;
}) {
  // Final result takes priority
  if (battle.battleEnded && battle.outcome) {
    const win = battle.outcome === "WIN";
    return (
      <div
        className={`border-b ${
          win
            ? "border-green-600/40 bg-green-600/10"
            : "border-red-600/40 bg-red-600/10"
        }`}
      >
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-6 py-5 text-center">
          <h2 className={`text-2xl font-bold ${win ? "text-green-500" : "text-red-500"}`}>
            {win ? "🏆 You Won!" : "Defeat"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {win
              ? "You solved it first."
              : `${battle.winnerUsername ?? "Your opponent"} solved it first.`}
          </p>
          {battle.ratingChange != null && battle.newRating != null && (
            <p className="text-sm">
              Rating:{" "}
              <span className={battle.ratingChange >= 0 ? "text-green-500" : "text-red-500"}>
                {battle.ratingChange >= 0 ? "+" : ""}
                {battle.ratingChange}
              </span>{" "}
              → <span className="font-semibold">{battle.newRating}</span>
            </p>
          )}
          <Link
            href="/dashboard"
            className="mt-2 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-background transition-colors hover:bg-primary/90"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Revisiting an already-finished battle (no live result in this session)
  if (ended) {
    return (
      <div className="border-b border-border bg-muted/30">
        <div className="mx-auto flex max-w-6xl items-center justify-center gap-3 px-6 py-3 text-center text-sm text-muted-foreground">
          {alreadyFinished
            ? "You already finished this battle."
            : "This battle has ended."}
          <Link href="/dashboard" className="font-medium text-primary hover:underline">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Opponent just submitted
  if (battle.opponentSubmitted) {
    const accepted = battle.opponentSubmitted.verdict === "ACCEPTED";
    return (
      <div className="border-b border-amber-500/30 bg-amber-500/10">
        <div className="mx-auto max-w-6xl px-6 py-3 text-center text-sm">
          <span className="font-medium">{battle.opponentSubmitted.username}</span> submitted —{" "}
          <span className={accepted ? "text-green-500" : "text-muted-foreground"}>
            {battle.opponentSubmitted.verdict}
          </span>
          {!accepted && " · still anyone's game!"}
        </div>
      </div>
    );
  }

  // Default: in progress
  return (
    <div className="border-b border-border bg-card/50">
      <div className="mx-auto max-w-6xl px-6 py-2.5 text-center text-sm text-muted-foreground">
        Battle in progress — first to solve all test cases wins.
      </div>
    </div>
  );
}
