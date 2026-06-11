"use client";

import { EditorPane, type SubmissionView } from "@/components/workspace/EditorPane";
import type { Language } from "@/types/language";

type BattleWorkspaceProps = {
  onSubmit: (problemId: string, code: string, language: Language) => void;
  problemId: string;
  submitting: boolean;
  result: SubmissionView | null;
  disabled: boolean;
};

export function BattleWorkspace({
  onSubmit,
  problemId,
  submitting,
  result,
  disabled,
}: BattleWorkspaceProps) {
  return (
    <EditorPane
      onSubmit={(code, language) => onSubmit(problemId, code, language)}
      submitting={submitting}
      result={result}
      disabled={disabled}
      disabledNote={disabled ? "This battle has ended — submissions are closed." : undefined}
    />
  );
}
