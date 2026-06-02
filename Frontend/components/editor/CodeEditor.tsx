"use client";

import Editor from "@monaco-editor/react";

import type { Language } from "@/types/language";

type CodeEditorProps = {
  language: Language;
  code: string;
  onChange: (value: string) => void;
};

export function CodeEditor({ language, code, onChange }: CodeEditorProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <Editor
        height="420px"
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
