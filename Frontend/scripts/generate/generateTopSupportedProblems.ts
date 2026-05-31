import fs from "fs/promises";
import path from "path";
import readline from "readline";
import { createReadStream } from "fs";

import { convertInput, normalizeOutput, getInputFormat, getOutputFormat } from "../lib/converters";
import { getReferenceSolver } from "../lib/validation-utils";

type ProblemPattern =
  | "ARRAY"
  | "ARRAY_TARGET_INDEX"
  | "ARRAY_TARGET_PAIR"
  | "STRING"
  | "INTEGER";

interface DatasetRow {
  task_id: string;
  difficulty: string;
  tags: string[];
  problem_description: string;
  input_output: Array<{ input: string; output: string }>;
}

interface SupportedProblemEntry {
  slug: string;
  title: string;
  pattern: ProblemPattern;
}

interface DiscoveryReport {
  supported: SupportedProblemEntry[];
}

interface Example {
  input: string;
  output: string;
  explanation: string;
}

interface ProblemJson {
  title: string;
  slug: string;
  difficulty: string;
  categories: string[];
  description: string;
  input_format: string[];
  output_format: string[];
  constraints: string[];
  examples: Example[];
}

interface TestCase {
  input: string;
  expected_output: string;
  display_input: string;
  display_output: string;
  visibility: "PUBLIC" | "PRIVATE";
  order: number;
}

interface TestCasesJson {
  test_cases: TestCase[];
}

const DATASET_PATH = path.resolve("datasets/LeetCodeDataset-v0.3.1-train.jsonl");
const REPORT_PATH = path.resolve("data/pattern-discovery-report.json");
const OUTPUT_DIR = path.resolve(process.env.PROBLEMS_ROOT ?? "data/problems");
function readIntEnv(name: string, fallback: number): number {
  const rawValue = process.env[name];
  if (rawValue === undefined) return fallback;

  const parsed = Number.parseInt(rawValue, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const START = readIntEnv("START", 0);
const LIMIT = readIntEnv("LIMIT", 100);

function slugToTitle(slug: string): string {
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function mapDifficulty(raw: string): string {
  const map: Record<string, string> = {
    Easy: "EASY",
    Medium: "MEDIUM",
    Hard: "HARD",
  };
  return map[raw] ?? raw.toUpperCase();
}

function parseDescriptionExamples(raw: string): Example[] {
  const exampleBlockRe =
    /Example\s*(?:\d+\s*)?:([\s\S]*?)(?=Example\s*(?:\d+\s*)?:|Constraints\s*:|Follow-up|Follow up|$)/gi;

  const examples: Example[] = [];
  let match: RegExpExecArray | null;

  while ((match = exampleBlockRe.exec(raw)) !== null) {
    const block = match[1];
    const inputMatch = /Input\s*:([\s\S]*?)(?=Output\s*:|$)/i.exec(block);
    const outputMatch = /Output\s*:([\s\S]*?)(?=Explanation\s*:|$)/i.exec(block);
    const explanationMatch = /Explanation\s*:([\s\S]*?)$/i.exec(block);

    const input = inputMatch?.[1].trim() ?? "";
    const output = outputMatch?.[1].trim() ?? "";
    const explanation = explanationMatch?.[1].trim() ?? "";

    if (input || output) {
      examples.push({ input, output, explanation });
    }
  }

  return examples;
}

function parseConstraints(raw: string): string[] {
  const constraintsRe = /Constraints\s*:([\s\S]*?)(?=Follow-up|Follow up|$)/i;
  const constraintsMatch = constraintsRe.exec(raw);
  const constraints: string[] = [];

  if (constraintsMatch) {
    constraintsMatch[1]
      .split("\n")
      .map((line) => line.trim().replace(/\b10([1-9])(?!\d)/g, "10^$1"))
      .filter(Boolean)
      .forEach((constraint) => constraints.push(constraint));
  }

  return constraints;
}

function isMalformedCase(value: string): boolean {
  return /\.\.\.|error/i.test(value);
}

function isDiscardedOutput(value: string): boolean {
  return isMalformedCase(value) || value.trim().toLowerCase() === "none";
}

async function readDiscoveryReport(): Promise<SupportedProblemEntry[]> {
  const reportText = await fs.readFile(REPORT_PATH, "utf8");
  const report = JSON.parse(reportText.replace(/^\uFEFF/, "")) as DiscoveryReport;
  const safeStart = Math.max(0, START);
  const safeLimit = Math.max(0, LIMIT);
  return report.supported.slice(safeStart, safeStart + safeLimit);
}

async function readDatasetRows(): Promise<Map<string, DatasetRow>> {
  const rows = new Map<string, DatasetRow>();
  const fileStream = createReadStream(DATASET_PATH);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    try {
      const row = JSON.parse(trimmed.replace(/^\uFEFF/, "")) as DatasetRow;
      rows.set(row.task_id, row);
    } catch {
      continue;
    }
  }

  return rows;
}

async function writeProblemFiles(entry: SupportedProblemEntry, row: DatasetRow): Promise<void> {
  const problemDir = path.join(OUTPUT_DIR, entry.slug);
  await fs.mkdir(problemDir, { recursive: true });

  const problemDescription = row.problem_description ?? "";
  const firstExampleIndex = (() => {
    const exampleHeaderRe = /Example\s+\d+\s*:/i;
    const exampleSimpleRe = /Example\s*:/i;
    const headerMatch = exampleHeaderRe.exec(problemDescription);
    const simpleMatch = exampleSimpleRe.exec(problemDescription);
    return Math.min(headerMatch?.index ?? Infinity, simpleMatch?.index ?? Infinity);
  })();

  const descriptionBody =
    firstExampleIndex === Infinity
      ? problemDescription.trim()
      : problemDescription.slice(0, firstExampleIndex).trim();

  const problem: ProblemJson = {
    title: slugToTitle(entry.slug),
    slug: entry.slug,
    difficulty: mapDifficulty(row.difficulty),
    categories: row.tags ?? [],
    description: descriptionBody,
    input_format: getInputFormat(entry.pattern),
    output_format: getOutputFormat(entry.pattern),
    constraints: parseConstraints(problemDescription),
    examples: parseDescriptionExamples(problemDescription)
      .map((example) => ({
        input: convertInput(entry.pattern, example.input),
        output: normalizeOutput(entry.pattern, example.output),
        explanation: example.explanation,
      }))
      .filter((example) => !isMalformedCase(example.input) && !isDiscardedOutput(example.output)),
  };

  const testCaseRows = (Array.isArray(row.input_output) ? row.input_output : []).filter(
    (tc) => !isMalformedCase(tc.input) && !isMalformedCase(tc.output)
  );

  const testCases: TestCase[] = testCaseRows
    .map((tc) => ({
      input: convertInput(entry.pattern, tc.input),
      expected_output: normalizeOutput(entry.pattern, tc.output),
      display_input: tc.input,
      display_output: tc.output,
    }))
    .filter((testCase) => !isDiscardedOutput(testCase.expected_output))
    .map((testCase, index) => ({
      input: testCase.input,
      expected_output: testCase.expected_output,
      display_input: testCase.display_input,
      display_output: testCase.display_output,
      visibility: index + 1 <= 3 ? "PUBLIC" : "PRIVATE",
      order: index + 1,
    }));

  const testCasesJson: TestCasesJson = { test_cases: testCases };

  await fs.writeFile(path.join(problemDir, "problem.json"), JSON.stringify(problem, null, 2), "utf8");
  await fs.writeFile(path.join(problemDir, "testcases.json"), JSON.stringify(testCasesJson, null, 2), "utf8");
}

async function main(): Promise<void> {
  const [rows, supported] = await Promise.all([
    readDatasetRows(),
    readDiscoveryReport(),
  ]);

  const selected = supported.filter((entry) => getReferenceSolver(entry.slug));
  let written = 0;

  for (const entry of selected) {
    const row = rows.get(entry.slug);
    if (!row) {
      console.warn(`⚠️ Missing dataset row for ${entry.slug}`);
      continue;
    }

    await writeProblemFiles(entry, row);
    written += 1;
  }

  console.log(
    `Wrote ${written} supported problems to ${OUTPUT_DIR} (START=${START}, LIMIT=${LIMIT})`
  );
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
