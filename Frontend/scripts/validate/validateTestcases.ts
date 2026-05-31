// This script validates the structure and content of testcases.json files under data/problems. It checks for the presence of testcases.json, validates its content against a defined schema, and ensures that the test case orders are contiguous starting from 1.
import path from "path";
import { fileURLToPath } from "url";

import {
  TestCasesSchema,
  TestCaseJson,
  getProblemsRoot,
  readJsonFile,
  readProblemFolders,
  countInvalidSlugs,
  ValidationIssue,
  ValidationSummary,
} from "../lib/validation-utils";

function validateContiguousOrders(testCases: TestCaseJson[]): string | null {
  const sortedOrders = [...testCases.map((testCase) => testCase.order)].sort((left, right) => left - right);

  for (let index = 0; index < sortedOrders.length; index += 1) {
    if (sortedOrders[index] !== index + 1) {
      return `test case order must be contiguous starting at 1 (found ${sortedOrders.join(", ")})`;
    }
  }

  return null;
}

export async function validateTestcaseFiles(
  problemsRoot = getProblemsRoot()
): Promise<ValidationSummary> {
  const folders = await readProblemFolders(problemsRoot);
  const issues: ValidationIssue[] = [];

  for (const folderPath of folders) {
    const slug = path.basename(folderPath);
    const testcasesPath = path.join(folderPath, "testcases.json");

    try {
      const rawTestcases = await readJsonFile<unknown>(testcasesPath);
      const parsed = TestCasesSchema.parse(rawTestcases);
      const orderIssue = validateContiguousOrders(parsed.test_cases);

      if (orderIssue) {
        issues.push({ slug, message: orderIssue });
      }
    } catch (error) {
      issues.push({
        slug,
        message: error instanceof Error ? error.message : "invalid testcases.json",
      });
    }
  }

  const invalid = countInvalidSlugs(issues);

  return {
    checked: folders.length,
    valid: Math.max(0, folders.length - invalid),
    invalid,
    issues,
  };
}

async function main(): Promise<void> {
  const summary = await validateTestcaseFiles();

  console.log(`Scanning ${summary.checked} problems...`);

  for (const issue of summary.issues) {
    console.log(`❌ ${issue.slug}`);
    console.log(`  ${issue.message}`);
  }

  console.log("Done.");
  console.log(`${summary.valid} valid`);
  console.log(`${summary.invalid} invalid`);

  if (summary.invalid > 0) {
    process.exitCode = 1;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}
