function encodeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return String(value);

  const text = String(value);
  // CSV quoting preserves field boundaries. A tab inside a quoted formula-like
  // cell targets Excel's formula handling and changes the exported text. Other
  // spreadsheet programs or an Excel save and reopen can handle it differently.
  const formulaLike = /^[\t\r\n]|^\s*[=+\-@＝＋－＠]/u.test(text);
  const prefix = formulaLike ? "\t" : "";
  return `"${prefix}${text.replaceAll('"', '""')}"`;
}

export function encodeCsvRow(values: readonly unknown[]): string {
  return values.map(encodeCsvCell).join(",");
}
