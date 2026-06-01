export type ProblemPattern =
  | "ARRAY"
  | "ARRAY_TARGET_PAIR"
  | "ARRAY_TARGET_INDEX"
  | "STRING"
  | "INTEGER";

export const PATTERNS: Record<
  string,
  ProblemPattern
> = {
  // Array + Target → output two indices
  "two-sum":
    "ARRAY_TARGET_PAIR",

  // Array + Target → output single index
  "binary-search":
    "ARRAY_TARGET_INDEX",
  "search-insert-position":
    "ARRAY_TARGET_INDEX",

  // Array only
  "contains-duplicate":
    "ARRAY",
  "maximum-subarray":
    "ARRAY",
  "house-robber":
    "ARRAY",
  "running-sum-of-1d-array":
    "ARRAY",
  "best-time-to-buy-and-sell-stock":
    "ARRAY",

  // String
  "valid-parentheses":
    "STRING",

  // Integer
  "climbing-stairs":
    "INTEGER",
  "reverse-integer":
    "INTEGER",

  // Two pointers / Array advanced
  "container-with-most-water":
    "ARRAY",
  "3sum":
    "ARRAY",
  "4sum":
    "ARRAY_TARGET_PAIR",
  "next-permutation":
    "ARRAY",
  "search-in-rotated-sorted-array":
    "ARRAY_TARGET_INDEX",
  "3sum-closest":
    "ARRAY_TARGET_INDEX",
  "find-first-and-last-position-of-element-in-sorted-array":
    "ARRAY_TARGET_PAIR",
  "valid-sudoku":
    "ARRAY",
  "combination-sum":
    "ARRAY_TARGET_PAIR",
};
