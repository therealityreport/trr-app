export function extractPrefixedPathSegment(
  pathname: string | null | undefined,
  segmentIndex: number,
  prefix: string,
): string | undefined {
  if (typeof pathname !== "string") {
    return undefined;
  }

  const segments = pathname
    .split("/")
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);
  const segment = segments[segmentIndex];
  if (!segment) {
    return undefined;
  }

  if (!segment.toLowerCase().startsWith(prefix.toLowerCase())) {
    return undefined;
  }

  const normalizedValue = segment.slice(prefix.length);
  return /^[0-9]{1,3}$/.test(normalizedValue) ? normalizedValue : undefined;
}
