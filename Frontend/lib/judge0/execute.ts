type SupportedLanguage = "python" | "java" | "cpp";

const LANGUAGE_MAP: Record<SupportedLanguage, number> = {
  python: 71,
  java: 62,
  cpp: 54,
};

// Local Judge0 docker-compose instance (see server/README or CLAUDE.md for setup).
const DOCKER_JUDGE0_URL = "http://localhost:2358";

// AWS_VM_URL wins if set, else JUDGE0_URL override, else the local docker instance.
function resolveJudge0Url(): string {
  return (
    process.env.AWS_VM_URL || process.env.JUDGE0_URL || DOCKER_JUDGE0_URL
  );
}

export type ExecuteCodeParams = {
  sourceCode: string;
  language: SupportedLanguage;
  stdin?: string;
};

export type ExecuteCodeResult = {
  stdout: string;
  stderr: string;
  compileOutput: string;
  status: {
    id: number;
    description: string;
  };
  time: string | null;
  memory: number | null;
};

export async function executeCode({
  sourceCode,
  language,
  stdin = "",
}: ExecuteCodeParams): Promise<ExecuteCodeResult> {
  const languageId = LANGUAGE_MAP[language];

  if (!languageId) {
    throw new Error(`Unsupported language: ${language}`);
  }

  const judge0Url = resolveJudge0Url();

  const submitResponse = await fetch(
    `${judge0Url}/submissions?base64_encoded=false&wait=false`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        source_code: sourceCode,
        language_id: languageId,
        stdin,

        cpu_time_limit: 2,
        wall_time_limit: 5,
        memory_limit: 128000,
      }),
    }
  );

  if (!submitResponse.ok) {
    const errorText = await submitResponse.text();

    throw new Error(
      `Failed to submit to Judge0: ${errorText}`
    );
  }

  const { token } = await submitResponse.json();

  const maxPolls = 30;
  const pollInterval = 500;

  for (let i = 0; i < maxPolls; i++) {
    await new Promise((resolve) =>
      setTimeout(resolve, pollInterval)
    );

    const pollResponse = await fetch(
      `${judge0Url}/submissions/${token}?base64_encoded=false`
    );

    if (!pollResponse.ok) {
      continue;
    }

    const result = await pollResponse.json();

    if (result.status?.id >= 3) {
      return {
        stdout: result.stdout ?? "",
        stderr: result.stderr ?? "",
        compileOutput: result.compile_output ?? "",
        status: result.status,
        time: result.time ?? null,
        memory: result.memory ?? null,
      };
    }
  }

  throw new Error("Execution timed out");
}