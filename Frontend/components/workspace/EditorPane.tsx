"use client";

import { useState } from "react";
import { Loader2, Play, Upload } from "lucide-react";

import { CodeEditor } from "@/components/editor/CodeEditor";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { getStarterCode } from "@/lib/starter-code";
import { LANGUAGES, type Language } from "@/types/language";
import type { ExecutionResult } from "@/types/execution";

export type SubmissionView = {
  verdict: string;
  passedTestcases: number;
  totalTestcases: number;
  runtimeMs: number | null;
  memoryKb: number | null;
};

type EditorPaneProps = {
  onSubmit: (code: string, language: Language) => void;
  submitting: boolean;
  result: SubmissionView | null;
  disabled?: boolean;
  disabledNote?: string;
};

const LANGUAGE_ORDER: Language[] = ["python", "java", "cpp"];

export function EditorPane({
  onSubmit,
  submitting,
  result,
  disabled = false,
  disabledNote,
}: EditorPaneProps) {
  const [language, setLanguage] = useState<Language>("python");
  const [code, setCode] = useState(() => getStarterCode("python"));
  const [customInput, setCustomInput] = useState("");
  const [isExecuting, setIsExecuting] = useState(false);
  const [bottomTab, setBottomTab] = useState("testcase");
  const [output, setOutput] = useState<ExecutionResult>({
    stdout: "",
    stderr: "",
    compileOutput: "",
  });

  const handleLanguageChange = (next: Language) => {
    setLanguage(next);
    setCode(getStarterCode(next));
  };

  const handleRun = async () => {
    setIsExecuting(true);
    setOutput({ stdout: "", stderr: "", compileOutput: "" });
    setBottomTab("result");
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
        stderr: error instanceof Error ? error.message : "Unexpected error",
        compileOutput: "",
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const handleSubmit = () => {
    if (disabled) return;
    setBottomTab("result");
    onSubmit(code, language);
  };

  const accepted = result?.verdict === "ACCEPTED";

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Toolbar */}
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="px-1 text-sm font-medium text-emerald-500">Code</span>
          <select
            value={language}
            onChange={(e) => handleLanguageChange(e.target.value as Language)}
            className="rounded-md border border-border bg-card px-2 py-1 text-xs text-foreground outline-none"
          >
            {LANGUAGE_ORDER.map((lang) => (
              <option key={lang} value={lang}>
                {LANGUAGES[lang].label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRun}
            disabled={isExecuting || submitting}
          >
            {isExecuting ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Play className="mr-1.5 h-3.5 w-3.5" />
            )}
            Run
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSubmit}
            disabled={isExecuting || submitting || disabled}
            className="bg-emerald-600 text-white hover:bg-emerald-700"
          >
            {submitting ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Upload className="mr-1.5 h-3.5 w-3.5" />
            )}
            Submit
          </Button>
        </div>
      </div>

      {/* Editor + Console (vertical resizable) */}
      <div className="min-h-0 flex-1">
        <ResizablePanelGroup direction="vertical">
          <ResizablePanel defaultSize={62} minSize={25}>
            <CodeEditor
              language={language}
              code={code}
              onChange={setCode}
              height="100%"
              className=""
            />
          </ResizablePanel>

          <ResizableHandle withHandle />

          <ResizablePanel defaultSize={38} minSize={15}>
            <Tabs
              value={bottomTab}
              onValueChange={setBottomTab}
              className="flex h-full flex-col"
            >
              <TabsList className="mx-3 mt-2 w-fit shrink-0">
                <TabsTrigger value="testcase">Testcase</TabsTrigger>
                <TabsTrigger value="result">Test Result</TabsTrigger>
              </TabsList>

              <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-3 pb-3">
                <TabsContent value="testcase" className="mt-2">
                  <label className="text-xs font-medium text-muted-foreground">
                    Custom stdin
                  </label>
                  <textarea
                    value={customInput}
                    onChange={(e) => setCustomInput(e.target.value)}
                    placeholder="Enter input to test with Run..."
                    className="scrollbar-thin mt-1.5 min-h-[120px] w-full rounded-md border border-border bg-card p-3 font-mono text-sm outline-none"
                  />
                </TabsContent>

                <TabsContent value="result" className="mt-2 space-y-3">
                  {result && (
                    <div className="rounded-lg border border-border bg-card p-3">
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-base font-semibold ${
                            accepted ? "text-emerald-500" : "text-red-500"
                          }`}
                        >
                          {result.verdict.replace(/_/g, " ")}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {result.passedTestcases}/{result.totalTestcases} testcases
                        </span>
                      </div>
                      <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
                        <span>Runtime: {result.runtimeMs ?? "-"} ms</span>
                        <span>Memory: {result.memoryKb ?? "-"} KB</span>
                      </div>
                    </div>
                  )}

                  <ConsoleBlock label="Stdout" value={output.stdout} />
                  <ConsoleBlock label="Stderr" value={output.stderr} tone="error" />
                  {output.compileOutput && (
                    <ConsoleBlock label="Compile Error" value={output.compileOutput} tone="error" />
                  )}

                  {!result && !output.stdout && !output.stderr && (
                    <p className="py-6 text-center text-sm text-muted-foreground">
                      Run your code or submit to see results.
                    </p>
                  )}
                </TabsContent>
              </div>
            </Tabs>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {disabledNote && (
        <div className="shrink-0 border-t border-border px-3 py-2 text-xs italic text-muted-foreground">
          {disabledNote}
        </div>
      )}
    </div>
  );
}

function ConsoleBlock({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "error";
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <pre
        className={`scrollbar-thin max-h-40 overflow-auto whitespace-pre-wrap rounded-md border border-border/60 bg-card px-3 py-2 font-mono text-xs leading-5 ${
          tone === "error" ? "text-red-400" : "text-foreground/90"
        }`}
      >
        {value || "—"}
      </pre>
    </div>
  );
}
