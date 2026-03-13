import "server-only";

import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  getHostedFontBaseUrl,
  normalizeHostedFontBaseUrl,
  rewriteHostedFontCssUrls,
} from "@/lib/fonts/hosted-fonts";

const HOSTED_FONT_TEMPLATE_FILES = [
  join(process.cwd(), "src/styles/cdn-fonts.css"),
  join(process.cwd(), "src/styles/realitease-fonts.css"),
] as const;

export function buildHostedFontsStylesheetFromTemplates(
  templates: readonly string[],
  baseUrl = getHostedFontBaseUrl(),
): string {
  const normalizedBaseUrl = normalizeHostedFontBaseUrl(baseUrl);
  const replacedTemplates = templates.map((template) => rewriteHostedFontCssUrls(template));

  return [
    `/* Hosted fonts stylesheet generated at runtime. Upstream R2 base URL: ${normalizedBaseUrl} */`,
    ...replacedTemplates,
  ].join("\n\n");
}

export function buildHostedFontsStylesheet(baseUrl = getHostedFontBaseUrl()): string {
  const templates = HOSTED_FONT_TEMPLATE_FILES.map((filePath) =>
    readFileSync(filePath, "utf8"),
  );

  return buildHostedFontsStylesheetFromTemplates(templates, baseUrl);
}
