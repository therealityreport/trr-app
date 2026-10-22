/** Shared, credential-free settings for browser, Node, and edge runtimes. */
export function sentryEnvironment(
  vercelEnvironment: string | undefined,
  appEnvironment: string | undefined,
  nodeEnvironment: string | undefined,
): string {
  return vercelEnvironment || appEnvironment || nodeEnvironment || "development";
}

export function sentrySampleRate(value: string | undefined, fallback: number): number {
  if (!value?.trim()) return fallback;
  const rate = Number(value);
  return Number.isFinite(rate) && rate >= 0 && rate <= 1 ? rate : fallback;
}

export function sentryEnabled(dsn: string | undefined, nodeEnvironment: string | undefined, optIn: string | undefined): boolean {
  return Boolean(dsn) && (nodeEnvironment === "production" || optIn === "true");
}
