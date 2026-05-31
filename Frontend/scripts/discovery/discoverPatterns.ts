import fs from "fs/promises";
import path from "path";
import readline from "readline";
import { createReadStream } from "fs";

import { ProblemPattern } from "../lib/problemPatterns";

type FuturePattern =
  | "TWO_STRINGS"
  | "MATRIX"
  | "INTERVALS"
  | "LINKED_LIST"
  | "TREE";

type PatternLabel = ProblemPattern | FuturePattern | "OTHER";

interface DatasetRow {
  task_id: string;
  difficulty?: string;
  tags?: string[];
  problem_description?: string;
}

interface ExampleBlock {
  input: string;
  output: string;
}

interface SupportedProblem {
  slug: string;
  title: string;
  pattern: ProblemPattern;
}

interface UnsupportedProblem {
  slug: string;
  title: string;
  reason: PatternLabel;
}

interface Report {
  supported: SupportedProblem[];
  unsupported: UnsupportedProblem[];
  patternCounts: Record<ProblemPattern, number>;
  futurePatternCandidates: Record<FuturePattern, number>;
  otherUnsupportedCount: number;
  totalProblems: number;
}

interface AssignmentField {
  name: string | null;
  value: string;
}

interface FieldAnalysis {
  name: string | null;
  kind: "array" | "string" | "integer" | "boolean" | "other";
  isNestedArray: boolean;
}

const DATASET_PATH = path.resolve("datasets/LeetCodeDataset-v0.3.1-train.jsonl");
const REPORT_PATH = path.resolve("data/pattern-discovery-report.json");

function slugToTitle(slug: string): string {
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function parseDescriptionExamples(raw: string): ExampleBlock[] {
  const exampleBlockRe =
    /Example\s*(?:\d+\s*)?:([\s\S]*?)(?=Example\s*(?:\d+\s*)?:|Constraints\s*:|Follow-up|Follow up|$)/gi;

  const examples: ExampleBlock[] = [];
  let match: RegExpExecArray | null;

  while ((match = exampleBlockRe.exec(raw)) !== null) {
    const block = match[1];
    const inputMatch = /Input\s*:([\s\S]*?)(?=Output\s*:|$)/i.exec(block);
    const outputMatch = /Output\s*:([\s\S]*?)(?=Explanation\s*:|$)/i.exec(block);

    const input = inputMatch?.[1].trim() ?? "";
    const output = outputMatch?.[1].trim() ?? "";

    if (input || output) {
      examples.push({ input, output });
    }
  }

  return examples;
}

function parseAssignments(rawInput: string): AssignmentField[] {
  const text = rawInput.replace(/\r?\n/g, " ").trim();

  if (!text) return [];

  if (!text.includes("=")) {
    return [{ name: null, value: text }];
  }

  const parts: string[] = [];
  let current = "";
  let depth = 0;
  let quote: '"' | "'" | null = null;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];

    if (quote) {
      current += character;
      if (character === quote && text[index - 1] !== "\\") {
        quote = null;
      }
      continue;
    }

    if (character === '"' || character === "'") {
      quote = character;
      current += character;
      continue;
    }

    if (character === "[" || character === "(" || character === "{") {
      depth += 1;
    } else if (character === "]" || character === ")" || character === "}") {
      depth = Math.max(0, depth - 1);
    }

    if (character === "," && depth === 0) {
      const segment = current.trim();
      if (segment) parts.push(segment);
      current = "";
      continue;
    }

    current += character;
  }

  if (current.trim()) {
    parts.push(current.trim());
  }

  return parts.map((segment) => {
    const equalsIndex = segment.indexOf("=");

    if (equalsIndex === -1) {
      return { name: null, value: segment.trim() };
    }

    return {
      name: segment.slice(0, equalsIndex).trim(),
      value: segment.slice(equalsIndex + 1).trim(),
    };
  });
}

function classifyField(value: string): FieldAnalysis {
  const trimmed = value.trim();
  const lower = trimmed.toLowerCase();

  if (/^\[[\s\S]*\]$/.test(trimmed)) {
    return {
      name: null,
      kind: trimmed.includes("[[") ? "array" : "array",
      isNestedArray: trimmed.includes("[["),
    };
  }

  if (/^(\"|\')[\s\S]*\1$/.test(trimmed)) {
    return { name: null, kind: "string", isNestedArray: false };
  }

  if (/^-?\d+$/.test(trimmed)) {
    return { name: null, kind: "integer", isNestedArray: false };
  }

  if (/^(true|false)$/i.test(lower)) {
    return { name: null, kind: "boolean", isNestedArray: false };
  }

  return { name: null, kind: "other", isNestedArray: false };
}

function analyzeInput(rawInput: string): FieldAnalysis[] {
  const assignments = parseAssignments(rawInput);

  if (assignments.length === 0) {
    return [classifyField(rawInput)];
  }

  return assignments.map((assignment) => {
    const field = classifyField(assignment.value);
    return {
      ...field,
      name: assignment.name,
    };
  });
}

function analyzeOutput(rawOutput: string): FieldAnalysis {
  const trimmed = rawOutput.trim();

  if (/^\[[\s\S]*\]$/.test(trimmed)) {
    return {
      name: null,
      kind: "array",
      isNestedArray: trimmed.includes("[["),
    };
  }

  if (/^(true|false)$/i.test(trimmed)) {
    return { name: null, kind: "boolean", isNestedArray: false };
  }

  if (/^-?\d+$/.test(trimmed)) {
    return { name: null, kind: "integer", isNestedArray: false };
  }

  if (/^(\"|\')[\s\S]*\1$/.test(trimmed)) {
    return { name: null, kind: "string", isNestedArray: false };
  }

  return { name: null, kind: "other", isNestedArray: false };
}

function isArrayLike(kind: FieldAnalysis["kind"]): boolean {
  return kind === "array";
}

function isIntegerLike(kind: FieldAnalysis["kind"]): boolean {
  return kind === "integer";
}

function isStringLike(kind: FieldAnalysis["kind"]): boolean {
  return kind === "string";
}

function isBooleanLike(kind: FieldAnalysis["kind"]): boolean {
  return kind === "boolean";
}

function countBy<T extends string>(values: T[]): Record<string, number> {
  return values.reduce<Record<string, number>>((accumulator, value) => {
    accumulator[value] = (accumulator[value] ?? 0) + 1;
    return accumulator;
  }, {});
}

function hasKeyword(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some((keyword) => lower.includes(keyword));
}

function inferFuturePattern(
  title: string,
  description: string,
  inputFields: FieldAnalysis[]
): FuturePattern | "OTHER" {
  const searchableText = `${title} ${description}`.toLowerCase();
  const stringFields = inputFields.filter((field) => isStringLike(field.kind));
  const arrayFields = inputFields.filter((field) => isArrayLike(field.kind));
  const nestedArrayFields = inputFields.filter((field) => field.isNestedArray);
  const fieldNames = inputFields
    .map((field) => field.name?.toLowerCase() ?? "")
    .join(" ");
  const nameSearch = `${searchableText} ${fieldNames}`;

  if (
    hasKeyword(nameSearch, ["tree", "bst", "binary tree", "root"]) ||
    fieldNames.includes("root")
  ) {
    return "TREE";
  }

  if (
    hasKeyword(nameSearch, ["linked list", "head", "list node", "node"]) ||
    fieldNames.includes("head")
  ) {
    return "LINKED_LIST";
  }

  if (
    hasKeyword(nameSearch, ["interval", "intervals", "range"])
  ) {
    return "INTERVALS";
  }

  if (
    hasKeyword(nameSearch, ["matrix", "grid", "board", "2d", "2-d"]) ||
    nestedArrayFields.length > 0 ||
    arrayFields.length > 1
  ) {
    return "MATRIX";
  }

  if (stringFields.length >= 2) {
    return "TWO_STRINGS";
  }

  return "OTHER";
}

function inferSupportedPattern(
  inputFields: FieldAnalysis[],
  outputField: FieldAnalysis
): ProblemPattern | null {
  const arrayFields = inputFields.filter((field) => isArrayLike(field.kind));
  const integerFields = inputFields.filter((field) => isIntegerLike(field.kind));
  const stringFields = inputFields.filter((field) => isStringLike(field.kind));
  const booleanFields = inputFields.filter((field) => isBooleanLike(field.kind));
  const hasTargetField = inputFields.some((field) => {
    const name = field.name?.toLowerCase() ?? "";
    return name === "target" || name.includes("target");
  });

  if (
    arrayFields.length === 1 &&
    integerFields.length === 0 &&
    stringFields.length === 0 &&
    booleanFields.length === 0
  ) {
    if (
      outputField.kind === "array" ||
      outputField.kind === "integer" ||
      outputField.kind === "boolean"
    ) {
      return "ARRAY";
    }

    return null;
  }

  if (arrayFields.length === 1 && integerFields.length === 1 && stringFields.length === 0) {
    if (outputField.kind === "array") {
      const elements = outputField.kind === "array";
      if (elements) {
        return "ARRAY_TARGET_PAIR";
      }
    }

    if (outputField.kind === "integer") {
      return "ARRAY_TARGET_INDEX";
    }

    if (hasTargetField && outputField.kind === "boolean") {
      return null;
    }
  }

  if (
    arrayFields.length === 0 &&
    integerFields.length === 1 &&
    stringFields.length === 0 &&
    booleanFields.length === 0 &&
    outputField.kind === "integer"
  ) {
    return "INTEGER";
  }

  if (
    arrayFields.length === 0 &&
    integerFields.length === 0 &&
    stringFields.length === 1 &&
    booleanFields.length === 0 &&
    outputField.kind === "boolean"
  ) {
    return "STRING";
  }

  return null;
}

async function main(): Promise<void> {
  const supported: SupportedProblem[] = [];
  const unsupported: UnsupportedProblem[] = [];
  const patternCounts: Record<ProblemPattern, number> = {
    ARRAY: 0,
    ARRAY_TARGET_INDEX: 0,
    ARRAY_TARGET_PAIR: 0,
    STRING: 0,
    INTEGER: 0,
  };
  const futurePatternCandidates: Record<FuturePattern, number> = {
    TWO_STRINGS: 0,
    MATRIX: 0,
    INTERVALS: 0,
    LINKED_LIST: 0,
    TREE: 0,
  };

  const fileStream = createReadStream(DATASET_PATH);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  let totalProblems = 0;

  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    let row: DatasetRow;

    try {
      row = JSON.parse(trimmed.replace(/^\uFEFF/, "")) as DatasetRow;
    } catch {
      continue;
    }

    totalProblems += 1;

    const slug = row.task_id;
    const title = slugToTitle(slug);
    const description = row.problem_description ?? "";
    const examples = parseDescriptionExamples(description);

    if (examples.length === 0) {
      const futureReason = inferFuturePattern(title, description, []);
      if (futureReason !== "OTHER") {
        futurePatternCandidates[futureReason] += 1;
      }

      unsupported.push({
        slug,
        title,
        reason: futureReason,
      });
      continue;
    }

    const detectedPatterns = examples.map((example) =>
      inferSupportedPattern(
        analyzeInput(example.input),
        analyzeOutput(example.output)
      )
    );

    const detectedPattern = detectedPatterns[0] ?? null;
    const allExamplesAgree =
      detectedPattern !== null &&
      detectedPatterns.every((pattern) => pattern === detectedPattern);

    if (allExamplesAgree && detectedPattern) {
      supported.push({
        slug,
        title,
        pattern: detectedPattern,
      });
      patternCounts[detectedPattern] += 1;
      continue;
    }

    const flatInputFields = examples.map((example) => analyzeInput(example.input)).flat();

    const futureReason = inferFuturePattern(title, description, flatInputFields);

    if (futureReason !== "OTHER") {
      futurePatternCandidates[futureReason] += 1;
    }

    unsupported.push({
      slug,
      title,
      reason: futureReason,
    });
  }

  const report: Report = {
    supported,
    unsupported,
    patternCounts,
    futurePatternCandidates,
    otherUnsupportedCount: unsupported.filter((item) => item.reason === "OTHER").length,
    totalProblems,
  };

  await fs.mkdir(path.dirname(REPORT_PATH), { recursive: true });
  await fs.writeFile(REPORT_PATH, JSON.stringify(report, null, 2), "utf-8");

  const supportedCount = supported.length;
  const unsupportedCount = unsupported.length;

  console.log(`Supported Problems: ${supportedCount}`);
  console.log(`Unsupported Problems: ${unsupportedCount}`);
  console.log("");
  console.log("Pattern Counts:");
  console.log(`ARRAY: ${patternCounts.ARRAY}`);
  console.log(`ARRAY_TARGET_INDEX: ${patternCounts.ARRAY_TARGET_INDEX}`);
  console.log(`ARRAY_TARGET_PAIR: ${patternCounts.ARRAY_TARGET_PAIR}`);
  console.log(`STRING: ${patternCounts.STRING}`);
  console.log(`INTEGER: ${patternCounts.INTEGER}`);
  console.log("");
  console.log("Future Pattern Candidates:");
  console.log(`TWO_STRINGS: ${futurePatternCandidates.TWO_STRINGS}`);
  console.log(`MATRIX: ${futurePatternCandidates.MATRIX}`);
  console.log(`INTERVALS: ${futurePatternCandidates.INTERVALS}`);
  console.log(`LINKED_LIST: ${futurePatternCandidates.LINKED_LIST}`);
  console.log(`TREE: ${futurePatternCandidates.TREE}`);
  console.log("");
  console.log(`Report written to: ${REPORT_PATH}`);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
