export type BoundedIntegerParamOptions = {
  name: string;
  defaultValue: number;
  min?: number;
  max?: number;
};

export type BoundedIntegerParamResult =
  | { ok: true; value: number }
  | { ok: false; error: string };

const INTEGER_RE = /^[+-]?\d+$/;

export function parseBoundedIntegerParam(
  rawValue: string | null,
  options: BoundedIntegerParamOptions,
): BoundedIntegerParamResult {
  const { name, defaultValue, min, max } = options;
  if (rawValue === null) {
    return { ok: true, value: defaultValue };
  }

  const trimmed = rawValue.trim();
  if (!INTEGER_RE.test(trimmed)) {
    return { ok: false, error: `${name} must be an integer` };
  }

  const parsed = Number(trimmed);
  if (!Number.isSafeInteger(parsed)) {
    return { ok: false, error: `${name} must be a safe integer` };
  }

  let value = parsed;
  if (typeof min === "number") value = Math.max(value, min);
  if (typeof max === "number") value = Math.min(value, max);
  return { ok: true, value };
}
