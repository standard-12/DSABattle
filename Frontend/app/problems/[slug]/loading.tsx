export default function ProblemLoading() {
  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="rounded-xl border border-border bg-card px-6 py-6 shadow-sm">
        <div className="h-9 w-64 animate-pulse rounded-md bg-muted" />
        <div className="mt-4 flex gap-2">
          <div className="h-6 w-20 animate-pulse rounded-full bg-muted" />
          <div className="h-6 w-24 animate-pulse rounded-full bg-muted" />
        </div>
        <div className="mt-8 space-y-4">
          <div className="h-5 w-32 animate-pulse rounded-md bg-muted" />
          <div className="h-28 w-full animate-pulse rounded-xl bg-muted/80" />
          <div className="h-5 w-24 animate-pulse rounded-md bg-muted" />
          <div className="h-40 w-full animate-pulse rounded-xl bg-muted/80" />
        </div>
      </div>
    </section>
  );
}
