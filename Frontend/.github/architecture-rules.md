# .github/architecture-rules.md

# DSA Battle Platform — Architecture Rules

This document defines NON-NEGOTIABLE architecture and infrastructure decisions for the project.

These rules exist to:

* prevent architectural drift
* avoid repeated engineering mistakes
* preserve system consistency
* document important Judge0 constraints
* guide future contributors and AI agents

If implementation conflicts with this document, this document takes priority unless explicitly changed.

---

# 1. Core Product Identity

This platform is NOT a generic LeetCode clone.

The primary product focus is:

* real-time coding battles
* competitive pressure
* fast matchmaking
* multiplayer gameplay
* realtime battle synchronization

The platform should feel:

* intense
* fast
* competitive
* minimal
* focused

The product value is NOT code execution itself.

Judge0 already solves execution.

The platform’s value is:

* battle experience
* pressure
* realtime competition
* matchmaking
* fast gameplay loop

---

# 2. Current Architecture

Current architecture:

Frontend (Next.js)
→ Next.js API Routes
→ Judge0
→ Docker
→ isolate sandbox

Judge0 runs:

* locally
* inside Docker
* inside WSL Ubuntu 22

Judge0 is exposed publicly through:

* ngrok
  OR
* Cloudflare Tunnel

Frontend must NEVER directly communicate with Judge0.

All Judge0 communication must happen server-side.

---

# 3. Judge0 Version

Current required version:

* Judge0 CE v1.13.1

Reason:

* fixes CVE-2024-28185
* fixes CVE-2024-28189
* fixes CVE-2024-29021

Do NOT downgrade Judge0 unless explicitly required.

---

# 4. Operating System Requirements

Judge0 must run on:

* Ubuntu 22.04

NOT Ubuntu 24.

Reason:
isolate compatibility and Linux kernel/cgroup issues.

This requirement is based on real deployment failures observed in production systems.

---

# 5. Docker Rules

Judge0 must always run inside Docker.

Reasons:

* isolated services
* reproducible environment
* official Judge0 support
* simpler scaling later
* safer execution environment

Expected container stack:

* Judge0 API
* Judge0 workers
* Redis
* PostgreSQL
* isolate sandbox

Do NOT manually install Judge0 services directly on the host machine.

---

# 6. Sandbox Rules

The execution environment relies on:

* isolate
* Linux namespaces
* cgroups
* seccomp

Purpose:

* safely execute untrusted user code
* enforce resource limits
* prevent host access
* prevent abuse

Never bypass sandboxing.

Never execute user code directly on the host machine.

---

# 7. Execution Model

The platform uses RAW STDIN/STDOUT execution.

Users write complete programs.

Example:

```cpp
int main() {

}
```

NOT LeetCode-style function-only execution.

Do NOT implement hidden driver-code injection systems unless explicitly requested.

Reason:

* simpler MVP
* easier debugging
* language-independent
* faster implementation
* lower infrastructure complexity

---

# 8. Supported Languages (MVP)

Only support:

* Python
* C++
* Java

Do NOT add more languages unless explicitly requested.

Each additional language increases:

* infrastructure complexity
* testing complexity
* maintenance burden

---

# 9. Judge0 API Rules

Judge0 uses asynchronous execution.

Flow:

POST /submissions
→ returns token

GET /submissions/{token}
→ poll until completion

Execution status:
1 = In Queue
2 = Processing
3 = Accepted
4 = Wrong Answer
5 = Time Limit Exceeded
6 = Compilation Error
11+ = Runtime Errors

Execution APIs must poll until:
status.id > 2

Always cap polling attempts.

Never poll indefinitely.

---

# 10. Base64 Encoding Rules

Base64 encoding is MANDATORY.

Always base64 encode:

* source_code
* stdin

Always base64 decode:

* stdout
* stderr
* compile_output

Reason:
plain text execution payloads cause:

* escaping issues
* encoding corruption
* newline problems
* Unicode bugs

This is non-negotiable.

---

# 11. Windows Line Ending Rules

Before encoding stdin:

Convert:

* \r\n → \n
* \r → \n

Reason:
Windows line endings break Linux stdin parsing.

Without normalization:

* cin failures occur silently
* wrong answers appear randomly
* debugging becomes extremely difficult

Always normalize stdin before Judge0 submission.

---

# 12. Run vs Submit Architecture

Run and Submit are DIFFERENT systems.

They must remain separate routes.

---

## Run

Purpose:

* quick testing
* custom input
* fast feedback

Behavior:

* execute once
* no hidden tests
* no persistence required

Route:
POST /api/execute

---

## Submit

Purpose:

* official judging
* hidden test execution
* verdict generation
* battle progression

Behavior:

* loops through test cases
* compares outputs
* persists submission

Route:
POST /api/submit

Never merge these systems together.

---

# 13. Test Case Architecture

Test cases MUST support:

* machine representation
* human-readable representation

These are separate concepts.

Required fields:

* input
* expectedOutput
* displayInput
* displayOutput
* visibility

Example:

input:
4
2 7 11 15
9

displayInput:
nums = [2,7,11,15], target = 9

These fields must NEVER be derived from each other automatically.

They are manually authored separately.

---

# 14. Public vs Private Test Cases

The platform MUST support:

* PUBLIC test cases
* PRIVATE hidden test cases

PRIVATE test cases must NEVER be exposed to the frontend.

On submission failure:

* only PUBLIC test cases may expose:

  * input
  * expected output
  * actual output

Reason:
prevent hardcoded solutions.

---

# 15. Output Comparison Rules

Always trim outputs before comparison.

Required:
stdout.trim()
expectedOutput.trim()

Reason:
Judge0 appends trailing newlines.

Without trimming:
false Wrong Answers occur.

---

# 16. Compilation Error Handling

If compilation fails:

* immediately stop remaining test case execution

Reason:
every remaining test case would fail identically.

Avoid wasting Judge0 resources.

---

# 17. Submission Execution Strategy

Current MVP strategy:

* sequential execution
* stop on first failure

Reason:

* simpler orchestration
* cheaper infrastructure usage
* acceptable for MVP scale

Do NOT prematurely optimize.

---

# 18. Known Future Optimizations

NOT required initially:

* Judge0 batch submissions
* parallel polling
* worker scaling
* distributed execution
* result caching

These are future optimizations only.

Do not implement before actual bottlenecks appear.

---

# 19. Monaco Editor Rules

Monaco Editor must use:

* dynamic import
* SSR disabled

Reason:
Monaco is browser-only.

Direct server rendering causes:
ReferenceError: window is not defined

Required pattern:
dynamic import with:
{ ssr: false }

---

# 20. Realtime Rules

Use Supabase Realtime initially.

Realtime scope is LIMITED to:

* matchmaking state
* ready state
* countdown synchronization
* battle status
* verdict synchronization
* timer synchronization

Do NOT implement:

* collaborative editing
* shared cursors
* live typing visibility

Reason:
massive complexity increase with low MVP value.

---

# 21. Battle Rules

Current MVP battle structure:

* 1 battle = 1 problem
* first accepted solution wins
* battle ends immediately

Battle states:

* WAITING
* COUNTDOWN
* ACTIVE
* ENDED

Timers must be server-authoritative.

Refreshing the page must NOT reset timers.

---

# 22. Matchmaking Rules

Initial matchmaking:

* Easy vs Easy
* Medium vs Medium
* Hard vs Hard

No cross-difficulty matchmaking initially.

Waiting room flow:
Match Found
→ Waiting Room
→ Both Ready
→ Countdown
→ Battle Start

This is intentional for UX and tension-building.

---

# 23. Database Rules

Persist ALL submissions.

Submission records should eventually include:

* code
* language
* verdict
* runtime
* memory
* passed testcases
* total testcases
* battle id
* user id

Test cases must cascade delete from problems.

Use idempotent seed scripts whenever possible.

---

# 24. Seeding Rules

Seed scripts must be idempotent.

Requirements:

* safe to rerun
* avoid duplicates
* use upserts
* tolerate existing records

Reason:
development databases reset frequently.

---

# 25. Deployment Philosophy

Deploy early.

Production-only issues:

* connection pooling
* cold starts
* Judge0 networking
* Linux compatibility
* tunnel issues

cannot be discovered locally.

Do not wait for feature completion before deployment testing.

---

# 26. Scaling Philosophy

Do NOT prematurely introduce:

* Kubernetes
* microservices
* Kafka
* Redis pub/sub
* worker clusters
* distributed systems

Correct priority:

1. Functional gameplay loop
2. Stable Judge0 execution
3. Good battle UX
4. Realtime synchronization
5. Scaling later

Premature scaling architecture is considered a project anti-pattern.
