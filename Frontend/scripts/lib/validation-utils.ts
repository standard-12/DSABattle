// This module defines schemas, types, and utility functions for validating problem definitions and test cases, as well as reference solvers for known problem patterns. It provides functionality to read problem folders, parse inputs, and compare actual outputs against expected outputs for validation purposes.
import fs from "fs/promises";
import path from "path";

import { z } from "zod";

import { normalizeOutput } from "./converters";
import { ProblemPattern } from "./problemPatterns";

export const DEFAULT_PROBLEMS_ROOT = path.resolve("data/problems");
export const DEFAULT_REPORT_PATH = path.resolve("data/pattern-discovery-report.json");

export const DifficultySchema = z.union([
  z.enum(["Easy", "Medium", "Hard"]),
  z.enum(["EASY", "MEDIUM", "HARD"]),
]);

export const ExampleSchema = z.object({
  input: z.string(),
  output: z.string(),
  explanation: z.string(),
}).strict();

export const ProblemSchema = z.object({
  title: z.string().min(1),
  slug: z.string().min(1),
  difficulty: DifficultySchema,
  categories: z.array(z.string()),
  description: z.string(),
  input_format: z.array(z.string()),
  output_format: z.array(z.string()),
  constraints: z.array(z.string()),
  examples: z.array(ExampleSchema).min(1),
}).strict();

export const TestCaseSchema = z.object({
  input: z.string(),
  expected_output: z.string(),
  display_input: z.string(),
  display_output: z.string(),
  visibility: z.enum(["PUBLIC", "PRIVATE"]),
  order: z.number().int().positive(),
}).strict();

export const TestCasesSchema = z.object({
  test_cases: z.array(TestCaseSchema).min(1),
}).strict();

export type ProblemJson = z.infer<typeof ProblemSchema>;
export type TestCaseJson = z.infer<typeof TestCaseSchema>;
export type TestCasesJson = z.infer<typeof TestCasesSchema>;

export type ValidationIssue = {
  slug: string;
  message: string;
};

export type ValidationSummary = {
  checked: number;
  valid: number;
  invalid: number;
  issues: ValidationIssue[];
};

export function countInvalidSlugs(issues: ValidationIssue[]): number {
  return new Set(issues.map((issue) => issue.slug)).size;
}

export type ReferenceSolver = {
  pattern: ProblemPattern;
  solve: (input: string) => unknown;
};

function splitLines(input: string): string[] {
  return input
    .replace(/\r/g, "")
    .trim()
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function parseNumbers(raw: string): number[] {
  if (!raw.trim()) return [];
  return raw
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((value) => Number(value));
}

function parseArrayInput(input: string): number[] {
  const lines = splitLines(input);
  const arrayLine = lines[1] ?? lines[0] ?? "";
  return parseNumbers(arrayLine);
}

function parseArrayTargetInput(input: string): { nums: number[]; target: number } {
  const lines = splitLines(input);
  return {
    nums: parseArrayInput(input),
    target: Number(lines[2] ?? lines[1] ?? lines[0] ?? "0"),
  };
}

function parseIntegerInput(input: string): number {
  const lines = splitLines(input);
  return Number(lines[0] ?? input.trim() ?? "0");
}

function parseStringInput(input: string): string {
  return input.trim();
}

function twoSum(nums: number[], target: number): number[] | null {
  const seen = new Map<number, number>();

  for (let index = 0; index < nums.length; index += 1) {
    const value = nums[index];
    const complement = target - value;
    const previous = seen.get(complement);

    if (previous !== undefined) {
      return [previous, index];
    }

    seen.set(value, index);
  }

  return null;
}

function containsDuplicate(nums: number[]): boolean {
  return new Set(nums).size !== nums.length;
}

function validParentheses(value: string): boolean {
  const stack: string[] = [];
  const pairs: Record<string, string> = {
    ")": "(",
    "]": "[",
    "}": "{",
  };

  for (const character of value) {
    if (character === "(" || character === "[" || character === "{") {
      stack.push(character);
      continue;
    }

    if (pairs[character]) {
      if (stack.pop() !== pairs[character]) {
        return false;
      }
    }
  }

  return stack.length === 0;
}

function binarySearch(nums: number[], target: number): number {
  let left = 0;
  let right = nums.length - 1;

  while (left <= right) {
    const middle = Math.floor((left + right) / 2);

    if (nums[middle] === target) {
      return middle;
    }

    if (nums[middle] < target) {
      left = middle + 1;
    } else {
      right = middle - 1;
    }
  }

  return -1;
}

function searchInsert(nums: number[], target: number): number {
  let left = 0;
  let right = nums.length;

  while (left < right) {
    const middle = Math.floor((left + right) / 2);

    if (nums[middle] >= target) {
      right = middle;
    } else {
      left = middle + 1;
    }
  }

  return left;
}

function climbingStairs(n: number): number {
  if (n <= 2) return n;

  let previous = 1;
  let current = 2;

  for (let step = 3; step <= n; step += 1) {
    const next = previous + current;
    previous = current;
    current = next;
  }

  return current;
}

function houseRobber(nums: number[]): number {
  let include = 0;
  let exclude = 0;

  for (const value of nums) {
    const nextInclude = exclude + value;
    exclude = Math.max(exclude, include);
    include = nextInclude;
  }

  return Math.max(include, exclude);
}

function maximumSubarray(nums: number[]): number {
  let best = nums[0] ?? 0;
  let current = nums[0] ?? 0;

  for (let index = 1; index < nums.length; index += 1) {
    current = Math.max(nums[index], current + nums[index]);
    best = Math.max(best, current);
  }

  return best;
}

function runningSum(nums: number[]): number[] {
  const result: number[] = [];
  let sum = 0;

  for (const value of nums) {
    sum += value;
    result.push(sum);
  }

  return result;
}

function bestTimeToBuyAndSellStock(nums: number[]): number {
  let minPrice = Number.POSITIVE_INFINITY;
  let bestProfit = 0;

  for (const price of nums) {
    minPrice = Math.min(minPrice, price);
    bestProfit = Math.max(bestProfit, price - minPrice);
  }

  return bestProfit;
}

const REFERENCE_SOLVERS: Record<string, ReferenceSolver> = {
  "two-sum": {
    pattern: "ARRAY_TARGET_PAIR",
    solve: (input) => {
      const { nums, target } = parseArrayTargetInput(input);
      return twoSum(nums, target);
    },
  },
  "contains-duplicate": {
    pattern: "ARRAY",
    solve: (input) => containsDuplicate(parseArrayInput(input)),
  },
  "valid-parentheses": {
    pattern: "STRING",
    solve: (input) => validParentheses(parseStringInput(input)),
  },
  "binary-search": {
    pattern: "ARRAY_TARGET_INDEX",
    solve: (input) => {
      const { nums, target } = parseArrayTargetInput(input);
      return binarySearch(nums, target);
    },
  },
  "climbing-stairs": {
    pattern: "INTEGER",
    solve: (input) => climbingStairs(parseIntegerInput(input)),
  },
  "house-robber": {
    pattern: "ARRAY",
    solve: (input) => houseRobber(parseArrayInput(input)),
  },
  "maximum-subarray": {
    pattern: "ARRAY",
    solve: (input) => maximumSubarray(parseArrayInput(input)),
  },
  "search-insert-position": {
    pattern: "ARRAY_TARGET_INDEX",
    solve: (input) => {
      const { nums, target } = parseArrayTargetInput(input);
      return searchInsert(nums, target);
    },
  },
  "running-sum-of-1d-array": {
    pattern: "ARRAY",
    solve: (input) => runningSum(parseArrayInput(input)),
  },
  "best-time-to-buy-and-sell-stock": {
    pattern: "ARRAY",
    solve: (input) => bestTimeToBuyAndSellStock(parseArrayInput(input)),
  },
};

export function getReferenceSolver(slug: string): ReferenceSolver | null {
  return REFERENCE_SOLVERS[slug] ?? null;
}

export function listReferenceSlugs(): string[] {
  return Object.keys(REFERENCE_SOLVERS).sort();
}

export function formatActualOutput(pattern: ProblemPattern, actual: unknown): string {
  if (actual === null || actual === undefined) {
    return "None";
  }

  if (typeof actual === "string") {
    return actual.trim();
  }

  return normalizeOutput(pattern, JSON.stringify(actual));
}

export function readIntEnv(name: string, fallback: number): number {
  const rawValue = process.env[name];

  if (rawValue === undefined) {
    return fallback;
  }

  const parsed = Number.parseInt(rawValue, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function getProblemsRoot(): string {
  return path.resolve(process.env.PROBLEMS_ROOT ?? DEFAULT_PROBLEMS_ROOT);
}

export async function readProblemFolders(problemsRoot = getProblemsRoot()): Promise<string[]> {
  const entries = await fs.readdir(problemsRoot, { withFileTypes: true });
  return entries.filter((entry) => entry.isDirectory()).map((entry) => path.join(problemsRoot, entry.name));
}

export async function readJsonFile<T>(filePath: string): Promise<T> {
  const rawText = await fs.readFile(filePath, "utf8");
  return JSON.parse(rawText.replace(/^\uFEFF/, "")) as T;
}

export function normalizeDifficultyLabel(value: string): string {
  const upper = value.toUpperCase();
  if (upper === "EASY" || upper === "MEDIUM" || upper === "HARD") {
    return upper;
  }

  return value;
}
