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
};

export type JudgeResult = {
  verdict:
    | 'ACCEPTED'
    | 'WRONG_ANSWER'
    | 'RUNTIME_ERROR'
    | 'COMPILATION_ERROR'
    | 'TIME_LIMIT_EXCEEDED';
  passedTestcases: number;
  totalTestcases: number;
  runtimeMs: number | null;
  memoryKb: number | null;
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

async function executeCode(
  sourceCode: string,
  language: SupportedLanguage,
  stdin: string,
): Promise<ExecuteResult> {
  const languageId = LANGUAGE_MAP[language];
  if (!languageId) throw new Error(`Unsupported language: ${language}`);
  if (!config.judge0Url) throw new Error('JUDGE0_URL is missing');

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
    throw new Error(`Failed to submit to Judge0: ${errorText}`);
  }

  const { token } = (await submitResponse.json()) as { token: string };

  const maxPolls = 30;
  const pollInterval = 500;

  for (let i = 0; i < maxPolls; i++) {
    await new Promise((resolve) => setTimeout(resolve, pollInterval));

    const pollResponse = await fetch(
      `${config.judge0Url}/submissions/${token}?base64_encoded=false`,
    );
    if (!pollResponse.ok) continue;

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

  throw new Error('Execution timed out');
}

export async function judgeSubmission(
  sourceCode: string,
  language: SupportedLanguage,
  testcases: TestCase[],
): Promise<JudgeResult> {
  let passed = 0;
  let maxRuntimeMs = 0;
  let maxMemoryKb = 0;

  for (const testcase of testcases) {
    const result = await executeCode(sourceCode, language, testcase.input);
    const statusId = result.status.id;
    const outputText = `${result.stdout}\n${result.stderr}\n${result.compileOutput}`;

    if (outputText.includes('SyntaxError') || outputText.includes('IndentationError')) {
      return { verdict: 'COMPILATION_ERROR', passedTestcases: passed, totalTestcases: testcases.length, runtimeMs: null, memoryKb: null };
    }

    const runtimeMs = result.time ? Math.round(Number(result.time) * 1000) : null;
    const memoryKb = result.memory ?? null;
    maxRuntimeMs = Math.max(maxRuntimeMs, runtimeMs ?? 0);
    maxMemoryKb = Math.max(maxMemoryKb, memoryKb ?? 0);

    if (statusId === 5) {
      return { verdict: 'TIME_LIMIT_EXCEEDED', passedTestcases: passed, totalTestcases: testcases.length, runtimeMs, memoryKb };
    }
    if (statusId === 6) {
      return { verdict: 'COMPILATION_ERROR', passedTestcases: passed, totalTestcases: testcases.length, runtimeMs: null, memoryKb: null };
    }
    if (statusId >= 7 && statusId <= 12) {
      return { verdict: 'RUNTIME_ERROR', passedTestcases: passed, totalTestcases: testcases.length, runtimeMs, memoryKb };
    }
    if (statusId !== 3) {
      return { verdict: 'RUNTIME_ERROR', passedTestcases: passed, totalTestcases: testcases.length, runtimeMs, memoryKb };
    }

    if (!compareOutputs(result.stdout, testcase.expectedOutput)) {
      return { verdict: 'WRONG_ANSWER', passedTestcases: passed, totalTestcases: testcases.length, runtimeMs, memoryKb };
    }

    passed++;
  }

  return { verdict: 'ACCEPTED', passedTestcases: passed, totalTestcases: testcases.length, runtimeMs: maxRuntimeMs, memoryKb: maxMemoryKb };
}
