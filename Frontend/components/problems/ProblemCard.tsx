"use client";

import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import type { ProblemListItem } from "@/types/problem";

type ProblemCardProps = {
  problem: ProblemListItem;
};

function formatDifficultyLabel(difficulty: ProblemListItem["difficulty"]) {
  return difficulty.charAt(0) + difficulty.slice(1).toLowerCase();
}

export function ProblemCard({ problem }: ProblemCardProps) {
  const categoryLabel =
    problem.category.length > 0
      ? problem.category.join(", ")
      : "Uncategorized";

  return (
    <Link
      href={`/problems/${problem.slug}`}
      className="block rounded-xl border border-border bg-card px-4 py-4 shadow-sm transition-colors hover:border-primary/40 hover:bg-accent/40"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-foreground">
            {problem.title}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">{categoryLabel}</p>
        </div>

        <Badge
          variant={
            problem.difficulty === "EASY"
              ? "secondary"
              : problem.difficulty === "MEDIUM"
                ? "outline"
                : "destructive"
          }
          className="shrink-0"
        >
          {formatDifficultyLabel(problem.difficulty)}
        </Badge>
      </div>
    </Link>
  );
}
