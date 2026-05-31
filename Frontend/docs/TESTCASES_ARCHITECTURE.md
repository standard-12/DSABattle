# Testcases Architecture

This document describes how testcases are structured, normalized, validated, and used by the validator and seeder.

Structure of `testcases.json`:
- Root: object `{ "test_cases": [ ... ] }`
- Each test case:
  - `input`: canonical normalized input string (matches `problem.json` `input_format`).
  - `expected_output`: canonical normalized expected output string.
  - `display_input`: original raw string from dataset (for traceability).
  - `display_output`: original raw output string.
  - `visibility`: `PUBLIC` or `PRIVATE` (first 3 public by convention).
  - `order`: integer, contiguous starting at 1.

Normalization rules (implemented in `scripts/converters.ts`):
- Arrays: serialized to space-separated top-level elements. Nested arrays preserved with bracket syntax when needed.
- Scalars: lower-cased where appropriate (`true`/`false`, integers). `None` and `null` normalized to `None`.
- Floating outputs are avoided in supported problems; the generator filters out or rewrites float cases.

Validation checks (what `scripts/validate*` enforce):
- JSON schema for `problem.json` and `testcases.json` via `zod`.
- `order` contiguity and positivity.
- Visibility rules and public-case count.
- Reference solver correctness for `PUBLIC` testcases (where reference solver exists).
- No malformed/ellipsized values (e.g., `...`, `error`) in `input` or `expected_output`.

Seeder expectations (`scripts/seedProblems.ts`):
- Reads `problem.json` & `testcases.json` and upserts into `problems` table.
- Deletes existing `problem_test_cases` for the seeded `problem_id` and reinserts from file.

Debugging tips:
- If `JSON.parse` fails, confirm BOM stripping: all readers call `.replace(/^EFF/, "")`.
- If reference-solver mismatches occur, inspect `display_input`/`display_output` to see formatting vs. canonical forms.

Contact: repository automation scripts maintainers.

Generated May 31, 2026.