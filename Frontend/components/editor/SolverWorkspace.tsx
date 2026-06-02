"use client";

import { useMemo, useState } from "react";

import { CodeEditor } from "@/components/editor/CodeEditor";
import { LanguageSelector } from "@/components/editor/LanguageSelector";
import { OutputConsole } from "@/components/editor/OutputConsole";
import { RunSubmitButtons } from "@/components/editor/RunSubmitButtons";
import { getStarterCode } from "@/lib/starter-code";
import type { ExecutionResult } from "@/types/execution";
import type { Language } from "@/types/language";

export function SolverWorkspace() {
  const [language, setLanguage] = useState<Language>("python");
  const [code, setCode] = useState(() => getStarterCode("python"));

  const output = useMemo<ExecutionResult>(
    () => ({
      stdout: "",
      stderr: "",
      compileOutput: "",
    }),
    []
  );

  const handleLanguageChange = (nextLanguage: Language) => {
    setLanguage(nextLanguage);
    setCode(getStarterCode(nextLanguage));
  };

  return (
    <section className="mx-auto w-full max-w-5xl px-4 pb-10 sm:px-6 lg:px-8">
      <div className="space-y-4">
        <LanguageSelector value={language} onChange={handleLanguageChange} />

        <CodeEditor language={language} code={code} onChange={setCode} />

        <RunSubmitButtons />

        <OutputConsole result={output} />
      </div>
    </section>
  );
}
