Scripts overview and recommended organization

Current scripts (brief):
- discoverPatterns.ts — dataset pattern discovery
- generateTopSupportedProblems.ts — generate problem folders from discovery report
- generateProblems.ts — alternate generator
- validateProblems.ts — runs all validators
- validateTestcases.ts — testcases validation
- validateReferenceSolutions.ts — reference solver validation
- exportExistingProblems.ts — writes data/existing-problems.json
- seedProblems.ts — seeds Supabase
- converters.ts — input/output normalization helpers
- validation-utils.ts — schemas, reference solvers, utils
- problemPatterns.ts — mapping of slugs to patterns

Recommended future structure (non-breaking):
- `scripts/discovery/*` — discovery scripts
- `scripts/generate/*` — generator scripts
- `scripts/validate/*` — validators
- `scripts/seed/*` — seeding and export
- `scripts/lib/*` — `converters.ts`, `validation-utils.ts`, `problemPatterns.ts`

Migration approach:
1. Create the target folders.
2. Move files one-by-one and update imports.
3. Run `npm run validate` after each move to ensure nothing broke.

For now, this README documents the current state and next steps.
