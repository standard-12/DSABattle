"use client";

import { useEffect, useRef, useState } from "react";
import { Timer } from "lucide-react";

type BattleTimerProps = {
  /** ISO timestamp of when the battle started (battles.started_at). */
  startedAt: string | null;
  /** Freeze the clock (battle ended). */
  stopped: boolean;
};

function format(ms: number): string {
  if (ms < 0) ms = 0;
  const totalSeconds = Math.floor(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function BattleTimer({ startedAt, stopped }: BattleTimerProps) {
  const startMs = startedAt ? new Date(startedAt).getTime() : Date.now();
  const [elapsed, setElapsed] = useState(() => Date.now() - startMs);
  const frozenRef = useRef<number | null>(null);

  useEffect(() => {
    if (stopped) {
      // Capture the final value once and stop updating.
      if (frozenRef.current === null) frozenRef.current = Date.now() - startMs;
      setElapsed(frozenRef.current);
      return;
    }

    const id = setInterval(() => setElapsed(Date.now() - startMs), 1000);
    return () => clearInterval(id);
  }, [stopped, startMs]);

  return (
    <div className="flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1 font-mono text-sm tabular-nums">
      <Timer className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="text-foreground">{format(elapsed)}</span>
    </div>
  );
}
