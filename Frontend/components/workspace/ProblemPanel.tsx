import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { ProblemDetail as ProblemDetailType } from "@/types/problem";

type ProblemPanelProps = {
  problem: ProblemDetailType;
  /** Optional slot rendered under the title (e.g. "Solved" marker). */
  titleAccessory?: ReactNode;
};

function difficultyVariant(difficulty: ProblemDetailType["difficulty"]) {
  if (difficulty === "EASY") return "secondary" as const;
  if (difficulty === "MEDIUM") return "outline" as const;
  return "destructive" as const;
}

function formatDifficulty(difficulty: ProblemDetailType["difficulty"]) {
  return difficulty.charAt(0) + difficulty.slice(1).toLowerCase();
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="text-base font-semibold text-foreground">{children}</h2>;
}

function TextBlock({ items }: { items: string[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">Not provided.</p>;
  }
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <p
          key={item}
          className="whitespace-pre-wrap font-mono text-sm leading-6 text-foreground/90"
        >
          {item}
        </p>
      ))}
    </div>
  );
}

export function ProblemPanel({ problem, titleAccessory }: ProblemPanelProps) {
  return (
    <div className="flex h-full flex-col bg-background">
      {/* Tab strip (mimics LeetCode's Description tab) */}
      <div className="flex shrink-0 items-center gap-1 border-b border-border px-4 py-2.5">
        <span className="rounded-md bg-accent/40 px-3 py-1 text-sm font-medium text-foreground">
          Description
        </span>
      </div>

      {/* Scrollable content */}
      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-5 py-5">
        <div className="space-y-5">
          {/* Title row */}
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {problem.title}
              </h1>
              {titleAccessory}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={difficultyVariant(problem.difficulty)}>
                {formatDifficulty(problem.difficulty)}
              </Badge>
              {problem.categories.map((category) => (
                <Badge key={category} variant="outline" className="text-muted-foreground">
                  {category}
                </Badge>
              ))}
            </div>
          </div>

          {/* Description */}
          <p className="whitespace-pre-wrap text-sm leading-7 text-foreground/90">
            {problem.description || "Not provided."}
          </p>

          {/* Examples */}
          {problem.examples.length > 0 && (
            <div className="space-y-4">
              {problem.examples.map((example, index) => (
                <div key={example.id} className="space-y-2">
                  <p className="text-sm font-semibold text-foreground">Example {index + 1}:</p>
                  <div className="rounded-lg border border-border/60 bg-muted/30 px-4 py-3 text-sm leading-6">
                    <p className="font-mono">
                      <span className="font-semibold text-foreground">Input: </span>
                      <span className="text-foreground/90">{example.input || "—"}</span>
                    </p>
                    <p className="mt-1 font-mono">
                      <span className="font-semibold text-foreground">Output: </span>
                      <span className="text-foreground/90">{example.output || "—"}</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <Separator />

          <div className="space-y-3">
            <SectionTitle>Constraints</SectionTitle>
            <TextBlock items={problem.constraints} />
          </div>

          <div className="space-y-3">
            <SectionTitle>Input Format</SectionTitle>
            <TextBlock items={problem.inputFormat} />
          </div>

          <div className="space-y-3">
            <SectionTitle>Output Format</SectionTitle>
            <TextBlock items={problem.outputFormat} />
          </div>
        </div>
      </div>
    </div>
  );
}
