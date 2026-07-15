import config from '../config';

/**
 * Judge0 integration for battle submissions.
 * Ported from the Next.js `lib/judge0/*` — keep verdict logic in sync.
 */

type SupportedLanguage = 'python' | 'java' | 'cpp';

const LANGUAGE_MAP: Record<SupportedLanguage, number> = {
  python: 71,
  java: 62,
  cpp: 54,
};

export type TestCase = {
  input: string;
  expectedOutput: string;
  /** PRIVATE testcase output must never be echoed back to the browser. */
  visibility: 'PUBLIC' | 'PRIVATE';
};

export type Verdict =
  | 'ACCEPTED'
  | 'WRONG_ANSWER'
  | 'RUNTIME_ERROR'
  | 'COMPILATION_ERROR'
  | 'TIME_LIMIT_EXCEEDED';

export type JudgeResult = {
  verdict: Verdict;
  passedTestcases: number;
  totalTestcases: number;
  runtimeMs: number | null;
  memoryKb: number | null;
  /** Judge0's status text, e.g. "Runtime Error (NZEC)". Safe: contains no input. */
  statusDescription: string | null;
  /** Compiler diagnostics. Safe: compilation happens before any stdin is read. */
  compileOutput: string | null;
  /** Program stderr. Only populated when the failing testcase is PUBLIC. */
  stderr: string | null;
  /** 1-based index of the testcase that failed; null when accepted. */
  failedTestcase: number | null;
};

type ExecuteResult = {
  stdout: string;
  stderr: string;
  compileOutput: string;
  status: { id: number; description: string };
  time: string | null;
  memory: number | null;
};

function normalizeOutput(output: string | null | undefined): string {
  return (output ?? '').replace(/\r\n/g, '\n').trim();
}

function compareOutputs(actual: string | null | undefined, expected: string | null | undefined): boolean {
  return normalizeOutput(actual) === normalizeOutput(expected);
}

const MAX_DETAIL_LEN = 2000;

function trim(text: string | null | undefined): string | null {
  const value = (text ?? '').trim();
  if (!value) return null;
  return value.length > MAX_DETAIL_LEN ? `${value.slice(0, MAX_DETAIL_LEN)}\n…(truncated)` : value;
}

async function executeCode(
  sourceCode: string,
  language: SupportedLanguage,
  stdin: string,
): Promise<ExecuteResult> {
  const languageId = LANGUAGE_MAP[language];
  if (!languageId) throw new Error(`Unsupported language: ${language}`);

  const submitResponse = await fetch(
    `${config.judge0Url}/submissions?base64_encoded=false&wait=false`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source_code: sourceCode,
        language_id: languageId,
        stdin,
        cpu_time_limit: 2,
        wall_time_limit: 5,
        memory_limit: 128000,
      }),
    },
  );

  if (!submitResponse.ok) {
    const errorText = await submitResponse.text();
    console.error(`[Judge0] Submit failed (${submitResponse.status}): ${errorText}`);
    throw new Error(`Failed to submit to Judge0: ${errorText}`);
  }

  const { token } = (await submitResponse.json()) as { token: string };

  const maxPolls = 30;
  const pollInterval = 500;
  let lastPollError: string | null = null;

  for (let i = 0; i < maxPolls; i++) {
    await new Promise((resolve) => setTimeout(resolve, pollInterval));

    const pollResponse = await fetch(
      `${config.judge0Url}/submissions/${token}?base64_encoded=false`,
    );
    if (!pollResponse.ok) {
      const errorText = await pollResponse.text();
      lastPollError = `${pollResponse.status}: ${errorText}`;
      console.error(`[Judge0] Poll failed for token ${token} (attempt ${i + 1}/${maxPolls}): ${lastPollError}`);
      continue;
    }

    const result = (await pollResponse.json()) as {
      status?: { id: number; description: string };
      stdout?: string;
      stderr?: string;
      compile_output?: string;
      time?: string | null;
      memory?: number | null;
    };

    if (result.status && result.status.id >= 3) {
      return {
        stdout: result.stdout ?? '',
        stderr: result.stderr ?? '',
        compileOutput: result.compile_output ?? '',
        status: result.status,
        time: result.time ?? null,
        memory: result.memory ?? null,
      };
    }
  }

  throw new Error(
    lastPollError
      ? `Execution timed out for token ${token} — last poll error: ${lastPollError}`
      : `Execution timed out for token ${token} (Judge0 never reached status >= 3)`,
  );
}

export async function judgeSubmission(
  sourceCode: string,
  language: SupportedLanguage,
  testcases: TestCase[],
): Promise<JudgeResult> {
  let passed = 0;
  let maxRuntimeMs = 0;
  let maxMemoryKb = 0;

  for (const [index, testcase] of testcases.entries()) {
    const result = await executeCode(sourceCode, language, testcase.input);
    const statusId = result.status.id;
    const outputText = `${result.stdout}\n${result.stderr}\n${result.compileOutput}`;

    const runtimeMs = result.time ? Math.round(Number(result.time) * 1000) : null;
    const memoryKb = result.memory ?? null;
    maxRuntimeMs = Math.max(maxRuntimeMs, runtimeMs ?? 0);
    maxMemoryKb = Math.max(maxMemoryKb, memoryKb ?? 0);

    // `preExecution` = the program failed before it ever consumed stdin (compile /
    // parse error), so its diagnostics cannot contain testcase input and are always
    // safe to surface. Otherwise stderr may echo the input in a traceback, so it is
    // only exposed for PUBLIC testcases.
    const fail = (verdict: Verdict, preExecution: boolean): JudgeResult => ({
      verdict,
      passedTestcases: passed,
      totalTestcases: testcases.length,
      runtimeMs: preExecution ? null : runtimeMs,
      memoryKb: preExecution ? null : memoryKb,
      statusDescription: result.status.description,
      compileOutput: trim(result.compileOutput),
      stderr:
        preExecution || testcase.visibility === 'PUBLIC' ? trim(result.stderr) : null,
      failedTestcase: index + 1,
    });

    // Python reports syntax/indentation errors at runtime, not as a Judge0 compile error.
    if (outputText.includes('SyntaxError') || outputText.includes('IndentationError')) {
      return fail('COMPILATION_ERROR', true);
    }

    if (statusId === 5) return fail('TIME_LIMIT_EXCEEDED', false);
    if (statusId === 6) return fail('COMPILATION_ERROR', true);
    if (statusId >= 7 && statusId <= 12) return fail('RUNTIME_ERROR', false);
    if (statusId !== 3) return fail('RUNTIME_ERROR', false);

    if (!compareOutputs(result.stdout, testcase.expectedOutput)) {
      return fail('WRONG_ANSWER', false);
    }

    passed++;
  }

  return {
    verdict: 'ACCEPTED',
    passedTestcases: passed,
    totalTestcases: testcases.length,
    runtimeMs: maxRuntimeMs,
    memoryKb: maxMemoryKb,
    statusDescription: 'Accepted',
    compileOutput: null,
    stderr: null,
    failedTestcase: null,
  };
}
