"use client";

import { useState } from "react";

import { CodeEditor } from "@/components/editor/CodeEditor";
import { LanguageSelector } from "@/components/editor/LanguageSelector";
import { OutputConsole } from "@/components/editor/OutputConsole";
import { RunSubmitButtons } from "@/components/editor/RunSubmitButtons";
import { getStarterCode } from "@/lib/starter-code";
import type { ExecutionResult } from "@/types/execution";
import type { Language } from "@/types/language";
import type { JudgeResult } from "@/lib/judge0/judgeSubmission";

type SolverWorkspaceProps = {
  problemId: string;
};

export function SolverWorkspace({
  problemId,
}: SolverWorkspaceProps) {
  const [language, setLanguage] = useState<Language>("python");
  const [code, setCode] = useState(() => getStarterCode("python"));
  const [isExecuting, setIsExecuting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customInput, setCustomInput] = useState("");

  const [submissionResult, setSubmissionResult] =
    useState<JudgeResult | null>(null);

  const [output, setOutput] = useState<ExecutionResult>({
    stdout: "",
    stderr: "",
    compileOutput: "",
  });

  const handleLanguageChange = (nextLanguage: Language) => {
    setLanguage(nextLanguage);
    setCode(getStarterCode(nextLanguage));
  };

  const handleRun = async () => {
    setIsExecuting(true);

    setOutput({
      stdout: "",
      stderr: "",
      compileOutput: "",
    });

    setSubmissionResult(null);
    try {
      const res = await fetch("/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, language, stdin: customInput, }),
      });

      const data = await res.json();

      if (!res.ok) {
        setOutput({
          stdout: "",
          stderr: data.error || "Execution failed",
          compileOutput: "",
        });
      } else {
        setOutput({
          stdout: data.stdout || "",
          stderr: data.stderr || "",
          compileOutput: data.compileOutput || "",
        });
      }
    } catch (error: any) {
      setOutput({
        stdout: "",
        stderr: error.message || "An unexpected error occurred",
        compileOutput: "",
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);

      setOutput({
        stdout: "",
        stderr: "",
        compileOutput: "",
      });

      setSubmissionResult(null);

      const response = await fetch("/api/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          problemId,
          sourceCode: code,
          language,
        }),
      });

      const result = await response.json();

      setSubmissionResult(result);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="mx-auto w-full max-w-5xl px-4 pb-10 sm:px-6 lg:px-8">
      <div className="space-y-4">
        <LanguageSelector value={language} onChange={handleLanguageChange} />

        <CodeEditor language={language} code={code} onChange={setCode} />
        <div className="space-y-2">
          <label className="text-sm font-medium">
            Custom Input
          </label>

          <textarea
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            placeholder="Enter stdin here..."
            className="scrollbar-thin min-h-[120px] w-full rounded-md border border-border bg-background p-3 font-mono text-sm"
          />
        </div>

        <RunSubmitButtons onRun={handleRun} onSubmit={handleSubmit} isExecuting={isExecuting} isSubmitting={isSubmitting} />

        <OutputConsole result={output} />

        {submissionResult && (
          <div className="rounded-lg border border-border p-4">
            <h3 className="mb-2 text-lg font-semibold">
              Submission Result
            </h3>

            <p>
              <strong>Verdict:</strong>{" "}
              {submissionResult.verdict}
            </p>

            <p>
              <strong>Passed:</strong>{" "}
              {submissionResult.passedTestcases}/
              {submissionResult.totalTestcases}
            </p>

            <p>
              <strong>Runtime:</strong>{" "}
              {submissionResult.runtimeMs ?? "-"} ms
            </p>

            <p>
              <strong>Memory:</strong>{" "}
              {submissionResult.memoryKb ?? "-"} KB
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
