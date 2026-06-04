export function normalizeOutput(output: string | null | undefined): string {
  return (output ?? "")
    .replace(/\r\n/g, "\n")
    .trim();
}

export function compareOutputs(
  actual: string | null | undefined,
  expected: string | null | undefined
): boolean {
  return normalizeOutput(actual) === normalizeOutput(expected);
}