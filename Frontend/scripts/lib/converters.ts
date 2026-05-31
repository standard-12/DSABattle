import { ProblemPattern } from "./problemPatterns.js";

function serializeArrayOutput(
  rawOutput: string,
  topLevel: boolean
): string {
  const trimmed = rawOutput.trim();

  if (!trimmed.startsWith("[") || !trimmed.endsWith("]")) {
    return trimmed;
  }

  const inner = trimmed.slice(1, -1).trim();
  if (!inner) {
    return topLevel ? "" : "[]";
  }

  const parts: string[] = [];
  let current = "";
  let depth = 0;

  for (let index = 0; index < inner.length; index += 1) {
    const character = inner[index];

    if (character === "[") {
      depth += 1;
    } else if (character === "]") {
      depth -= 1;
    }

    if (character === "," && depth === 0) {
      const segment = current.trim();
      if (segment) parts.push(segment);
      current = "";
      continue;
    }

    current += character;
  }

  const finalSegment = current.trim();
  if (finalSegment) parts.push(finalSegment);

  const normalized = parts
    .map((part) => serializeArrayOutput(part, false))
    .join(" ");

  return topLevel ? normalized : `[${normalized}]`;
}

export function convertInput(
  pattern: ProblemPattern,
  rawInput: string
): string {
  const trim = rawInput.trim();

  function extractArray(
    str: string,
    variable: string
  ): string[] | null {
    const match = new RegExp(
      `${variable}\\s*=\\s*\\[([^\\]]*)\\]`
    ).exec(str);

    if (!match) return null;

    return match[1]
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
  }

  function extractNumber(
    str: string,
    variable: string
  ): string | null {
    const match = new RegExp(
      `${variable}\\s*=\\s*(-?\\d+(?:\\.\\d+)?)`
    ).exec(str);

    return match?.[1] ?? null;
  }

  function extractString(
    str: string,
    variable: string
  ): string | null {
    const match = new RegExp(
      `${variable}\\s*=\\s+"([^\"]*)"`
    ).exec(str);

    return match?.[1] ?? null;
  }

  switch (pattern) {
    case "ARRAY": {
      const nums =
        extractArray(trim, "nums") ??
        extractArray(trim, "prices");

      if (!nums) return trim;

      return `${nums.length}\n${nums.join(
        " "
      )}`;
    }

    case "ARRAY_TARGET_PAIR":
    case "ARRAY_TARGET_INDEX": {
      const nums =
        extractArray(trim, "nums");

      const target =
        extractNumber(
          trim,
          "target"
        );

      if (!nums || !target)
        return trim;

      return `${nums.length}\n${nums.join(
        " "
      )}\n${target}`;
    }

    case "STRING": {
      const s =
        extractString(trim, "s");

      return s ?? trim;
    }

    case "INTEGER": {
      const n =
        extractNumber(trim, "n");

      return n ?? trim;
    }
  }
}

export function normalizeOutput(
  pattern: ProblemPattern,
  rawOutput: string
): string {
  const trim = rawOutput.trim();

  const normalizeScalar = () => {
    const lower = trim.toLowerCase();

    if (lower === "none" || lower === "null") {
      return "None";
    }

    return lower;
  };

  switch (pattern) {
    case "ARRAY_TARGET_PAIR": {
      return trim.startsWith("[") ? serializeArrayOutput(trim, true) : normalizeScalar();
    }

    case "ARRAY": {
      return trim.startsWith("[") ? serializeArrayOutput(trim, true) : normalizeScalar();
    }

    case "ARRAY_TARGET_INDEX":
    case "STRING":
    case "INTEGER":
      return trim.toLowerCase();
  }
}

export function getInputFormat(
  pattern: ProblemPattern
): string[] {
  switch (pattern) {
    case "ARRAY":
      return [
        "Line 1: Integer n",
        "Line 2: n space-separated integers",
      ];

    case "ARRAY_TARGET_PAIR":
    case "ARRAY_TARGET_INDEX":
      return [
        "Line 1: Integer n",
        "Line 2: n space-separated integers",
        "Line 3: Integer target",
      ];

    case "STRING":
      return [
        "Line 1: Input string",
      ];

    case "INTEGER":
      return [
        "Line 1: Integer n",
      ];
  }
}

export function getOutputFormat(
  pattern: ProblemPattern
): string[] {
  switch (pattern) {
    case "ARRAY":
      return [
        "Print the required answer",
      ];

    case "ARRAY_TARGET_PAIR":
      return [
        "Print the two indices separated by spaces",
      ];

    case "ARRAY_TARGET_INDEX":
      return [
        "Print the index",
      ];

    case "STRING":
      return [
        'Print "true" or "false"',
      ];

    case "INTEGER":
      return [
        "Print the required integer answer",
      ];
  }
}
