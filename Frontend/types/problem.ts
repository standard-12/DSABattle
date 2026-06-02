export type ProblemDifficulty = "EASY" | "MEDIUM" | "HARD";

export type ProblemListItem = {
  id: string;
  title: string;
  slug: string;
  difficulty: ProblemDifficulty;
  category: string[];
};
