import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { getProblemBySlug } from "@/lib/problems/getProblemBySlug";
import { SolverWorkspace } from "@/components/editor/SolverWorkspace";
import { ProblemPanel } from "@/components/workspace/ProblemPanel";
import { WorkspaceShell } from "@/components/workspace/WorkspaceShell";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ProblemPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata({
  params,
}: ProblemPageProps): Promise<Metadata> {
  const { slug } = await params;
  const problem = await getProblemBySlug(slug);

  if (!problem) {
    return {
      title: "Problem Not Found - DSA Battle",
    };
  }

  return {
    title: `${problem.title} - DSA Battle`,
    description: problem.description,
  };
}

export default async function ProblemPage({ params }: ProblemPageProps) {
  const { slug } = await params;
  const problem = await getProblemBySlug(slug);

  if (!problem) {
    notFound();
  }

  const topBar = (
    <div className="flex shrink-0 items-center gap-3 border-b border-border bg-card px-4 py-2.5">
      <Link
        href="/problems"
        className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        Problem List
      </Link>
      <span className="text-border">|</span>
      <span className="text-sm font-medium text-foreground">{problem.title}</span>
      <span className="ml-auto rounded-md bg-accent/30 px-2 py-0.5 text-xs text-muted-foreground">
        Practice
      </span>
    </div>
  );

  return (
    <WorkspaceShell
      topBar={topBar}
      left={<ProblemPanel problem={problem} />}
      right={<SolverWorkspace problemId={problem.id} />}
    />
  );
}
