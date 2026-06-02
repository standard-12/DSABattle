import type { ExecutionResult } from "@/types/execution";

type OutputConsoleProps = {
  result: ExecutionResult;
};

function ConsoleSection({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <pre className="min-h-24 whitespace-pre-wrap rounded-lg border border-border/60 bg-background px-3 py-3 text-sm leading-6 text-foreground">
        {value || "No output yet."}
      </pre>
    </div>
  );
}

export function OutputConsole({ result }: OutputConsoleProps) {
  return (
    <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <div className="space-y-5">
        <ConsoleSection label="Stdout" value={result.stdout} />
        <ConsoleSection label="Stderr" value={result.stderr} />
        <ConsoleSection label="Compile Error" value={result.compileOutput} />
      </div>
    </section>
  );
}
