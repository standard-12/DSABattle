import "dotenv/config";
import fs from "fs/promises";
import path from "path";
import { supabaseAdmin } from "../lib/supabase/admin";

async function seedProblem(problemDir: string) {
  const problemFile = path.join(problemDir, "problem.json");

  const raw = await fs.readFile(problemFile, "utf8");
  const problem = JSON.parse(raw);

  const { error } = await supabaseAdmin
    .from("problems")
    .upsert(
      {
        title: problem.title,
        slug: problem.slug,
        difficulty: problem.difficulty,

        categories: problem.categories,

        description: problem.description,

        input_format: problem.input_format,
        output_format: problem.output_format,
        constraints: problem.constraints,

        time_limit_ms: 2000,
        memory_limit_kb: 262144,
      },
      {
        onConflict: "slug",
      }
    );

  if (error) {
    throw error;
  }

  console.log(`✅ Seeded ${problem.slug}`);
}

async function main() {
  const problemsRoot = path.join(
    process.cwd(),
    "data",
    "problems"
  );

  const folders = await fs.readdir(problemsRoot, {
    withFileTypes: true,
  });

  for (const folder of folders) {
    if (!folder.isDirectory()) continue;

    await seedProblem(
      path.join(problemsRoot, folder.name)
    );
  }

  console.log("🎉 Done");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});