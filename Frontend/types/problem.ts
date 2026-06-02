export type ProblemDifficulty = "EASY" | "MEDIUM" | "HARD";

export type ProblemListItem = {
  id: string;
  title: string;
  slug: string;
  difficulty: ProblemDifficulty;
  category: string[];
};

export type ProblemExample = {
  id: string;
  input: string;
  output: string;
};

export type ProblemDetail = {
  id: string;
  title: string;
  slug: string;
  difficulty: ProblemDifficulty;
  description: string;
  categories: string[];
  constraints: string[];
  inputFormat: string[];
  outputFormat: string[];
  examples: ProblemExample[];
};
