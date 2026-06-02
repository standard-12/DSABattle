"use client";

import { useMemo, useState } from "react";

import { DifficultyFilter, type DifficultyFilterValue } from "@/components/problems/DifficultyFilter";
import { ProblemCard } from "@/components/problems/ProblemCard";
import { SearchBar } from "@/components/problems/SearchBar";
import type { ProblemListItem } from "@/types/problem";

type ProblemsListProps = {
  problems: ProblemListItem[];
};

export function ProblemsList({ problems }: ProblemsListProps) {
  const [search, setSearch] = useState("");
  const [difficulty, setDifficulty] =
    useState<DifficultyFilterValue>("ALL");

  const filteredProblems = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return problems.filter((problem) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        problem.title.toLowerCase().includes(normalizedSearch);

      const matchesDifficulty =
        difficulty === "ALL" || problem.difficulty === difficulty;

      return matchesSearch && matchesDifficulty;
    });
  }, [difficulty, problems, search]);

  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 space-y-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Problems
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Browse the problem set, search by title, and filter by difficulty.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <SearchBar value={search} onChange={setSearch} />
          <DifficultyFilter value={difficulty} onChange={setDifficulty} />
        </div>
      </div>

      <div className="space-y-3">
        {filteredProblems.length > 0 ? (
          filteredProblems.map((problem) => (
            <ProblemCard key={problem.id} problem={problem} />
          ))
        ) : (
          <div className="rounded-xl border border-dashed border-border px-6 py-10 text-center">
            <p className="text-base font-medium text-foreground">
              No problems found
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Try a different search term or difficulty filter.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
