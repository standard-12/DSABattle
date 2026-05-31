import fs from "fs/promises";
import path from "path";

type ProblemPattern =
  | "ARRAY"
  | "ARRAY_TARGET_INDEX"
  | "ARRAY_TARGET_PAIR"
  | "STRING"
  | "INTEGER";

interface ProblemFile {
  slug: string;
  title: string;
}

interface DiscoveryReport {
  supported: Array<{
    slug: string;
    title: string;
    pattern: ProblemPattern;
  }>;
}

interface ExistingProblemEntry {
  slug: string;
  title: string;
  pattern: ProblemPattern | "UNKNOWN";
}

interface ExistingProblemsFile {
  generatedAt: string;
  source: string;
  currentProblems: ExistingProblemEntry[];
}

const PROBLEMS_DIR = path.resolve(process.env.PROBLEMS_ROOT ?? "data/problems");
const REPORT_PATH = path.resolve("data/pattern-discovery-report.json");
const OUTPUT_PATH = path.resolve(process.env.EXISTING_PROBLEMS_PATH ?? "data/existing-problems.json");

async function readDiscoveryPatterns(): Promise<Map<string, ProblemPattern>> {
  try {
    const reportText = await fs.readFile(REPORT_PATH, "utf8");
    const report = JSON.parse(reportText.replace(/^\uFEFF/, "")) as DiscoveryReport;
    return new Map(report.supported.map((entry) => [entry.slug, entry.pattern]));
  } catch {
    return new Map();
  }
}

async function main(): Promise<void> {
  const discoveryPatterns = await readDiscoveryPatterns();
  const folders = await fs.readdir(PROBLEMS_DIR, { withFileTypes: true });

  const currentProblems: ExistingProblemEntry[] = [];

  for (const folder of folders) {
    if (!folder.isDirectory()) continue;

    const problemPath = path.join(PROBLEMS_DIR, folder.name, "problem.json");
    try {
      const problemText = await fs.readFile(problemPath, "utf8");
      const problem = JSON.parse(problemText.replace(/^\uFEFF/, "")) as ProblemFile;
      currentProblems.push({
        slug: problem.slug,
        title: problem.title,
        pattern: discoveryPatterns.get(problem.slug) ?? "UNKNOWN",
      });
    } catch {
      continue;
    }
  }

  currentProblems.sort((left, right) => left.slug.localeCompare(right.slug));

  const output: ExistingProblemsFile = {
    generatedAt: new Date().toISOString().slice(0, 10),
    source: path.relative(process.cwd(), PROBLEMS_DIR).replace(/\\/g, "/"),
    currentProblems,
  };

  await fs.writeFile(OUTPUT_PATH, JSON.stringify(output, null, 2), "utf8");

  console.log(`Wrote ${currentProblems.length} problems to ${OUTPUT_PATH}`);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
