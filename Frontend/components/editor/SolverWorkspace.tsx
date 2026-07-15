"use client";

import { useState } from "react";

import { EditorPane, type SubmissionView } from "@/components/workspace/EditorPane";
import type { Language } from "@/types/language";

type SolverWorkspaceProps = {
  problemId: string;
};

export function SolverWorkspace({ problemId }: SolverWorkspaceProps) {
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmissionView | null>(null);

  const handleSubmit = async (code: string, language: Language) => {
    try {
      setSubmitting(true);
      setResult(null);

      const response = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ problemId, sourceCode: code, language }),
      });

      const data = await response.json();
      if (response.ok) {
        setResult({
          verdict: data.verdict,
          passedTestcases: data.passedTestcases ?? 0,
          totalTestcases: data.totalTestcases ?? 0,
          runtimeMs: data.runtimeMs ?? null,
          memoryKb: data.memoryKb ?? null,
          statusDescription: data.statusDescription ?? null,
          compileOutput: data.compileOutput ?? null,
          stderr: data.stderr ?? null,
          failedTestcase: data.failedTestcase ?? null,
        });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <EditorPane onSubmit={handleSubmit} submitting={submitting} result={result} />
  );
}
