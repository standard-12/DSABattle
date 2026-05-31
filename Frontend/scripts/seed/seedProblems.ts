import fs from "fs/promises";
import path from "path";
import { supabaseAdmin } from "../../lib/supabase/admin";

async function seedTestCases(
  problemId: string,
  problemDir: string
) {
  const testCasesFile = path.join(
    problemDir,
    "testcases.json"
  );

  const raw = await fs.readFile(
    testCasesFile,
    "utf8"
  );

  if (!raw.trim()) {
    console.log(
      `⏭️ Skipping empty file: ${testCasesFile}`
    );
    return;
  }

  const data = JSON.parse(raw.replace(/^\uFEFF/, ""));

  await supabaseAdmin
    .from("problem_test_cases")
    .delete()
    .eq("problem_id", problemId);

  const testCases = data.test_cases.map(
    (testCase: any) => ({
      problem_id: problemId,

      input: testCase.input,
      expected_output:
        testCase.expected_output,

      display_input:
        testCase.display_input,

      display_output:
        testCase.display_output,

      visibility:
        testCase.visibility,

      order_index:
        testCase.order,
    })
  );

  const { error } = await supabaseAdmin
    .from("problem_test_cases")
    .insert(testCases);

  if (error) {
    throw error;
  }

  console.log(
    `✅ Seeded ${testCases.length} test cases`
  );
}

async function seedProblem(
  problemDir: string
) {
  const problemFile = path.join(
    problemDir,
    "problem.json"
  );

  const raw = await fs.readFile(
    problemFile,
    "utf8"
  );

  if (!raw.trim()) {
    console.log(
      `⏭️ Skipping empty file: ${problemFile}`
    );
    return;
  }

  const problem = JSON.parse(raw.replace(/^\uFEFF/, ""));

  const { data, error } =
    await supabaseAdmin
      .from("problems")
      .upsert(
        {
          title: problem.title,
          slug: problem.slug,

          difficulty:
            problem.difficulty,

          categories:
            problem.categories,

          description:
            problem.description,

          input_format:
            problem.input_format,

          output_format:
            problem.output_format,

          constraints:
            problem.constraints,

          time_limit_ms: 2000,
          memory_limit_kb: 262144,
        },
        {
          onConflict: "slug",
        }
      )
      .select()
      .single();

  if (error) {
    throw error;
  }

  console.log(
    `✅ Seeded ${problem.slug}`
  );

  await seedTestCases(
    data.id,
    problemDir
  );
}

async function main() {
  const problemsRoot = path.join(
    process.cwd(),
    process.env.PROBLEMS_ROOT ?? path.join("data", "problems")
  );

  const folders = await fs.readdir(
    problemsRoot,
    {
      withFileTypes: true,
    }
  );

  for (const folder of folders) {
    if (!folder.isDirectory())
      continue;

    await seedProblem(
      path.join(
        problemsRoot,
        folder.name
      )
    );
  }

  console.log("🎉 Done");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
