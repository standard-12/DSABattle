import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProblemDetail } from "@/components/problems/ProblemDetail";
import { getProblemBySlug } from "@/lib/problems/getProblemBySlug";
import { SolverWorkspace } from "@/components/editor/SolverWorkspace";

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

  return (
    <main className="space-y-8 pb-8">
      <ProblemDetail problem={problem} />
      <SolverWorkspace problemId={problem.id}/>
    </main>
  );
}
