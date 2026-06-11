"use client";

import Link from "next/link";
import { Swords } from "lucide-react";

import { ProblemPanel } from "@/components/workspace/ProblemPanel";
import { WorkspaceShell } from "@/components/workspace/WorkspaceShell";
import { BattleWorkspace } from "@/components/battle/BattleWorkspace";
import { BattleTimer } from "@/components/battle/BattleTimer";
import { Badge } from "@/components/ui/badge";
import { useBattleSocket } from "@/hooks/useBattleSocket";
import type { ProblemDetail as ProblemDetailType } from "@/types/problem";

type BattleRoomClientProps = {
  battleId: string;
  initialStatus: string;
  alreadyFinished: boolean;
  startedAt: string | null;
  userId: string;
  username: string;
  opponent: { userId: string; username: string } | null;
  problem: ProblemDetailType;
};

export function BattleRoomClient({
  battleId,
  initialStatus,
  alreadyFinished,
  startedAt,
  userId,
  username,
  opponent,
  problem,
}: BattleRoomClientProps) {
  const battle = useBattleSocket({ battleId, userId, username });

  const ended = battle.battleEnded || initialStatus === "ENDED" || alreadyFinished;

  const topBar = (
    <div className="shrink-0 border-b border-border bg-card">
      {/* Status row */}
      <div className="flex items-center justify-between gap-3 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Swords className="h-4 w-4 text-primary" />
          <span className="text-sm font-bold text-primary">Battle</span>
          <Badge variant="outline" className="font-mono text-[10px]">
            {battleId.slice(0, 8)}
          </Badge>
        </div>

        <div className="flex items-center gap-3">
          <BattleTimer startedAt={startedAt} stopped={ended} />

          <div className="flex items-center gap-1.5 text-sm">
            <div
              className={`h-2 w-2 rounded-full ${battle.connected ? "bg-green-500" : "bg-red-500"}`}
            />
            <span className="hidden text-muted-foreground sm:inline">
              {battle.connected ? "Live" : "Reconnecting"}
            </span>
          </div>

          <div className="flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1 text-sm">
            <span className="text-muted-foreground">vs</span>
            <span className="font-medium text-foreground">{opponent?.username ?? "Opponent"}</span>
          </div>
        </div>
      </div>

      {/* Result / live banner */}
      <ResultStrip battle={battle} ended={ended} alreadyFinished={alreadyFinished} />
    </div>
  );

  return (
    <WorkspaceShell
      topBar={topBar}
      left={<ProblemPanel problem={problem} />}
      right={
        <BattleWorkspace
          onSubmit={battle.submit}
          problemId={problem.id}
          submitting={battle.submitting}
          result={battle.result}
          disabled={ended}
        />
      }
    />
  );
}

function ResultStrip({
  battle,
  ended,
  alreadyFinished,
}: {
  battle: ReturnType<typeof useBattleSocket>;
  ended: boolean;
  alreadyFinished: boolean;
}) {
  // Final result with rating change
  if (battle.battleEnded && battle.outcome) {
    const win = battle.outcome === "WIN";
    return (
      <div
        className={`flex items-center justify-center gap-3 border-t px-4 py-2 text-sm ${
          win
            ? "border-green-600/30 bg-green-600/10 text-green-500"
            : "border-red-600/30 bg-red-600/10 text-red-500"
        }`}
      >
        <span className="font-semibold">
          {win ? "🏆 You won!" : `Defeat — ${battle.winnerUsername ?? "opponent"} solved it first`}
        </span>
        {battle.ratingChange != null && battle.newRating != null && (
          <span className="text-foreground/80">
            Rating {battle.ratingChange >= 0 ? "+" : ""}
            {battle.ratingChange} → <span className="font-semibold">{battle.newRating}</span>
          </span>
        )}
        <Link href="/dashboard" className="font-medium text-primary hover:underline">
          Dashboard
        </Link>
      </div>
    );
  }

  // Revisiting a finished battle
  if (ended) {
    return (
      <div className="flex items-center justify-center gap-3 border-t border-border bg-muted/30 px-4 py-2 text-sm text-muted-foreground">
        {alreadyFinished ? "You already finished this battle." : "This battle has ended."}
        <Link href="/dashboard" className="font-medium text-primary hover:underline">
          Dashboard
        </Link>
      </div>
    );
  }

  // Opponent submitted
  if (battle.opponentSubmitted) {
    const accepted = battle.opponentSubmitted.verdict === "ACCEPTED";
    return (
      <div className="flex items-center justify-center gap-1.5 border-t border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm">
        <span className="font-medium">{battle.opponentSubmitted.username}</span>
        <span className="text-muted-foreground">submitted —</span>
        <span className={accepted ? "text-green-500" : "text-muted-foreground"}>
          {battle.opponentSubmitted.verdict.replace(/_/g, " ")}
        </span>
        {!accepted && <span className="text-muted-foreground">· still anyone&apos;s game!</span>}
      </div>
    );
  }

  // In progress
  return (
    <div className="border-t border-border bg-background px-4 py-1.5 text-center text-xs text-muted-foreground">
      First to solve all test cases wins.
    </div>
  );
}
