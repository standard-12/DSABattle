"use client";

import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

interface RunSubmitButtonsProps {
  onRun: () => void;
  onSubmit: () => void;

  isExecuting: boolean;
  isSubmitting: boolean;
}

export function RunSubmitButtons({
  onRun,
  onSubmit,
  isExecuting,
  isSubmitting,
}: RunSubmitButtonsProps) {
  return (
    <div className="flex flex-wrap gap-3">
      <Button
        type="button"
        variant="outline"
        onClick={onRun}
        disabled={isExecuting || isSubmitting}
      >
        {isExecuting && (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        )}
        Run
      </Button>

      <Button
        type="button"
        onClick={onSubmit}
        disabled={isExecuting || isSubmitting}
      >
        {isSubmitting && (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        )}
        Submit
      </Button>
    </div>
  );
}