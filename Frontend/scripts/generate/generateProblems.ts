import fs from "fs/promises";
import path from "path";
import readline from "readline";
import { createReadStream } from "fs";

import { PATTERNS, ProblemPattern } from "../lib/problemPatterns";
import {
  convertInput,
  normalizeOutput,
  getInputFormat,
  getOutputFormat,
} from "../lib/converters";

// ── Whitelist ────────────────────────────────────────────────────────────────

const PROBLEMS = [
  "two-sum",
  "contains-duplicate",
  "valid-parentheses",
  "binary-search",
  "climbing-stairs",
  "house-robber",
  "maximum-subarray",
  "search-insert-position",
  "running-sum-of-1d-array",
  "best-time-to-buy-and-sell-stock",
];

// ── Paths & Config ───────────────────────────────────────────────────────────

const DATASET_PATH = path.resolve("datasets/LeetCodeDataset-v0.3.1-train.jsonl");
const OUTPUT_DIR = path.resolve(process.env.PROBLEMS_ROOT ?? "data/problems");
const IS_DRY_RUN = process.argv.includes("--dry-run");

// ── Types ────────────────────────────────────────────────────────────────────

interface DatasetRow {
  task_id: string;
  difficulty: string;
  tags: string[];
  problem_description: string;
  input_output: Array<{ input: string; output: string }>;
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

// ── Helpers ──────────────────────────────────────────────────────────────────

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

// ── Description Parsing ──────────────────────────────────────────────────────

function parseDescription(pattern: ProblemPattern, raw: string): {
  description: string;
  constraints: string[];
  examples: Example[];
} {
  const exampleHeaderRe = /Example\s+\d+\s*:/i;
  const exampleSimpleRe = /Example\s*:/i;

  const firstExampleIdx = (() => {
    const m1 = exampleHeaderRe.exec(raw);
    const m2 = exampleSimpleRe.exec(raw);
    const i1 = m1?.index ?? Infinity;
    const i2 = m2?.index ?? Infinity;
    return Math.min(i1, i2);
  })();

  const descriptionBody =
    firstExampleIdx === Infinity
      ? raw.trim()
      : raw.slice(0, firstExampleIdx).trim();

  // Updated Constraints Regex: Grabs everything until end of string or "Follow-up"
  const constraintsRe = /Constraints\s*:([\s\S]*?)(?=Follow-up|Follow up|$)/i;
  const constraintsMatch = constraintsRe.exec(raw);
  const constraints: string[] = [];
  if (constraintsMatch) {
    constraintsMatch[1]
      .split("\n")
      .map((l) => l.trim().replace(/\b10([1-9])(?!\d)/g, "10^$1"))
      .filter(Boolean)
      .forEach((c) => constraints.push(c));
  }

  const examples: Example[] = [];
  const exampleBlockRe =
    /Example\s*(?:\d+\s*)?:([\s\S]*?)(?=Example\s*(?:\d+\s*)?:|Constraints\s*:|Follow-up|$)/gi;

  let match: RegExpExecArray | null;
  while ((match = exampleBlockRe.exec(raw)) !== null) {
    const block = match[1];

    // Safely parse multi-line content without the ES2018 's' flag
    const inputMatch = /Input\s*:([\s\S]*?)(?=Output\s*:|$)/i.exec(block);
    const outputMatch = /Output\s*:([\s\S]*?)(?=Explanation\s*:|$)/i.exec(block);
    const explanationMatch = /Explanation\s*:([\s\S]*?)$/i.exec(block);

    const rawExInput = inputMatch?.[1].trim() ?? "";
    const rawExOutput = outputMatch?.[1].trim() ?? "";
    const exExplanation = explanationMatch?.[1].trim() ?? "";

    if (rawExInput || rawExOutput) {
      examples.push({
        input: convertInput(pattern, rawExInput), 
        output: normalizeOutput(pattern, rawExOutput),
        explanation: exExplanation,
      });
    }
  }

  return {
    description: descriptionBody,
    constraints,
    examples,
  };
}

// ── Core Generator ───────────────────────────────────────────────────────────

async function processRow(row: DatasetRow): Promise<void> {
  const slug = row.task_id;
  
  const pattern = PATTERNS[slug];

  if (!pattern) {
    console.warn(`⚠️ No pattern found for ${slug}`);
    return;
  }

  const outDir = path.join(OUTPUT_DIR, slug);

  if (!IS_DRY_RUN) {
    try {
      await fs.access(outDir);
      console.log(`⏭️  Skip ${slug} (Directory exists)`);
      return;
    } catch {
      await fs.mkdir(outDir, { recursive: true });
    }
  }

  const { description, constraints, examples } = parseDescription(pattern, row.problem_description);

  const problem: ProblemJson = {
    title: slugToTitle(slug),
    slug,
    difficulty: mapDifficulty(row.difficulty),
    categories: row.tags ?? [],
    description,
    input_format: getInputFormat(pattern),
    output_format: getOutputFormat(pattern),
    constraints,
    examples,
  };

  // Safe extraction for potential dataset schema drift
  const rawInputOutput = Array.isArray(row.input_output) ? row.input_output : [];
  
  const testCases: TestCase[] = rawInputOutput.map((tc, idx) => {
    const order = idx + 1;
    return {
      input: convertInput(pattern, tc.input),
      expected_output: normalizeOutput(pattern, tc.output),
      display_input: tc.input,
      display_output: tc.output,
      visibility: order <= 3 ? "PUBLIC" : "PRIVATE",
      order,
    };
  });

  const testCasesJson: TestCasesJson = { test_cases: testCases };

  if (IS_DRY_RUN) {
    console.log(`\n--- DRY RUN: ${slug} ---`);
    console.log(`Mapped to Pattern: ${pattern}`);
    console.log(`Constraints Extracted: ${constraints.length}`);
    console.log(`Examples formatted successfully: ${examples.length > 0}`);
    console.log(`Test Cases parsed: ${testCases.length}`);
  } else {
    await fs.writeFile(path.join(outDir, "problem.json"), JSON.stringify(problem, null, 2), "utf-8");
    await fs.writeFile(path.join(outDir, "testcases.json"), JSON.stringify(testCasesJson, null, 2), "utf-8");
    console.log(`✅ Generated ${slug} (${testCases.length} test cases)`);
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  if (IS_DRY_RUN) console.log("🚀 Running in DRY RUN mode. No files will be created.\n");

  const whitelistSet = new Set(PROBLEMS);
  const fileStream = createReadStream(DATASET_PATH);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    let row: DatasetRow;
    try {
      row = JSON.parse(trimmed.replace(/^\uFEFF/, "")) as DatasetRow;
    } catch {
      console.warn(`⚠️  Could not parse line: ${trimmed.slice(0, 80)}…`);
      continue;
    }

    if (!whitelistSet.has(row.task_id)) continue;

    await processRow(row); 
  }

  console.log("\n🎉 Done.");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
