// This script validates the structure and content of problem folders under data/problems.
// It checks for the presence of problem.json and testcases.json, validates their content against defined schemas, and ensures that example input/output pairs in problem.json match the public test cases in testcases.json.
import path from "path";

import {
  countInvalidSlugs,
  ProblemSchema,
  TestCasesSchema,
  getProblemsRoot,
  readJsonFile,
  readProblemFolders,
  ValidationIssue,
  ValidationSummary,
} from "../lib/validation-utils";
import { validateReferenceOutputs } from "./validateReferenceSolutions";
import { validateTestcaseFiles } from "./validateTestcases";

export async function validateProblemFiles(
  problemsRoot = getProblemsRoot()
): Promise<ValidationSummary> {
  const folders = await readProblemFolders(problemsRoot);
  const issues: ValidationIssue[] = [];
  const slugToFolder = new Map<string, string>();

  for (const folderPath of folders) {
    const slug = path.basename(folderPath);
    const problemPath = path.join(folderPath, "problem.json");
    const testcasesPath = path.join(folderPath, "testcases.json");

    try {
      const rawProblem = await readJsonFile<unknown>(problemPath);
      const rawTestcases = await readJsonFile<unknown>(testcasesPath);
      const problem = ProblemSchema.parse(rawProblem);
      const testcases = TestCasesSchema.parse(rawTestcases);

      if (problem.slug !== slug) {
        issues.push({ slug, message: `slug mismatch: expected ${slug}, found ${problem.slug}` });
      }

      const storedFolder = slugToFolder.get(problem.slug);
      if (storedFolder && storedFolder !== folderPath) {
        issues.push({ slug, message: `duplicate slug across folders: ${storedFolder} and ${folderPath}` });
      } else {
        slugToFolder.set(problem.slug, folderPath);
      }
    } catch (error) {
      issues.push({
        slug,
        message: error instanceof Error ? error.message : "invalid problem.json",
      });
    }
  }

  const valid = folders.length - issues.length;

  return {
    checked: folders.length,
    valid: Math.max(0, valid),
    invalid: issues.length,
    issues,
  };
}

async function main(): Promise<void> {
  const problemsRoot = getProblemsRoot();
  const structureSummary = await validateProblemFiles(problemsRoot);
  const testcaseSummary = await validateTestcaseFiles(problemsRoot);
  const referenceSummary = await validateReferenceOutputs(problemsRoot);
  const combinedIssues = [...structureSummary.issues, ...testcaseSummary.issues, ...referenceSummary.issues];
  const invalid = countInvalidSlugs(combinedIssues);

  console.log(`Scanning ${structureSummary.checked} problems...`);

  for (const issue of combinedIssues) {
    console.log(`❌ ${issue.slug}`);
    console.log(`  ${issue.message}`);
  }

  console.log("Done.");
  console.log(`${Math.max(0, structureSummary.checked - invalid)} valid`);
  console.log(`${invalid} invalid`);

  if (combinedIssues.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
