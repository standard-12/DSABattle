# .github/copilot-instructions.md

## Project Overview

This project is a real-time DSA battle platform where users compete by solving coding problems against each other under time pressure.

The platform is NOT a generic LeetCode clone. The primary product focus is:

* real-time coding battles
* competitive pressure
* matchmaking
* timers
* fast battle flow
* multiplayer experience

The coding execution engine uses Judge0 running locally via Docker inside WSL Ubuntu 22 and exposed through a tunnel (ngrok/Cloudflare Tunnel).

---

# Core Tech Stack

## Frontend + Backend

* Next.js App Router
* TypeScript
* Tailwind CSS

## Database/Auth

* Supabase
* Supabase Auth
* Supabase Realtime

## Execution Engine

* Judge0 CE
* Docker
* WSL Ubuntu 22
* isolate sandbox

## Code Editor

* Monaco Editor

---

# Architecture Rules

## VERY IMPORTANT

Frontend must NEVER communicate directly with Judge0.

Correct flow:

Frontend
→ Next.js API Routes
→ Judge0
→ Return result

All Judge0 orchestration must happen server-side.

---

# Current Product Direction

The platform follows this battle flow:

Login
→ Dashboard
→ Matchmaking Queue
→ Match Found
→ Waiting Room
→ Countdown
→ Battle Starts
→ Run Code
→ Submit Code
→ First Accepted Wins
→ Rating Update

The platform prioritizes:

* battle UX
* low-friction gameplay
* realtime synchronization
* clean execution flow

NOT:

* giant problem libraries
* AI coaching
* collaborative editors
* advanced analytics
* tournaments
* microservices

---

# Current Execution Model

The platform uses RAW STDIN/STDOUT execution.

Users write complete programs.

Example:

```cpp
int main() {

}
```

NOT LeetCode-style function-only execution.

DO NOT implement hidden driver-code injection systems unless explicitly requested.

---

# Supported Languages (Initial MVP)

Only support:

* Python
* C++
* Java

DO NOT add additional languages unless explicitly requested.

---

# Judge0 Rules

Judge0 runs:

* locally
* inside Docker
* inside WSL Ubuntu 22

Judge0 is exposed publicly through a tunnel.

Judge0 API must remain private from the frontend.

Always use:

* base64 encoding
* server-side polling
* strict validation

---

# Database Design Rules

## Existing Tables

* profiles
* matchmaking_queue
* battles
* battle_participants
* submissions
* problems

## Required Table

problem_test_cases

Recommended schema:

* id
* problem_id
* input
* expected_output
* visibility (PUBLIC or PRIVATE)
* order_index
* created_at

---

# Test Case Rules

The platform MUST support:

* public test cases
* private hidden test cases

Private test cases must NEVER be sent to the frontend.

---

# Battle Rules

## MVP Battle Format

* 1 battle = 1 problem
* first accepted submission wins
* battle ends immediately after accepted solution

## Realtime Scope

Use realtime only for:

* matchmaking state
* ready state
* countdown
* battle status
* verdict synchronization
* timer synchronization

DO NOT implement:

* live collaborative editing
* shared cursors
* live typing visibility

---

# Backend Rules

## Required API Routes

### Execute Route

POST /api/execute

Purpose:

* custom stdin execution
* return stdout/stderr

### Submit Route

POST /api/submit

Purpose:

* run hidden test cases
* compare outputs
* return verdict
* persist submission

---

# Run vs Submit Rules

Run:

* custom input
* no persistence required
* no hidden tests
* fast execution

Submit:

* hidden/private test cases
* verdict generation
* persistence
* battle logic
* rating updates

Keep these flows architecturally separate.

---

# Submission Rules

Persist ALL submissions.

Submission records should eventually include:

* code
* language
* verdict
* runtime
* memory
* passed test cases
* total test cases
* battle id
* user id

---

# Timer Rules

Timers must be server-authoritative.

Do NOT rely on client-only timers.

Users refreshing the page should NOT reset timers.

---

# Matchmaking Rules

Initial matchmaking:

* Easy vs Easy
* Medium vs Medium
* Hard vs Hard

No cross-difficulty matchmaking initially.

---

# Waiting Room Rules

The waiting room exists BEFORE battle start.

Flow:
Match Found
→ Waiting Room
→ Both Ready
→ Countdown
→ Battle Start

This is intentional for UX and competitive tension.

---

# UI/UX Philosophy

The platform should feel:

* competitive
* fast
* clean
* focused
* intense

Avoid:

* clutter
* excessive animations
* overly enterprise-looking UI
* unnecessary dashboard complexity

Battle page should prioritize:

* readability
* timer visibility
* problem/editor focus
* low latency interactions

---

# Monaco Editor Rules

Required:

* syntax highlighting
* language switching
* stdin panel
* output console

Do NOT implement:

* AI autocomplete
* collaborative editing
* advanced IDE systems

unless explicitly requested.

---

# Realtime Architecture

Not sure lets see

---

# Security Rules

* Never expose Judge0 URL to frontend.
* Never expose hidden test cases.
* Validate all API payloads.
* Rate-limit execution endpoints.
* Keep execution logic server-side.
* Use authenticated execution flows.

---

# Performance Rules

Do NOT prematurely optimize.

Avoid introducing:

* Kubernetes
* worker clusters
* distributed systems
* advanced caching
* event buses

until the MVP loop works correctly.

Correct priority:

1. Functional gameplay loop
2. Stable execution
3. Good UX
4. Realtime synchronization
5. Scaling later

---

# Code Organization Rules

Prefer:

* small focused components
* reusable service functions
* clean API route separation
* server-side orchestration

Suggested structure:

app/
api/
execute/
submit/
matchmaking/
battle/
dashboard/
onboarding/

components/
battle/
editor/
dashboard/
matchmaking/

lib/
services/
queries/
judge0/

---

# Important Product Philosophy

The platform’s value is NOT code execution itself.

Judge0 already solves execution.

The platform’s real value is:

* competitive coding pressure
* realtime battles
* matchmaking
* fast battle flow
* multiplayer excitement

All implementation decisions should optimize for that experience.
