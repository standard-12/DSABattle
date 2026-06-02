import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { ProblemDetail as ProblemDetailType } from "@/types/problem";
import type { ReactNode } from "react";

type ProblemDetailProps = {
  problem: ProblemDetailType;
};

function formatDifficultyLabel(
  difficulty: ProblemDetailType["difficulty"]
) {
  return difficulty.charAt(0) + difficulty.slice(1).toLowerCase();
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="text-lg font-semibold text-foreground">{children}</h2>;
}

function TextBlock({ items }: { items: string[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">Not provided.</p>;
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <p key={item} className="whitespace-pre-wrap text-sm leading-6 text-foreground">
          {item}
        </p>
      ))}
    </div>
  );
}

export function ProblemDetail({ problem }: ProblemDetailProps) {
  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <Card className="gap-0 overflow-hidden border-border/60 bg-card">
        <CardHeader className="border-b border-border/60 pb-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                {problem.title}
              </h1>
              <div className="mt-3 flex flex-wrap gap-2">
                {problem.categories.length > 0 ? (
                  problem.categories.map((category) => (
                    <Badge key={category} variant="outline">
                      {category}
                    </Badge>
                  ))
                ) : (
                  <Badge variant="outline">Uncategorized</Badge>
                )}
              </div>
            </div>

            <Badge
              variant={
                problem.difficulty === "EASY"
                  ? "secondary"
                  : problem.difficulty === "MEDIUM"
                    ? "outline"
                    : "destructive"
              }
              className="shrink-0 self-start"
            >
              {formatDifficultyLabel(problem.difficulty)}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-8 px-6 py-6">
          <div className="space-y-3">
            <SectionTitle>Description</SectionTitle>
            <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">
              {problem.description || "Not provided."}
            </p>
          </div>

          <Separator />

          <div className="space-y-3">
            <SectionTitle>Examples</SectionTitle>
            {problem.examples.length > 0 ? (
              <div className="space-y-4">
                {problem.examples.map((example, index) => (
                  <div
                    key={example.id}
                    className="rounded-xl border border-border/70 bg-background/40 p-4"
                  >
                    <p className="text-sm font-semibold text-foreground">
                      Example {index + 1}
                    </p>
                    <div className="mt-3 space-y-4">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Input
                        </p>
                        <pre className="mt-2 whitespace-pre-wrap rounded-lg border border-border/60 bg-background px-3 py-3 text-sm leading-6 text-foreground">
                          {example.input || "Not provided."}
                        </pre>
                      </div>
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Output
                        </p>
                        <pre className="mt-2 whitespace-pre-wrap rounded-lg border border-border/60 bg-background px-3 py-3 text-sm leading-6 text-foreground">
                          {example.output || "Not provided."}
                        </pre>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No public examples available.
              </p>
            )}
          </div>

          <Separator />

          <div className="space-y-3">
            <SectionTitle>Constraints</SectionTitle>
            <TextBlock items={problem.constraints} />
          </div>

          <Separator />

          <div className="space-y-3">
            <SectionTitle>Input Format</SectionTitle>
            <TextBlock items={problem.inputFormat} />
          </div>

          <Separator />

          <div className="space-y-3">
            <SectionTitle>Output Format</SectionTitle>
            <TextBlock items={problem.outputFormat} />
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
