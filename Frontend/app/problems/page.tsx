import { ProblemsList } from "@/components/problems/ProblemsList";
import { getProblems } from "@/lib/problems/getProblems";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ProblemsPage() {
  const problems = await getProblems();
  console.log("Problems:", problems);

  return <ProblemsList problems={problems} />;
}
