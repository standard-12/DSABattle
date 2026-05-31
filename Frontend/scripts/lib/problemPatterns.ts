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
};
