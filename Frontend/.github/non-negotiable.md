Here are the **important non-negotiables** from the article for building your DSA/judge platform correctly: 

---

# Core Infrastructure

* **Use Ubuntu 22.04, NOT Ubuntu 24**

  * `isolate` (Judge0 sandbox) breaks on Ubuntu 24.
  * If sandbox fails → submissions hang forever.

* **Judge0 must run in a sandboxed Linux environment**

  * isolate uses:

    * namespaces
    * cgroups
    * seccomp
  * This is mandatory for executing untrusted code safely.

* **Self-host Judge0 for student/small platforms**

  * Much cheaper than managed APIs.
  * Judge0 + Docker + Redis + PostgreSQL + worker setup is the standard.

---

# API / Execution

* **Judge0 is asynchronous**

  * `POST /submissions` → returns token
  * Poll `GET /submissions/{token}` until status > 2

* **Always cap polling attempts**

  * Prevent infinite hanging requests.

* **Separate RUN and SUBMIT routes**

  * `Run` = custom stdin execution only
  * `Submit` = execute against all hidden/public test cases

This separation is extremely important architecturally.

---

# Base64 Encoding (VERY IMPORTANT)

* **Base64 encode EVERYTHING**

  * source code
  * stdin
  * stdout/stderr/compile_output

The article explicitly says this is **non-negotiable**.

Reason:

* plain text causes encoding corruption issues
* quotes/newlines/backslashes/non-ASCII chars break requests

---

# Windows Line Ending Fix (SUPER IMPORTANT)

* **Strip `\r\n` before sending stdin**

  * Convert:

    * `\r\n` → `\n`
    * `\r` → `\n`

Without this:

* C++ input parsing silently fails
* causes mysterious Wrong Answers

This is one of the biggest real-world bugs.

---

# Test Case Design (MOST IMPORTANT SYSTEM DESIGN PART)

## You MUST store TWO representations

### Machine format

Actual stdin:

```txt
4
2 7 11 15
9
```

### Human format

Display version:

```txt
nums = [2,7,11,15], target = 9
```

---

## Schema must separate them

Need:

* `input`
* `expectedOutput`
* `displayInput`
* `displayOutput`

Do NOT derive one from the other.

This is a massive design decision.

---

# Public vs Private Test Cases

* Private test cases must NEVER be exposed.
* Only show:

  * pass/fail
* Never reveal:

  * hidden input
  * expected output
  * user output

Otherwise users hardcode solutions.

This is mandatory.

---

# Output Comparison

* Always `.trim()` both outputs before comparing.
* Judge0 adds trailing newline.

Without trimming:

* correct answers fail.

---

# Compile Error Optimization

* If compile error happens:

  * STOP remaining test case execution immediately.

No point continuing.

---

# Monaco Editor + Next.js

* Monaco cannot SSR.
* Must use:

```js
dynamic(..., { ssr: false })
```

Otherwise:

```txt
window is not defined
```

---

# Progress Tracking API

* Use PATCH + conditional updates.
* Use `upsert`.

This avoids:

* separate create/update logic
* null checks
* duplicated records

---

# Idempotent Seeding (VERY IMPORTANT)

Your seed scripts must be safe to run multiple times.

Need:

* `upsert`
* uniqueness checks
* ignore duplicate links safely

Otherwise development becomes painful.

---

# Deployment Non-Negotiables

* Deploy early.
* Local works ≠ production works.

Production reveals:

* Ubuntu compatibility issues
* connection pooling problems
* worker failures
* cold starts

---

# Latency Reality

Sequential execution is acceptable initially:

* 5 test cases = 10–15 sec

Do NOT prematurely optimize.

Only optimize later using:

* batch submissions
* parallel polling
* more workers

---

# Recommended Architecture

```txt
Frontend (Next.js)
        ↓
Backend API
        ↓
Judge0 API
        ↓
Redis Queue
        ↓
Judge0 Worker
        ↓
isolate sandbox
```

---

# Biggest Takeaways

## Absolute must-do items

1. Ubuntu 22.04 only
2. Base64 everything
3. Strip Windows `\r`
4. Separate Run vs Submit
5. Public/private testcase split
6. Two testcase representations
7. Trim outputs before comparison
8. Stop execution on compile error
9. Use idempotent seeds
10. Never expose Judge0 URL to browser

These are the real “you will regret it later if ignored” points from the article.
