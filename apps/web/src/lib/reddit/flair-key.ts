const TOKEN_MARKER_RE = /:[^:\s]+:/g;
const LEADING_DECOR_RE = /^[^\p{L}\p{N}]+/u;
const TRAILING_DECOR_RE = /[^\p{L}\p{N}]+$/u;

const collapseWhitespace = (value: string): string => value.replace(/\s+/g, " ").trim();

const stripEdgeDecorators = (value: string): string => {
  let next = value;
  let previous = "";
  while (next !== previous) {
    previous = next;
    next = next.replace(LEADING_DECOR_RE, "").replace(TRAILING_DECOR_RE, "");
  }
  return next;
};

export const toCanonicalFlairKey = (value: string | null | undefined): string => {
  if (typeof value !== "string") return "";
  let next = collapseWhitespace(value).toLowerCase();
  if (!next) return "";
  next = next.replace(TOKEN_MARKER_RE, " ");
  next = collapseWhitespace(next);
  next = stripEdgeDecorators(next);
  next = collapseWhitespace(next);
  return next;
};
