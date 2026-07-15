# Judging Performance & Judge0 Optimization

Reference for how DSA Battle judges submissions, why it is currently slow, and
how to make it fast. Read this before touching `server/src/services/judge0.ts`
or `Frontend/lib/judge0/judgeSubmission.ts`.

> **TL;DR** — The judge is slow because it spawns **one Judge0 sandbox per
> testcase, sequentially**. The fix, in increasing order of effort/payoff, is:
> (1) tune poll timing, (2) **batch API + more workers** (recommended first
> step), (3) **single-process harness** (the true LeetCode approach, but a
> format migration). Judge0 itself is *not* the bottleneck — `print(1)` runs in
> ~0.06s.

---

## 1. How judging works today

There are two judge paths, and they share identical verdict logic (keep them in
sync):

| Path | Entry point | Judge code |
|------|-------------|------------|
| **Practice** | `POST /api/submit` (Next.js) | `Frontend/lib/judge0/judgeSubmission.ts` → `execute.ts` |
| **Battle** | WS `battle_submit` message | `server/src/services/battle.ts` → `server/src/services/judge0.ts` |

Both do the same thing:

```
for each testcase (sequentially):
    POST /submissions?wait=false        → get a token
    poll GET /submissions/:token every 500ms, up to 30x, until status.id >= 3
    compare stdout to expected_output
    on first failure → return that verdict (early exit)
return ACCEPTED
```

Each `POST /submissions` spins up a fresh **`isolate` sandbox** (create box, set
up cgroups, run, tear down). That startup overhead is ~300–800ms **per testcase,
regardless of how fast the code runs**.

### Why it feels like it "hangs"

With **51 testcases** judged one after another:

```
51 × (≈500ms poll floor + submit round-trip + real exec + Judge0 queue time)
≈ 25s absolute minimum, realistically 40–70s
```

During that window the submitter receives **no `submission_result`**, so the UI
spinner sits there. The server is not stuck — it is grinding through 51
sequential sandbox spawns.

> **Note:** the poll loop sleeps `500ms` *before* its first status check, so
> every testcase pays a guaranteed 500ms floor even if the code finished
> instantly. See `executeCode` in both judge files.

---

## 2. What LeetCode actually does (and Judge0's place)

**LeetCode does not use Judge0.** Judge0 is an open-source "run code as a REST
API" service — it is what *we* use. LeetCode, Codeforces, HackerRank each built
their own in-house judges. But they all solve the **same** problem with the
**same building blocks**: a sandbox (to safely run untrusted code), time/memory
limits, a queue, and a worker fleet. There is no secret faster technology — the
latency of sandboxing untrusted code exists for everyone, including LeetCode
(that's why it also shows "Pending… Running…").

Judge0 is essentially a convenient wrapper around `isolate` + Redis (queue) +
Postgres (submission store) + workers. LeetCode's internal judge uses the same
*kind* of pieces, custom-built and heavily optimized.

**The real difference is orchestration, not the engine:**

| | Our setup | LeetCode |
|---|---|---|
| Sandbox spawns per submit | **51** (one per testcase) | **1** (harness runs all cases in one process) |
| Run order | **sequential** | **parallel** across a large warm fleet |
| Worker pool | a couple of workers | thousands, pre-warmed |

Our Judge0 ran `print(1)` in **0.058s** — the engine is fast. The slowness is
entirely in how we drive it.

---

## 3. Optimization options

### Option A — Poll timing tune (cheap, small win)

- **Poll then sleep**, instead of sleep then poll → removes the guaranteed
  500ms floor per testcase.
- Shorten `pollInterval` from 500ms to ~200–250ms.
- Scale Judge0 workers to match CPU cores.

Contained to `executeCode` in both judge files. Worth doing regardless of the
bigger changes below. Does **not** fix the fundamental "51 sequential spawns"
problem — it just trims the per-spawn overhead.

### Option B — Judge0 batch API + parallel workers (RECOMMENDED first step)

Judge0 has a **batch endpoint** built for exactly this. Submit all testcases in
one HTTP call, let the worker pool run them **in parallel**, poll them together.

```
POST /submissions/batch?base64_encoded=false
  body: { "submissions": [ {…tc1…}, {…tc2…}, … 51 … ] }
  → returns [ { "token": "t1" }, { "token": "t2" }, … ]

GET /submissions/batch?tokens=t1,t2,…&base64_encoded=false&fields=status,stdout,stderr,time,memory
  → poll until every submission has status.id >= 3
```

Two speedups stack:

1. **One round-trip** to submit + one poll loop for the whole batch — stop
   paying per-testcase HTTP and the 500ms pre-sleep 51 times.
2. **Parallelism.** With N workers, N testcases run at once. Judge0 defaults to
   few workers — scale them:
   ```bash
   docker compose up -d --scale workers=6
   ```
   (Match to available CPU cores; each worker ≈ one core under load.)

**Result:** a 51-testcase judge drops from ~40–70s to a **few seconds**.

**Tradeoff — loses early-exit.** Batch runs all 51 even if #1 is wrong. For a
battle judge that's usually fine (you want the full pass count anyway). To keep
some early-exit, **chunk**: submit 10, check, submit the next 10, etc.

**Scope of change:** `executeCode` / `judgeSubmission` in
`server/src/services/judge0.ts` and `Frontend/lib/judge0/judgeSubmission.ts`,
plus a `--scale workers` on the compose. **Problem format stays the same
(stdin/stdout).** Verdict logic and the private-testcase stderr gating must stay
identical to today.

### Option C — Single-process harness (the true LeetCode approach)

The fastest possible: **one sandbox spawn for all testcases.** Judge0 has **no
endpoint for this** — its only primitive is "one `source_code` + one `stdin` →
one run." The harness is **code you assemble and inject into the `source_code`
yourself**; Judge0 runs it as one ordinary submission.

You concatenate the user's solution with a **driver** that loops over all
testcases in-process, feed all inputs via stdin (delimited), and parse the
combined stdout back into per-testcase verdicts.

Python example:

```python
# ---- user's submitted solution ----
class Solution:
    def twoSum(self, nums, target): ...

# ---- driver appended by us ----
import sys, json
_data = json.loads(sys.stdin.read())        # all 51 testcases in one payload
_sol = Solution()
for _tc in _data:
    try:
        _out = _sol.twoSum(*_tc["args"])
        print("__OK__" + json.dumps(_out))
    except Exception as e:
        print("__ERR__" + type(e).__name__)
```

One submission → one spawn → 51 in-memory iterations. Split stdout on the
`__OK__`/`__ERR__` markers and compare each to expected.

**Why this is a real project, not a flag:**

1. **Requires the function-signature model, not raw stdin.** To loop N times in
   one process the driver must *call a function* N times. Our problems currently
   pipe stdin → the user's `main` → compare stdout; you cannot cleanly re-run a
   stdin-reading `main` 51 times in one process. So problems must be
   restructured so the user implements a **method** (e.g. `twoSum(nums, target)`)
   that the driver calls. That means: new testcase storage (args + expected
   return, not stdin/stdout blobs), new starter code, and **re-seeding all 15
   existing problems**.
2. **A driver template per language** (Python/Java/C++), each with correct
   arg-marshalling and error markers. C++/Java are fiddlier than Python.

**Tradeoffs inherited (LeetCode lives with these too):**

- **Shared process = shared blast radius.** Testcase 1 infinite-looping or
  segfaulting kills the whole run; you lose cases 2–51. The driver must catch
  per-case exceptions, and a hard crash/TLE still takes everything down.
- **Per-testcase time limits get fuzzy.** Judge0 enforces one wall/CPU limit on
  the *whole* harness, not per case. Set a larger total budget and optionally
  time each case inside the driver.
- **Global-state leakage** between cases (a solution mutating a class variable
  can pass/fail differently than in isolation).
- **Error attribution is on us** — the driver's markers are the only way to know
  *which* case failed, since Judge0 sees one program.

---

## 4. Recommendation & roadmap

1. **Now:** Option B (batch API + `--scale workers`). ~90% of the speedup for a
   fraction of the effort. Keeps the stdin/stdout problem format. Optionally
   fold in Option A's poll-timing tweak while you're in `executeCode`.
2. **Later (if you want LeetCode-grade latency):** Option C. Treat it as a
   format migration — new problem schema, per-language drivers, re-seed. Do it
   deliberately, not as a quick patch.

**Invariants that must survive any change** (see `CLAUDE.md`):

- Private testcases (`visibility = 'PRIVATE'`) must **never** reach the browser.
  `stderr` is only surfaced for PUBLIC testcases or pre-execution
  (compile/parse) errors — preserve the `fail(verdict, preExecution)` gating.
- The frontend never calls Judge0 directly — only via `/api/execute`,
  `/api/submit`, or the WS server.
- The service-role Supabase client (used to fetch private testcases) must never
  be exposed on the browser.
- Keep verdict logic identical between the two judge files.

---

## 5. Judge0 quick reference

- **Submit (async):** `POST /submissions?base64_encoded=false&wait=false` → `{ token }`
- **Poll one:** `GET /submissions/:token?base64_encoded=false&fields=...`
- **Submit batch:** `POST /submissions/batch?base64_encoded=false` with `{ "submissions": [...] }`
- **Poll batch:** `GET /submissions/batch?tokens=t1,t2,...&base64_encoded=false&fields=...`
- **Expose the internal-error reason:** add `&fields=*` — surfaces the `message`
  field Judge0 omits by default (this is how we diagnosed the cgroup issue:
  `"No such file or directory @ rb_sysopen - /box/script.py"`).
- **Statuses:** `1` In Queue · `2` Processing · `3` Accepted · `4` Wrong Answer ·
  `5` Time Limit Exceeded · `6` Compilation Error · `7–12` Runtime Errors ·
  `13` Internal Error. Poll until `status.id >= 3`.
- **`wait=true` is unreliable** for slow submissions — it holds the HTTP
  connection open for the whole run and trips client/proxy timeouts. Always use
  async submit + token polling in application code; `wait=true` is only a curl
  convenience.
- **Judge0 URL resolution** (both judge files): `AWS_VM_URL` → `JUDGE0_URL` →
  `http://localhost:2358` (local docker fallback).

### Language IDs in use

| Language | `language_id` |
|----------|---------------|
| Python (3.8.1) | 71 |
| Java | 62 |
| C++ | 54 |
