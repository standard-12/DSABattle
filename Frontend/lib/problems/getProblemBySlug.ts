import { createClient } from "@/utils/supabase/server";
import type { ProblemDetail, ProblemExample } from "@/types/problem";

type ProblemRow = {
  id: string;
  title: string;
  slug: string;
  description: string;
  difficulty: ProblemDetail["difficulty"];
  categories: string[] | null;
  constraints: string[] | null;
  input_format: string[] | null;
  output_format: string[] | null;
};

type ProblemTestCaseRow = {
  id: string;
  display_input: string | null;
  display_output: string | null;
  order_index: number;
};

function normalizeDisplayValue(value: string | null) {
  return value?.trim() ? value : "";
}

export async function getProblemBySlug(
  slug: string
): Promise<ProblemDetail | null> {
  try {
    const supabase = await createClient();

    const { data: problem, error: problemError } = await supabase
      .from("problems")
      .select(
        "id, title, slug, description, difficulty, categories, constraints, input_format, output_format"
      )
      .eq("slug", slug)
      .maybeSingle();

    if (problemError) {
      console.error("Error fetching problem:", problemError.message);
      return null;
    }

    if (!problem) {
      return null;
    }

    const typedProblem = problem as ProblemRow;

    const { data: testCases, error: testCaseError } = await supabase
      .from("problem_test_cases")
      .select("id, display_input, display_output, order_index")
      .eq("problem_id", typedProblem.id)
      .eq("visibility", "PUBLIC")
      .order("order_index", { ascending: true });

    if (testCaseError) {
      console.error("Error fetching public examples:", testCaseError.message);
      return null;
    }

    const examples: ProblemExample[] = (testCases as ProblemTestCaseRow[] | null | undefined)?.map(
      (row) => ({
        id: row.id,
        input: normalizeDisplayValue(row.display_input),
        output: normalizeDisplayValue(row.display_output),
      })
    ) ?? [];

    return {
      id: typedProblem.id,
      title: typedProblem.title,
      slug: typedProblem.slug,
      difficulty: typedProblem.difficulty,
      description: typedProblem.description ?? "",
      categories: typedProblem.categories ?? [],
      constraints: typedProblem.constraints ?? [],
      inputFormat: typedProblem.input_format ?? [],
      outputFormat: typedProblem.output_format ?? [],
      examples,
    };
  } catch (error) {
    console.error("Unexpected error fetching problem by slug:", error);
    return null;
  }
}
