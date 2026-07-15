import { compareOutputs } from "./compare";
import { executeCode } from "./execute";

export type TestCase = {
    input: string;
    expectedOutput: string;
    /** PRIVATE testcase output must never be echoed back to the browser. */
    visibility: "PUBLIC" | "PRIVATE";
};

export type JudgeSubmissionParams = {
    sourceCode: string;
    language: "python" | "java" | "cpp";
    testcases: TestCase[];
};

export type Verdict =
    | "ACCEPTED"
    | "WRONG_ANSWER"
    | "RUNTIME_ERROR"
    | "COMPILATION_ERROR"
    | "TIME_LIMIT_EXCEEDED";

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

const MAX_DETAIL_LEN = 2000;

function trim(text: string | null | undefined): string | null {
    const value = (text ?? "").trim();
    if (!value) return null;

    return value.length > MAX_DETAIL_LEN
        ? `${value.slice(0, MAX_DETAIL_LEN)}\n…(truncated)`
        : value;
}

export async function judgeSubmission({
    sourceCode,
    language,
    testcases,
}: JudgeSubmissionParams): Promise<JudgeResult> {
    let passed = 0;

    let maxRuntimeMs = 0;
    let maxMemoryKb = 0;

    for (const [index, testcase] of testcases.entries()) {
        const result = await executeCode({
            sourceCode,
            language,
            stdin: testcase.input,
        });

        const statusId = result.status.id;

        const outputText =
            `${result.stdout}\n${result.stderr}\n${result.compileOutput}`;

        const runtimeMs = result.time
            ? Math.round(Number(result.time) * 1000)
            : null;

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
                preExecution || testcase.visibility === "PUBLIC"
                    ? trim(result.stderr)
                    : null,
            failedTestcase: index + 1,
        });

        // Python reports syntax/indentation errors at runtime, not as a Judge0 compile error.
        if (
            outputText.includes("SyntaxError") ||
            outputText.includes("IndentationError")
        ) {
            return fail("COMPILATION_ERROR", true);
        }

        // Time Limit Exceeded
        if (statusId === 5) return fail("TIME_LIMIT_EXCEEDED", false);

        // Compilation Error
        if (statusId === 6) return fail("COMPILATION_ERROR", true);

        // Runtime Error
        if (statusId >= 7 && statusId <= 12) return fail("RUNTIME_ERROR", false);

        // Unexpected Judge0 status
        if (statusId !== 3) return fail("RUNTIME_ERROR", false);

        // Wrong Answer
        const matches = compareOutputs(
            result.stdout,
            testcase.expectedOutput
        );

        if (!matches) return fail("WRONG_ANSWER", false);

        passed++;
    }

    return {
        verdict: "ACCEPTED",
        passedTestcases: passed,
        totalTestcases: testcases.length,
        runtimeMs: maxRuntimeMs,
        memoryKb: maxMemoryKb,
        statusDescription: "Accepted",
        compileOutput: null,
        stderr: null,
        failedTestcase: null,
    };
}
