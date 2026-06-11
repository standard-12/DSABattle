"use client";

import { useState } from "react";

import { CodeEditor } from "@/components/editor/CodeEditor";
import { LanguageSelector } from "@/components/editor/LanguageSelector";
import { OutputConsole } from "@/components/editor/OutputConsole";
import { RunSubmitButtons } from "@/components/editor/RunSubmitButtons";
import { getStarterCode } from "@/lib/starter-code";
import type { ExecutionResult } from "@/types/execution";
import type { Language } from "@/types/language";
import type { BattleSubmissionResult } from "@/hooks/useBattleSocket";

type BattleWorkspaceProps = {
  onSubmit: (problemId: string, code: string, language: Language) => void;
  problemId: string;
  submitting: boolean;
  result: BattleSubmissionResult | null;
  disabled: boolean;
};

export function BattleWorkspace({
  onSubmit,
  problemId,
  submitting,
  result,
  disabled,
}: BattleWorkspaceProps) {
  const [language, setLanguage] = useState<Language>("python");
  const [code, setCode] = useState(() => getStarterCode("python"));
  const [isExecuting, setIsExecuting] = useState(false);
  const [customInput, setCustomInput] = useState("");
  const [output, setOutput] = useState<ExecutionResult>({
    stdout: "",
    stderr: "",
    compileOutput: "",
  });

  const handleLanguageChange = (nextLanguage: Language) => {
    setLanguage(nextLanguage);
    setCode(getStarterCode(nextLanguage));
  };

  // "Run" still uses the stateless practice endpoint — it doesn't affect the battle.
  const handleRun = async () => {
    setIsExecuting(true);
    setOutput({ stdout: "", stderr: "", compileOutput: "" });
    try {
      const res = await fetch("/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, language, stdin: customInput }),
      });
      const data = await res.json();
      if (!res.ok) {
        setOutput({ stdout: "", stderr: data.error || "Execution failed", compileOutput: "" });
      } else {
        setOutput({
          stdout: data.stdout || "",
          stderr: data.stderr || "",
          compileOutput: data.compileOutput || "",
        });
      }
    } catch (error) {
      setOutput({
        stdout: "",
        stderr: error instanceof Error ? error.message : "An unexpected error occurred",
        compileOutput: "",
      });
    } finally {
      setIsExecuting(false);
    }
  };

  // "Submit" goes through the WebSocket battle server, not /api/submit.
  const handleSubmit = () => {
    if (disabled) return;
    onSubmit(problemId, code, language);
  };

  const verdictColor =
    result?.verdict === "ACCEPTED" ? "text-green-500" : "text-red-500";

  return (
    <section className="space-y-4">
      <LanguageSelector value={language} onChange={handleLanguageChange} />

      <CodeEditor language={language} code={code} onChange={setCode} />

      <div className="space-y-2">
        <label className="text-sm font-medium">Custom Input</label>
        <textarea
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          placeholder="Enter stdin here..."
          className="scrollbar-thin min-h-[100px] w-full rounded-md border border-border bg-background p-3 font-mono text-sm"
        />
      </div>

      <RunSubmitButtons
        onRun={handleRun}
        onSubmit={handleSubmit}
        isExecuting={isExecuting}
        isSubmitting={submitting}
      />

      {disabled && (
        <p className="text-sm text-muted-foreground italic">
          This battle has ended — submissions are closed.
        </p>
      )}

      <OutputConsole result={output} />

      {result && (
        <div className="rounded-lg border border-border p-4">
          <h3 className="mb-2 text-lg font-semibold">Submission Result</h3>
          <p>
            <strong>Verdict:</strong>{" "}
            <span className={verdictColor}>{result.verdict}</span>
          </p>
          <p>
            <strong>Passed:</strong> {result.passedTestcases}/{result.totalTestcases}
          </p>
          <p>
            <strong>Runtime:</strong> {result.runtimeMs ?? "-"} ms
          </p>
          <p>
            <strong>Memory:</strong> {result.memoryKb ?? "-"} KB
          </p>
        </div>
      )}
    </section>
  );
}
