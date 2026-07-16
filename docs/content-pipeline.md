# Content Pipeline — Problems & Test Cases

How problems get into the database: **discover → generate → validate →
export → seed**. All tooling lives in `Frontend/scripts/` with content in
`Frontend/data/`. (Older, more detailed pipeline notes:
[`Frontend/docs/PROBLEMS_WORKFLOW.md`](../Frontend/docs/PROBLEMS_WORKFLOW.md)
and [`Frontend/docs/TESTCASES_ARCHITECTURE.md`](../Frontend/docs/TESTCASES_ARCHITECTURE.md).)

## Stages

| Stage | Script | Output |
|---|---|---|
| Discover | `scripts/discovery/discoverPatterns.ts` (`npm run discover:problems`) | `data/pattern-discovery-report.json` — which dataset problems have supported input/output patterns |
| Generate | `scripts/generate/generateTopSupportedProblems.ts` (`npm run generate:top-supported`; env `START`, `LIMIT`, `PROBLEMS_ROOT`, `EXISTING_PROBLEMS_PATH`) | `data/problems/<slug>/problem.json` + `testcases.json` |
| Validate | `scripts/validate/*` (`npm run validate`) | non-zero exit on any failure |
| Export | `scripts/seed/exportExistingProblems.ts` (`npm run export:existing-problems`) | `data/existing-problems.json` (used to exclude already-generated slugs) |
| Seed | `scripts/seed/seedProblems.ts` (`npm run seed:problems`) | Upserts `problems` by slug; **deletes + reinserts** that problem's `problem_test_cases` |

Shared helpers in `scripts/lib/`: `converters.ts` (input/output
normalization), `validation-utils.ts` (zod schemas + reference solvers),
`problemPatterns.ts` (slug → pattern map).

The discovery stage reads a LeetCode-style dataset
(`datasets/LeetCodeDataset-v0.3.1-train.jsonl` — **not checked into the
repo**; obtain it separately before running discovery/generation. Seeding the
existing 15 problems does not need it).

## Test case format

Each `testcases.json` is `{ "test_cases": [...] }` where every case carries
**two representations** (see [backend/database.md](backend/database.md)):

```json
{
  "input": "4\n2 7 11 15\n9",          // machine: exact stdin for Judge0
  "expected_output": "0 1",             // machine: exact expected stdout
  "display_input": "nums = [2,7,11,15], target = 9",   // human, shown in UI
  "display_output": "[0,1]",
  "visibility": "PUBLIC",               // first 3 PUBLIC, rest PRIVATE
  "order": 1                            // contiguous from 1
}
```

Never derive one representation from the other — they are produced together
by the generator.

## Validators enforce

- zod schema validity for both JSON files
- `order` contiguity starting at 1
- visibility convention (public-case count)
- reference-solver correctness on PUBLIC cases (solvers in
  `validation-utils.ts`)
- no malformed/ellipsized values (`...`, `error`) in machine fields
- BOM-stripped JSON (all readers strip `﻿`)

## Adding a batch of problems (staging workflow)

```powershell
cd Frontend

# 1. (once) discovery
npm run discover:problems

# 2. refresh the exclusion list
npm run export:existing-problems

# 3. generate N new problems into a staging folder
$env:PROBLEMS_ROOT='data/staging-new'
$env:EXISTING_PROBLEMS_PATH='data/existing-problems.json'
$env:START='0'; $env:LIMIT='10'
npm run generate:top-supported

# 4. validate the staging batch
$env:PROBLEMS_ROOT='data/staging-new'; npm run validate

# 5. review, then seed only the staging batch
$env:PROBLEMS_ROOT='data/staging-new'; npm run seed:problems
```

Notes:
- Seeding uses the service-role client (`lib/supabase/admin.ts`, which loads
  `.env.local` itself) — it writes straight to production data; seed in small
  reviewed batches.
- There is no rollback/audit; reverting a bad seed means manual Supabase
  work.
- Re-seeding the same slug is safe (upsert + testcase rewrite).
