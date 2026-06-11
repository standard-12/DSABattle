"use client";

import Editor from "@monaco-editor/react";

import type { Language } from "@/types/language";

type CodeEditorProps = {
  language: Language;
  code: string;
  onChange: (value: string) => void;
  height?: string;
  className?: string;
};

export function CodeEditor({
  language,
  code,
  onChange,
  height = "420px",
  className = "rounded-xl border border-border shadow-sm",
}: CodeEditorProps) {
  return (
    <div className={`h-full overflow-hidden bg-card ${className}`}>
      <Editor
        height={height}
        language={language}
        theme="vs-dark"
        value={code}
        onChange={(value) => onChange(value ?? "")}
        options={{
          fontSize: 14,
          minimap: { enabled: false },
          automaticLayout: true,
          scrollBeyondLastLine: false,
          tabSize: 4,
          insertSpaces: true,
          wordWrap: "on",
        }}
      />
    </div>
  );
}
