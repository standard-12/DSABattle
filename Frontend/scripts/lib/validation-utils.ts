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

function splitLinesPreservingEmpty(input: string): string[] {
  return input
    .replace(/\r/g, "")
    .trim()
    .split("\n")
    .map((line) => line.trim());
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
  const lines = splitLinesPreservingEmpty(input);
  const arrayLine = lines[1] ?? lines[0] ?? "";
  return parseNumbers(arrayLine);
}

function parseArrayTargetInput(input: string): { nums: number[]; target: number } {
  const lines = splitLinesPreservingEmpty(input);
  return {
    nums: parseArrayInput(input),
    target: Number(lines[2] ?? lines[1] ?? lines[0] ?? "0"),
  };
}

function parseIntegerInput(input: string): number {
  const lines = splitLines(input);
  const rawValue = lines[0] ?? input.trim() ?? "0";
  const numericMatch = rawValue.match(/-?\d+/);
  return Number(numericMatch?.[0] ?? rawValue);
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

function reverseInteger(n: number): number {
  const sign = n < 0 ? -1 : 1;
  let reversed = 0;
  let num = Math.abs(n);
  while (num > 0) {
    reversed = reversed * 10 + (num % 10);
    num = Math.floor(num / 10);
  }
  const result = sign * reversed;
  const INT_MIN = -Math.pow(2, 31);
  const INT_MAX = Math.pow(2, 31) - 1;
  return result < INT_MIN || result > INT_MAX ? 0 : result;
}

function containerWithMostWater(nums: number[]): number {
  let maxArea = 0;
  let left = 0;
  let right = nums.length - 1;
  while (left < right) {
    const width = right - left;
    const height = Math.min(nums[left], nums[right]);
    maxArea = Math.max(maxArea, width * height);
    if (nums[left] < nums[right]) {
      left += 1;
    } else {
      right -= 1;
    }
  }
  return maxArea;
}

function threeSum(nums: number[]): number[][] {
  nums.sort((a, b) => a - b);
  const result: number[][] = [];
  for (let i = 0; i < nums.length - 2; i += 1) {
    if (i > 0 && nums[i] === nums[i - 1]) continue;
    let left = i + 1;
    let right = nums.length - 1;
    while (left < right) {
      const sum = nums[i] + nums[left] + nums[right];
      if (sum === 0) {
        result.push([nums[i], nums[left], nums[right]]);
        while (left < right && nums[left] === nums[left + 1]) left += 1;
        while (left < right && nums[right] === nums[right - 1]) right -= 1;
        left += 1;
        right -= 1;
      } else if (sum < 0) {
        left += 1;
      } else {
        right -= 1;
      }
    }
  }
  return result.length > 0 ? result : [];
}

function threeSumClosest(nums: number[], target: number): number {
  nums.sort((a, b) => a - b);
  let closest = nums[0] + nums[1] + nums[2];
  for (let i = 0; i < nums.length - 2; i += 1) {
    let left = i + 1;
    let right = nums.length - 1;
    while (left < right) {
      const sum = nums[i] + nums[left] + nums[right];
      if (Math.abs(sum - target) < Math.abs(closest - target)) {
        closest = sum;
      }
      if (sum < target) {
        left += 1;
      } else {
        right -= 1;
      }
    }
  }
  return closest;
}

function fourSum(nums: number[], target: number): number[][] {
  nums.sort((a, b) => a - b);
  const result: number[][] = [];
  for (let i = 0; i < nums.length - 3; i += 1) {
    if (i > 0 && nums[i] === nums[i - 1]) continue;
    for (let j = i + 1; j < nums.length - 2; j += 1) {
      if (j > i + 1 && nums[j] === nums[j - 1]) continue;
      let left = j + 1;
      let right = nums.length - 1;
      while (left < right) {
        const sum = nums[i] + nums[j] + nums[left] + nums[right];
        if (sum === target) {
          result.push([nums[i], nums[j], nums[left], nums[right]]);
          while (left < right && nums[left] === nums[left + 1]) left += 1;
          while (left < right && nums[right] === nums[right - 1]) right -= 1;
          left += 1;
          right -= 1;
        } else if (sum < target) {
          left += 1;
        } else {
          right -= 1;
        }
      }
    }
  }
  return result.length > 0 ? result : [];
}

function nextPermutation(nums: number[]): void {
  let i = nums.length - 2;
  while (i >= 0 && nums[i] >= nums[i + 1]) i -= 1;
  if (i >= 0) {
    let j = nums.length - 1;
    while (j > i && nums[j] <= nums[i]) j -= 1;
    [nums[i], nums[j]] = [nums[j], nums[i]];
  }

  let left = i + 1;
  let right = nums.length - 1;
  while (left < right) {
    [nums[left], nums[right]] = [nums[right], nums[left]];
    left += 1;
    right -= 1;
  }
}

function searchInRotatedSortedArray(nums: number[], target: number): number {
  let left = 0;
  let right = nums.length - 1;
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    if (nums[mid] === target) return mid;
    if (nums[left] <= nums[mid]) {
      if (target >= nums[left] && target < nums[mid]) {
        right = mid - 1;
      } else {
        left = mid + 1;
      }
    } else {
      if (target <= nums[right] && target > nums[mid]) {
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }
  }
  return -1;
}

function findFirstAndLastPosition(nums: number[], target: number): number[] {
  const findFirst = (): number => {
    let left = 0;
    let right = nums.length - 1;
    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      if (nums[mid] === target) {
        if (mid === 0 || nums[mid - 1] < target) return mid;
        right = mid - 1;
      } else if (nums[mid] < target) {
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }
    return -1;
  };
  const findLast = (): number => {
    let left = 0;
    let right = nums.length - 1;
    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      if (nums[mid] === target) {
        if (mid === nums.length - 1 || nums[mid + 1] > target) return mid;
        left = mid + 1;
      } else if (nums[mid] < target) {
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }
    return -1;
  };
  const first = findFirst();
  if (first === -1) return [-1, -1];
  return [first, findLast()];
}

function isValidSudoku(board: string[][]): boolean {
  const rows = Array.from({ length: 9 }, () => new Set<string>());
  const cols = Array.from({ length: 9 }, () => new Set<string>());
  const boxes = Array.from({ length: 9 }, () => new Set<string>());
  for (let i = 0; i < 9; i += 1) {
    for (let j = 0; j < 9; j += 1) {
      const char = board[i][j];
      if (char === ".") continue;
      const boxIndex = Math.floor(i / 3) * 3 + Math.floor(j / 3);
      if (rows[i].has(char) || cols[j].has(char) || boxes[boxIndex].has(char)) {
        return false;
      }
      rows[i].add(char);
      cols[j].add(char);
      boxes[boxIndex].add(char);
    }
  }
  return true;
}

function parseSudokuBoardInput(input: string): string[][] {
  const tokens = Array.from(input.matchAll(/"([^"]+)"|\b\.|[1-9]\b/g)).map(
    (match) => match[1] ?? match[0]
  );

  if (tokens.length >= 81) {
    const boardTokens = tokens.slice(tokens.length - 81);
    const board: string[][] = [];

    for (let row = 0; row < 9; row += 1) {
      board.push(boardTokens.slice(row * 9, row * 9 + 9));
    }

    return board;
  }

  const lines = splitLines(input);
  const boardLine = lines.slice(1).join(" ");
  const fallbackTokens = Array.from(boardLine.matchAll(/"([^"]+)"|\b\.|[1-9]\b/g)).map(
    (match) => match[1] ?? match[0]
  );
  const board: string[][] = [];

  for (let row = 0; row < 9; row += 1) {
    board.push(fallbackTokens.slice(row * 9, row * 9 + 9));
  }

  return board;
}

function combinationSum(candidates: number[], target: number): number[][] {
  const result: number[][] = [];
  const dfs = (start: number, path: number[], remaining: number): void => {
    if (remaining === 0) {
      result.push([...path]);
      return;
    }
    if (remaining < 0) return;
    for (let i = start; i < candidates.length; i += 1) {
      path.push(candidates[i]);
      dfs(i, path, remaining - candidates[i]);
      path.pop();
    }
  };
  dfs(0, [], target);
  return result.length > 0 ? result : [];
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
  "reverse-integer": {
    pattern: "INTEGER",
    solve: (input) => reverseInteger(parseIntegerInput(input)),
  },
  "container-with-most-water": {
    pattern: "ARRAY",
    solve: (input) => containerWithMostWater(parseArrayInput(input)),
  },
  "3sum": {
    pattern: "ARRAY",
    solve: (input) => threeSum(parseArrayInput(input)),
  },
  "3sum-closest": {
    pattern: "ARRAY_TARGET_INDEX",
    solve: (input) => {
      const { nums, target } = parseArrayTargetInput(input);
      return threeSumClosest(nums, target);
    },
  },
  "4sum": {
    pattern: "ARRAY_TARGET_PAIR",
    solve: (input) => {
      const { nums, target } = parseArrayTargetInput(input);
      return fourSum(nums, target);
    },
  },
  "next-permutation": {
    pattern: "ARRAY",
    solve: (input) => {
      const nums = parseArrayInput(input);
      nextPermutation(nums);
      return nums;
    },
  },
  "search-in-rotated-sorted-array": {
    pattern: "ARRAY_TARGET_INDEX",
    solve: (input) => {
      const { nums, target } = parseArrayTargetInput(input);
      return searchInRotatedSortedArray(nums, target);
    },
  },
  "find-first-and-last-position-of-element-in-sorted-array": {
    pattern: "ARRAY_TARGET_PAIR",
    solve: (input) => {
      const { nums, target } = parseArrayTargetInput(input);
      return findFirstAndLastPosition(nums, target);
    },
  },
  "valid-sudoku": {
    pattern: "ARRAY",
    solve: (input) => isValidSudoku(parseSudokuBoardInput(input)),
  },
  "combination-sum": {
    pattern: "ARRAY_TARGET_PAIR",
    solve: (input) => {
      const lines = splitLinesPreservingEmpty(input);
      const candidates = parseNumbers(lines[1] ?? lines[0] ?? "");
      const target = Number(lines[2] ?? lines[1] ?? lines[0] ?? "0");
      return combinationSum(candidates, target);
    },
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
