export type Language = "python" | "java" | "cpp";

export type LanguageConfig = {
  label: string;
  monaco: "python" | "java" | "cpp";
  judge0Id: number;
};

export const LANGUAGES: Record<Language, LanguageConfig> = {
  python: {
    label: "Python",
    monaco: "python",
    judge0Id: 71,
  },
  java: {
    label: "Java",
    monaco: "java",
    judge0Id: 62,
  },
  cpp: {
    label: "C++",
    monaco: "cpp",
    judge0Id: 54,
  },
};
