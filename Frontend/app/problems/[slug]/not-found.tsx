import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function ProblemNotFound() {
  return (
    <section className="mx-auto flex min-h-[60vh] w-full max-w-5xl items-center px-4 py-8 sm:px-6 lg:px-8">
      <div className="w-full rounded-xl border border-border bg-card px-6 py-8 text-center shadow-sm">
        <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Problem not found
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground">
          That problem URL does not exist.
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          The slug may be misspelled, outdated, or removed. You can go back to
          the problems list and pick a valid problem from there.
        </p>

        <div className="mt-6">
          <Button asChild>
            <Link href="/problems">Back to Problems</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
