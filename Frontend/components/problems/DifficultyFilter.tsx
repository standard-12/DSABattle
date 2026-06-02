"use client";

import { Button } from "@/components/ui/button";
import type { ProblemDifficulty } from "@/types/problem";

export type DifficultyFilterValue = "ALL" | ProblemDifficulty;

type DifficultyFilterProps = {
  value: DifficultyFilterValue;
  onChange: (value: DifficultyFilterValue) => void;
};

const options: Array<{
  label: string;
  value: DifficultyFilterValue;
}> = [
  { label: "All", value: "ALL" },
  { label: "Easy", value: "EASY" },
  { label: "Medium", value: "MEDIUM" },
  { label: "Hard", value: "HARD" },
];

export function DifficultyFilter({
  value,
  onChange,
}: DifficultyFilterProps) {
  return (
    <div
      className="inline-flex flex-wrap gap-2"
      aria-label="Filter problems by difficulty"
      role="group"
    >
      {options.map((option) => {
        const isActive = value === option.value;

        return (
          <Button
            key={option.value}
            type="button"
            variant={isActive ? "default" : "outline"}
            size="sm"
            onClick={() => onChange(option.value)}
            aria-pressed={isActive}
          >
            {option.label}
          </Button>
        );
      })}
    </div>
  );
}
