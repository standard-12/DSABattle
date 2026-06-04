import { compareOutputs } from "./compare";
import { executeCode } from "./execute";

export type TestCase = {
    input: string;
    expectedOutput: string;
};

export type JudgeSubmissionParams = {
    sourceCode: string;
    language: "python" | "java" | "cpp";
    testcases: TestCase[];
};

export type JudgeResult = {
    verdict:
    | "ACCEPTED"
    | "WRONG_ANSWER"
    | "RUNTIME_ERROR"
    | "COMPILATION_ERROR"
    | "TIME_LIMIT_EXCEEDED";

    passedTestcases: number;
    totalTestcases: number;

    runtimeMs: number | null;
    memoryKb: number | null;
};

export async function judgeSubmission({
    sourceCode,
    language,
    testcases,
}: JudgeSubmissionParams): Promise<JudgeResult> {
    let passed = 0;

    let maxRuntimeMs = 0;
    let maxMemoryKb = 0;

    for (const testcase of testcases) {
        const result = await executeCode({
            sourceCode,
            language,
            stdin: testcase.input,
        });

        const statusId = result.status.id;

        const outputText =
            `${result.stdout}\n${result.stderr}\n${result.compileOutput}`;

        if (
            outputText.includes("SyntaxError") ||
            outputText.includes("IndentationError")
        ) {
            return {
                verdict: "COMPILATION_ERROR",
                passedTestcases: passed,
                totalTestcases: testcases.length,
                runtimeMs: null,
                memoryKb: null,
            };
        }

        const runtimeMs = result.time
            ? Math.round(Number(result.time) * 1000)
            : null;

        const memoryKb = result.memory ?? null;

        maxRuntimeMs = Math.max(
            maxRuntimeMs,
            runtimeMs ?? 0
        );

        maxMemoryKb = Math.max(
            maxMemoryKb,
            memoryKb ?? 0
        );

        // Time Limit Exceeded
        if (statusId === 5) {
            return {
                verdict: "TIME_LIMIT_EXCEEDED",
                passedTestcases: passed,
                totalTestcases: testcases.length,
                runtimeMs,
                memoryKb,
            };
        }

        // Compilation Error
        if (statusId === 6) {
            return {
                verdict: "COMPILATION_ERROR",
                passedTestcases: passed,
                totalTestcases: testcases.length,
                runtimeMs: null,
                memoryKb: null,
            };
        }

        // Runtime Error
        if (statusId >= 7 && statusId <= 12) {
            return {
                verdict: "RUNTIME_ERROR",
                passedTestcases: passed,
                totalTestcases: testcases.length,
                runtimeMs,
                memoryKb,
            };
        }

        // Unexpected Judge0 status
        if (statusId !== 3) {
            return {
                verdict: "RUNTIME_ERROR",
                passedTestcases: passed,
                totalTestcases: testcases.length,
                runtimeMs,
                memoryKb,
            };
        }

        // Wrong Answer
        const matches = compareOutputs(
            result.stdout,
            testcase.expectedOutput
        );

        if (!matches) {
            return {
                verdict: "WRONG_ANSWER",
                passedTestcases: passed,
                totalTestcases: testcases.length,
                runtimeMs,
                memoryKb,
            };
        }

        passed++;
    }

    return {
        verdict: "ACCEPTED",
        passedTestcases: passed,
        totalTestcases: testcases.length,
        runtimeMs: maxRuntimeMs,
        memoryKb: maxMemoryKb,
    };
}