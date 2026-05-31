// This script validates the outputs of reference solutions against the expected outputs defined in testcases.json for each problem. It checks if the reference solver produces the correct output for each test case and reports any discrepancies or issues found during validation.

import path from "path";
import { fileURLToPath } from "url";

import {
  formatActualOutput,
  getReferenceSolver,
  ProblemSchema,
  TestCasesSchema,
  getProblemsRoot,
  readJsonFile,
  readProblemFolders,
  countInvalidSlugs,
  ValidationIssue,
  ValidationSummary,
} from "../lib/validation-utils";

export async function validateReferenceOutputs(
  problemsRoot = getProblemsRoot()
): Promise<ValidationSummary> {
  const folders = await readProblemFolders(problemsRoot);
  const issues: ValidationIssue[] = [];

  for (const folderPath of folders) {
    const slug = path.basename(folderPath);
    const problemPath = path.join(folderPath, "problem.json");
    const testcasesPath = path.join(folderPath, "testcases.json");
    const solver = getReferenceSolver(slug);

    if (!solver) {
      issues.push({
        slug,
        message: "no reference solver registered for this slug",
      });
      continue;
    }

    try {
      const problem = ProblemSchema.parse(await readJsonFile<unknown>(problemPath));
      const testcases = TestCasesSchema.parse(await readJsonFile<unknown>(testcasesPath));

      for (const testCase of testcases.test_cases) {
        const actual = solver.solve(testCase.input);
        const formattedActual = formatActualOutput(solver.pattern, actual);

        if (formattedActual !== testCase.expected_output) {
          issues.push({
            slug,
            message: `testcase #${testCase.order} failed\nExpected: ${testCase.expected_output}\nActual: ${formattedActual}`,
          });
          break;
        }
      }

      void problem;
    } catch (error) {
      issues.push({
        slug,
        message: error instanceof Error ? error.message : "reference validation failed",
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
  const summary = await validateReferenceOutputs();

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
