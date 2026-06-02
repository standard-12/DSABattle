import { createClient } from "@/utils/supabase/server";
import type { ProblemListItem } from "@/types/problem";

type ProblemRow = {
  id: string;
  title: string;
  slug: string;
  difficulty: ProblemListItem["difficulty"];
  categories: string[] | null;
};

export async function getProblems(): Promise<ProblemListItem[]> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("problems")
      .select("id, title, slug, difficulty, categories")
      .order("title", { ascending: true });

    if (error) {
      console.error("Error fetching problems:", error.message);
      return [];
    }

    if (!data) {
      return [];
    }

    return (data as ProblemRow[]).map((row) => ({
      id: row.id,
      title: row.title,
      slug: row.slug,
      difficulty: row.difficulty,
      category: row.categories ?? [],
    }));
  } catch (err) {
    console.error("Unexpected error fetching problems:", err);
    return [];
  }
}
