import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import {
  ARTICLES,
  CONTENT_BLOCK_TYPE_IDS,
  type ContentBlock,
} from "./design-docs-config.ts";
import { getReusableUiPrimitive } from "./design-docs-ui-primitives";
import type {
  A11yAuditFinding,
  A11yAuditResult,
  AuditCheckResult,
  AuditResult,
  IntegrationFailure,
  IntegrationTestResult,
} from "./design-docs-pipeline-types.ts";

const execFileAsync = promisify(execFile);
const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.resolve(MODULE_DIR, "../../../");
const DEFAULT_CONFIG_PATH = path.join(APP_ROOT, "src/lib/admin/design-docs-config.ts");
const DEFAULT_CHART_DATA_PATH = path.join(APP_ROOT, "src/components/admin/design-docs/chart-data.ts");
const DEFAULT_ARTICLE_DETAIL_PATH = path.join(APP_ROOT, "src/components/admin/design-docs/ArticleDetailPage.tsx");
const BRAND_SECTION_DIR = path.join(APP_ROOT, "src/components/admin/design-docs/sections");

type DesignDocsRecord = {
  id: string;
  title: string;
  url: string;
  authors: readonly string[];
  date: string;
  section: string;
  type: string;
  ogImage?: string;
  fonts?: ReadonlyArray<{ name: string; usedIn?: unknown; weights?: unknown }>;
  colors?: Record<string, unknown>;
  contentBlocks?: readonly ContentBlock[];
  chartTypes?: readonly unknown[];
  quoteSections?: readonly unknown[];
  architecture?: Record<string, unknown>;
};

type AuditInput = {
  articleId: string;
  articles?: readonly DesignDocsRecord[];
  contentBlockTypeIds?: readonly string[];
  articleDetailPageSource?: string;
  chartDataSource?: string;
  typecheckRunner?: () => Promise<{ passed: boolean; details: string[] }>;
};

type A11yAuditInput = {
  articleId: string;
  brandSlug: string;
  fileSources: Array<{ path: string; content: string }>;
};

type IntegrationInput = {
  articles?: readonly DesignDocsRecord[];
  articleDetailPageSource?: string;
  chartDataSource?: string;
  sectionSourceOverrides?: Record<string, string>;
};

function createCheck(
  name: string,
  status: AuditCheckResult["status"],
  message?: string,
  details?: string[],
): AuditCheckResult {
  return { name, status, message, details };
}

function stableJson(value: unknown): string {
  return JSON.stringify(value);
}

function toDesignDocsRecords(values: readonly unknown[]): readonly DesignDocsRecord[] {
  return values as readonly DesignDocsRecord[];
}

function getArticleCollection(articles?: readonly DesignDocsRecord[]) {
  return articles ?? toDesignDocsRecords(ARTICLES);
}

function findArticleById(articleId: string, articles?: readonly DesignDocsRecord[]) {
  return getArticleCollection(articles).find((article) => article.id === articleId) ?? null;
}

function isNytInteractiveArticle(article: DesignDocsRecord) {
  return article.url.includes("nytimes.com/interactive/");
}

function getContentBlockArray(article: DesignDocsRecord) {
  return article.contentBlocks ?? [];
}

function getSocialImages(article: DesignDocsRecord) {
  const architecture = article.architecture as
    | { publicAssets?: { socialImages?: readonly unknown[] } }
    | undefined;
  return architecture?.publicAssets?.socialImages ?? [];
}

function extractRendererBlockTypes(source: string): Set<string> {
  const result = new Set<string>();
  const matcher = /block\.type === "([^"]+)"/g;

  for (const match of source.matchAll(matcher)) {
    result.add(match[1]);
  }

  return result;
}

function extractExportedConstants(source: string): Set<string> {
  const result = new Set<string>();
  const matcher = /export const ([A-Z0-9_]+)/g;

  for (const match of source.matchAll(matcher)) {
    result.add(match[1]);
  }

  return result;
}

function extractQuotedMapKeys(source: string, constantName: string): Set<string> {
  const match = source.match(new RegExp(`const ${constantName}[\\s\\S]*?=\\s*\\{([\\s\\S]*?)\\n\\};`));
  if (!match) {
    return new Set();
  }

  return new Set(Array.from(match[1].matchAll(/"([^"]+)"\s*:/g), (entry) => entry[1]));
}

function extractIdentifierMapKeys(source: string, constantName: string): Set<string> {
  const match = source.match(new RegExp(`const ${constantName}[\\s\\S]*?=\\s*\\{([\\s\\S]*?)\\n\\};`));
  if (!match) {
    return new Set();
  }

  return new Set(
    Array.from(match[1].matchAll(/^\s*([A-Za-z0-9_]+)\s*:/gm), (entry) => entry[1]).filter(
      (entry) => entry.toUpperCase() !== entry,
    ),
  );
}

function validateDocumentOrder(contentBlocks: readonly ContentBlock[]) {
  const issues: string[] = [];
  const headerIndex = contentBlocks.findIndex((block) => block.type === "header");
  const bylineIndex = contentBlocks.findIndex((block) => block.type === "byline");
  const authorBioIndex = contentBlocks.findIndex((block) => block.type === "author-bio");

  if (headerIndex === -1) {
    issues.push("contentBlocks is missing the required header block");
  }

  if (bylineIndex === -1) {
    issues.push("contentBlocks is missing the required byline block");
  }

  if (headerIndex >= 0 && bylineIndex >= 0 && headerIndex > bylineIndex) {
    issues.push("header must appear before byline in contentBlocks");
  }

  if (authorBioIndex >= 0 && authorBioIndex < contentBlocks.length - 2) {
    issues.push("author-bio should be the last or near-last content block");
  }

  for (let index = 1; index < contentBlocks.length; index += 1) {
    const current = contentBlocks[index];
    const previous = contentBlocks[index - 1];
    if (current.type === previous.type && current.type !== "subhed") {
      issues.push(`duplicate adjacent ${current.type} blocks at positions ${index - 1} and ${index}`);
    }
  }

  return issues;
}

function getInteractiveBlockCount(contentBlocks: readonly ContentBlock[]) {
  const interactiveTypes = new Set([
    "ai2html",
    "birdkit-chart",
    "birdkit-table",
    "birdkit-table-interactive",
    "datawrapper-table",
    "datawrapper-chart",
    "filter-card-tracker",
    "tariff-rate-arrow-chart",
    "tariff-rate-table",
    "tariff-country-table",
  ]);

  return contentBlocks.filter((block) => interactiveTypes.has(block.type)).length;
}

function validateChartBindings(
  article: DesignDocsRecord,
  articleDetailPageSource: string,
  chartDataSource: string,
) {
  const issues: string[] = [];
  const chartDataExports = extractExportedConstants(chartDataSource);
  const datawrapperTableIds = extractIdentifierMapKeys(articleDetailPageSource, "DW_TABLE_MAP");
  const medalTableTitles = extractQuotedMapKeys(articleDetailPageSource, "MEDAL_TABLE_MAP");

  for (const block of article.contentBlocks ?? []) {
    if (block.type === "birdkit-chart") {
      if (!chartDataExports.has("STATE_TAX_GAMBLING_DATA") || !/STATE_TAX_GAMBLING_DATA/.test(articleDetailPageSource)) {
        issues.push(`birdkit-chart block "${block.title}" has no exported data constant wired in ArticleDetailPage`);
      }
    }

    if (block.type === "birdkit-table" && !medalTableTitles.has(block.title)) {
      issues.push(`birdkit-table block "${block.title}" is missing from MEDAL_TABLE_MAP`);
    }

    if (block.type === "birdkit-table-interactive") {
      if (!chartDataExports.has("MEDAL_TABLE_CHOOSE") || !/MEDAL_TABLE_CHOOSE/.test(articleDetailPageSource)) {
        issues.push(`birdkit-table-interactive block "${block.title}" is missing MEDAL_TABLE_CHOOSE wiring`);
      }
    }

    if (block.type === "datawrapper-table" && !datawrapperTableIds.has(block.id)) {
      issues.push(`datawrapper-table block "${block.id}" is missing from DW_TABLE_MAP`);
    }
  }

  return issues;
}

async function defaultTypecheckRunner() {
  const binary = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
  try {
    const { stdout, stderr } = await execFileAsync(binary, ["run", "typecheck"], {
      cwd: APP_ROOT,
      maxBuffer: 10 * 1024 * 1024,
    });
    return {
      passed: true,
      details: [stdout, stderr].filter(Boolean).map((entry) => entry.trim()).filter(Boolean),
    };
  } catch (error) {
    const details: string[] = [];
    if (error instanceof Error && "stdout" in error && typeof error.stdout === "string" && error.stdout.trim()) {
      details.push(error.stdout.trim());
    }
    if (error instanceof Error && "stderr" in error && typeof error.stderr === "string" && error.stderr.trim()) {
      details.push(error.stderr.trim());
    }
    if (error instanceof Error && details.length === 0) {
      details.push(error.message);
    }
    return { passed: false, details };
  }
}

export async function auditGeneratedConfigIntegrity({
  articleId,
  articles,
  contentBlockTypeIds = CONTENT_BLOCK_TYPE_IDS,
  articleDetailPageSource,
  chartDataSource,
  typecheckRunner = defaultTypecheckRunner,
}: AuditInput): Promise<AuditResult> {
  const checks: AuditCheckResult[] = [];
  const blockingErrors: string[] = [];
  const warnings: string[] = [];
  const article = findArticleById(articleId, articles);

  if (!article) {
    return {
      passed: false,
      articleId,
      checks: [createCheck("article lookup", "fail", `Unable to locate article "${articleId}" in design-docs config`)],
      blockingErrors: [`Unable to locate article "${articleId}" in design-docs config`],
      warnings: [],
    };
  }

  const resolvedArticleDetailSource =
    articleDetailPageSource ?? (await readFile(DEFAULT_ARTICLE_DETAIL_PATH, "utf8"));
  const resolvedChartDataSource =
    chartDataSource ?? (await readFile(DEFAULT_CHART_DATA_PATH, "utf8"));

  const typecheck = await typecheckRunner();
  checks.push(
    createCheck(
      "typecheck",
      typecheck.passed ? "pass" : "fail",
      typecheck.passed ? "Typecheck completed successfully" : "Typecheck failed",
      typecheck.details,
    ),
  );
  if (!typecheck.passed) {
    blockingErrors.push(...typecheck.details);
  }

  const contentBlocks = article.contentBlocks ?? [];
  const documentOrderIssues = validateDocumentOrder(contentBlocks);
  checks.push(
    createCheck(
      "content block document order",
      documentOrderIssues.length === 0 ? "pass" : "fail",
      documentOrderIssues.length === 0 ? "contentBlocks preserve expected editorial order" : "contentBlocks ordering issues detected",
      documentOrderIssues,
    ),
  );
  blockingErrors.push(...documentOrderIssues);

  const uniquenessIssues: string[] = [];
  for (const peer of getArticleCollection(articles)) {
    if (peer.id === article.id) {
      continue;
    }

    if (
      article.fonts?.every((font, index) => stableJson(font.usedIn) === stableJson(peer.fonts?.[index]?.usedIn)) &&
      article.fonts?.length === peer.fonts?.length
    ) {
      uniquenessIssues.push(`font usage for ${article.id} matches ${peer.id} too closely; re-check extracted typography`);
      break;
    }

    if (article.colors && peer.colors && stableJson(article.colors) === stableJson(peer.colors)) {
      uniquenessIssues.push(`color payload for ${article.id} is byte-identical to ${peer.id}; re-check extracted colors`);
      break;
    }
  }

  checks.push(
    createCheck(
      "font/color uniqueness",
      uniquenessIssues.length === 0 ? "pass" : "fail",
      uniquenessIssues.length === 0 ? "Article-specific fonts and colors look unique" : "Uniqueness issues detected",
      uniquenessIssues,
    ),
  );
  blockingErrors.push(...uniquenessIssues);

  const rendererBlockTypes = extractRendererBlockTypes(resolvedArticleDetailSource);
  const unionCoverageIssues: string[] = [];
  for (const block of contentBlocks) {
    if (!contentBlockTypeIds.includes(block.type)) {
      unionCoverageIssues.push(`ContentBlock union is missing "${block.type}"`);
    }
    if (!rendererBlockTypes.has(block.type)) {
      unionCoverageIssues.push(`ArticleDetailPage is missing a renderer branch for "${block.type}"`);
    }
  }

  checks.push(
    createCheck(
      "content block union coverage",
      unionCoverageIssues.length === 0 ? "pass" : "fail",
      unionCoverageIssues.length === 0 ? "Every content block type is represented in the union and renderer" : "Union/renderer coverage gaps detected",
      unionCoverageIssues,
    ),
  );
  blockingErrors.push(...unionCoverageIssues);

  const chartBindingIssues = validateChartBindings(article, resolvedArticleDetailSource, resolvedChartDataSource);
  checks.push(
    createCheck(
      "chart data bindings",
      chartBindingIssues.length === 0 ? "pass" : "fail",
      chartBindingIssues.length === 0 ? "Interactive blocks have backing data constants and renderer wiring" : "Chart/table wiring gaps detected",
      chartBindingIssues,
    ),
  );
  blockingErrors.push(...chartBindingIssues);

  const socialImageCoverageIssues: string[] = [];
  if (isNytInteractiveArticle(article) && article.ogImage && getSocialImages(article).length === 0) {
    socialImageCoverageIssues.push(
      `${article.id} exposes NYT interactive social/share imagery but architecture.publicAssets.socialImages is missing`,
    );
  }

  checks.push(
    createCheck(
      "social image coverage",
      socialImageCoverageIssues.length === 0 ? "pass" : "fail",
      socialImageCoverageIssues.length === 0
        ? "Recoverable social/share image sets are present when expected"
        : "Recoverable social/share imagery is missing from config",
      socialImageCoverageIssues,
    ),
  );
  blockingErrors.push(...socialImageCoverageIssues);

  const reusablePrimitiveCoverageIssues: string[] = [];
  for (const block of getContentBlockArray(article)) {
    if (block.type !== "site-header-shell" && block.type !== "storyline") {
      continue;
    }

    if (block.primitiveId && !getReusableUiPrimitive(block.primitiveId)) {
      reusablePrimitiveCoverageIssues.push(
        `${article.id} ${block.type} block references unknown primitive "${block.primitiveId}"`,
      );
      continue;
    }

    if (!isNytInteractiveArticle(article)) {
      continue;
    }

    if (block.type === "site-header-shell" && !block.primitiveId) {
      reusablePrimitiveCoverageIssues.push(
        `${article.id} site-header-shell must reference a reusable primitive instead of inline shell structure`,
      );
    }

    if (
      block.type === "storyline" &&
      (block.title === "Tariffs and Trade" || block.links?.some((link) => link.label === "Tariff Tracker")) &&
      !block.primitiveId
    ) {
      reusablePrimitiveCoverageIssues.push(
        `${article.id} Tariffs and Trade storyline must reference a reusable primitive instead of inline chrome`,
      );
    }
  }

  checks.push(
    createCheck(
      "reusable primitive coverage",
      reusablePrimitiveCoverageIssues.length === 0 ? "pass" : "fail",
      reusablePrimitiveCoverageIssues.length === 0
        ? "Publisher shell/storyline chrome is backed by reusable primitive references"
        : "Reusable primitive coverage gaps detected",
      reusablePrimitiveCoverageIssues,
    ),
  );
  blockingErrors.push(...reusablePrimitiveCoverageIssues);

  const requiredFieldIssues: string[] = [];
  if (!article.url?.startsWith("https://")) {
    requiredFieldIssues.push("article.url must be an https:// URL");
  }
  if (!article.fonts || article.fonts.length === 0) {
    requiredFieldIssues.push("article.fonts must be non-empty");
  }
  const interactiveBlockCount = getInteractiveBlockCount(contentBlocks);
  if ((article.chartTypes?.length ?? 0) !== interactiveBlockCount) {
    requiredFieldIssues.push(
      `chartTypes count (${article.chartTypes?.length ?? 0}) must match interactive content block count (${interactiveBlockCount})`,
    );
  }
  if (contentBlocks.length < 3) {
    requiredFieldIssues.push("contentBlocks must contain at least header, byline, and one content block");
  }

  checks.push(
    createCheck(
      "required fields",
      requiredFieldIssues.length === 0 ? "pass" : "fail",
      requiredFieldIssues.length === 0 ? "Required config fields are present" : "Required config field issues detected",
      requiredFieldIssues,
    ),
  );
  blockingErrors.push(...requiredFieldIssues);

  const backgroundContractPassed =
    /var\(--dd-brand-bg\)|bg-white/.test(resolvedArticleDetailSource);
  checks.push(
    createCheck(
      "page background contract",
      backgroundContractPassed ? "pass" : "warn",
      backgroundContractPassed
        ? "ArticleDetailPage uses the expected brand-aware page background contract"
        : "ArticleDetailPage no longer exposes an obvious page background contract",
    ),
  );
  if (!backgroundContractPassed) {
    warnings.push("ArticleDetailPage background contract could not be detected from source");
  }

  return {
    passed: blockingErrors.length === 0,
    articleId,
    checks,
    blockingErrors,
    warnings,
  };
}

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "");
  const expanded = normalized.length === 3
    ? normalized.split("").map((char) => `${char}${char}`).join("")
    : normalized;

  if (!/^[0-9a-f]{6}$/i.test(expanded)) {
    return null;
  }

  return {
    r: Number.parseInt(expanded.slice(0, 2), 16),
    g: Number.parseInt(expanded.slice(2, 4), 16),
    b: Number.parseInt(expanded.slice(4, 6), 16),
  };
}

function relativeLuminance(hex: string) {
  const rgb = hexToRgb(hex);
  if (!rgb) {
    return null;
  }

  const normalize = (value: number) => {
    const channel = value / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  };

  return 0.2126 * normalize(rgb.r) + 0.7152 * normalize(rgb.g) + 0.0722 * normalize(rgb.b);
}

function contrastRatio(foreground: string, background: string) {
  const fg = relativeLuminance(foreground);
  const bg = relativeLuminance(background);
  if (fg === null || bg === null) {
    return null;
  }

  const lighter = Math.max(fg, bg);
  const darker = Math.min(fg, bg);
  return (lighter + 0.05) / (darker + 0.05);
}

function collectColorPairs(content: string) {
  const results: Array<{ foreground: string; background: string; context: string }> = [];
  const styleBlocks = Array.from(content.matchAll(/\{[\s\S]{0,300}?color:\s*"?(#[0-9A-Fa-f]{3,6})"?[\s\S]{0,300}?background(?:Color)?:\s*"?(#[0-9A-Fa-f]{3,6})"?[\s\S]{0,100}?\}/g));

  for (const match of styleBlocks) {
    results.push({
      foreground: match[1],
      background: match[2],
      context: match[0].slice(0, 120),
    });
  }

  return results;
}

export function auditResponsiveAccessibility({
  articleId,
  brandSlug,
  fileSources,
}: A11yAuditInput): A11yAuditResult {
  const findings: A11yAuditFinding[] = [];
  let h1Count = 0;

  for (const file of fileSources) {
    const headingLevels = Array.from(file.content.matchAll(/<h([1-6])\b/g), (match) => Number(match[1]));
    if (headingLevels.length > 0) {
      for (let index = 0; index < headingLevels.length; index += 1) {
        const level = headingLevels[index];
        if (level === 1) {
          h1Count += 1;
        }
        const previous = headingLevels[index - 1];
        if (previous && level > previous + 1) {
          findings.push({
            check: "heading hierarchy",
            severity: "error",
            element: file.path,
            message: `Heading level jumps from h${previous} to h${level}`,
            recommendation: "Insert the missing intermediate heading level or reduce the heading level jump.",
            wcagCriterion: "1.3.1 Info and Relationships",
          });
        }
      }
    }

    const imgTags = Array.from(file.content.matchAll(/<img\b[^>]*>/g), (match) => match[0]);
    for (const tag of imgTags) {
      if (!/\balt\s*=/.test(tag)) {
        findings.push({
          check: "alt text",
          severity: "error",
          element: file.path,
          message: "Image element is missing an alt attribute",
          recommendation: "Add alt text or alt=\"\" for decorative images.",
          wcagCriterion: "1.1.1 Non-text Content",
        });
      }
    }

    const buttonBlocks = Array.from(file.content.matchAll(/<button\b[\s\S]*?<\/button>/g), (match) => match[0]);
    for (const button of buttonBlocks) {
      if (
        !/aria-label=/.test(button) &&
        (/<svg/i.test(button) || />\s*[×✕]\s*</.test(button))
      ) {
        findings.push({
          check: "interactive labels",
          severity: "warning",
          element: file.path,
          message: "Icon-only button is missing an aria-label",
          recommendation: "Add an aria-label that describes the button action.",
          wcagCriterion: "4.1.2 Name, Role, Value",
        });
      }
    }

    if (/white-?space:\s*"?(nowrap)"?/i.test(file.content) && !/overflow-x:\s*"?(auto|scroll)"?/i.test(file.content)) {
      findings.push({
        check: "responsive overflow",
        severity: "warning",
        element: file.path,
        message: "white-space: nowrap detected without an overflow-x container",
        recommendation: "Wrap the content in an overflow-x:auto container or remove nowrap at mobile breakpoints.",
        wcagCriterion: "1.4.10 Reflow",
      });
    }

    const fixedWidthMatch = file.content.match(/(?:width|minWidth):\s*(\d{3,4})/);
    if (fixedWidthMatch && Number(fixedWidthMatch[1]) > 320) {
      findings.push({
        check: "responsive overflow",
        severity: "warning",
        element: file.path,
        message: `Fixed width ${fixedWidthMatch[1]}px may overflow on mobile`,
        recommendation: "Prefer percentage widths or add an overflow-aware wrapper for narrow viewports.",
        wcagCriterion: "1.4.10 Reflow",
      });
    }

    const colorPairs = collectColorPairs(file.content);
    for (const pair of colorPairs) {
      const ratio = contrastRatio(pair.foreground, pair.background);
      if (ratio !== null && ratio < 4.5) {
        findings.push({
          check: "color contrast",
          severity: ratio < 3 ? "error" : "warning",
          element: file.path,
          message: `Contrast ratio ${ratio.toFixed(2)}:1 for ${pair.foreground} on ${pair.background}`,
          recommendation: "Adjust the foreground or background color to meet WCAG AA contrast thresholds.",
          wcagCriterion: "1.4.3 Contrast Minimum",
        });
      }
    }
  }

  if (h1Count !== 1) {
    findings.push({
      check: "heading hierarchy",
      severity: "error",
      element: articleId,
      message: `Expected exactly one h1 across audited files, found ${h1Count}`,
      recommendation: "Ensure a single primary heading per generated page.",
      wcagCriterion: "1.3.1 Info and Relationships",
    });
  }

  const summary = findings.reduce(
    (accumulator, finding) => {
      accumulator[`${finding.severity}s` as "errors" | "warnings" | "infos"] += 1;
      return accumulator;
    },
    { errors: 0, warnings: 0, infos: 0 },
  );

  return {
    passed: summary.errors === 0,
    articleId,
    brandSlug,
    findings,
    summary: {
      errors: summary.errors,
      warnings: summary.warnings,
      info: summary.infos,
    },
  };
}

function createFailure(test: string, expected: string, actual: string, articleId?: string): IntegrationFailure {
  return { test, expected, actual, articleId };
}

export async function runDesignDocsIntegrationChecks({
  articles = toDesignDocsRecords(ARTICLES),
  articleDetailPageSource,
  chartDataSource,
  sectionSourceOverrides,
}: IntegrationInput = {}): Promise<IntegrationTestResult> {
  const start = Date.now();
  const failures: IntegrationFailure[] = [];
  const resolvedArticleDetailSource =
    articleDetailPageSource ?? (await readFile(DEFAULT_ARTICLE_DETAIL_PATH, "utf8"));
  const resolvedChartDataSource =
    chartDataSource ?? (await readFile(DEFAULT_CHART_DATA_PATH, "utf8"));
  const allRecords = toDesignDocsRecords(articles);

  const idSet = new Set<string>();
  const urlSet = new Set<string>();

  for (const article of allRecords) {
    if (!article.id) {
      failures.push(createFailure("article.id", "non-empty string", JSON.stringify(article.id), article.id));
    }
    if (!article.title) {
      failures.push(createFailure("article.title", "non-empty string", JSON.stringify(article.title), article.id));
    }
    if (!article.url.startsWith("https://")) {
      failures.push(createFailure("article.url", "https:// URL", article.url, article.id));
    }
    if (!Array.isArray(article.authors) || article.authors.length === 0) {
      failures.push(createFailure("article.authors", "non-empty author list", JSON.stringify(article.authors), article.id));
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(article.date)) {
      failures.push(createFailure("article.date", "YYYY-MM-DD", article.date, article.id));
    }
    if (!["interactive", "article", "standard"].includes(article.type)) {
      failures.push(createFailure("article.type", "interactive | article | standard", article.type, article.id));
    }
    if (!article.fonts || article.fonts.length < 2) {
      failures.push(createFailure("article.fonts", "at least two font families", String(article.fonts?.length ?? 0), article.id));
    }
    if (article.contentBlocks) {
      if (article.contentBlocks.length < 3) {
        failures.push(createFailure("article.contentBlocks", "at least three blocks", String(article.contentBlocks.length), article.id));
      }
      if (!article.contentBlocks.some((block) => block.type === "header")) {
        failures.push(createFailure("contentBlocks.header", "present", "missing", article.id));
      }
      if (!article.contentBlocks.some((block) => block.type === "byline")) {
        failures.push(createFailure("contentBlocks.byline", "present", "missing", article.id));
      }
      if (article.authors.length > 0 && !article.contentBlocks.some((block) => block.type === "author-bio")) {
        failures.push(createFailure("contentBlocks.author-bio", "present when authors exist", "missing", article.id));
      }

      const interactiveCount = getInteractiveBlockCount(article.contentBlocks);
      if ((article.chartTypes?.length ?? 0) !== interactiveCount) {
        failures.push(
          createFailure(
            "chartTypes parity",
            `interactive count ${interactiveCount}`,
            `chartTypes length ${article.chartTypes?.length ?? 0}`,
            article.id,
          ),
        );
      }

      const bindingIssues = validateChartBindings(article, resolvedArticleDetailSource, resolvedChartDataSource);
      for (const issue of bindingIssues) {
        failures.push(createFailure("interactive bindings", "all interactive blocks wired", issue, article.id));
      }
    }

    if (idSet.has(article.id)) {
      failures.push(createFailure("article.id uniqueness", "unique id", article.id, article.id));
    }
    if (urlSet.has(article.url)) {
      failures.push(createFailure("article.url uniqueness", "unique url", article.url, article.id));
    }
    idSet.add(article.id);
    urlSet.add(article.url);

    if (article.url.includes("nytimes.com") && !article.architecture) {
      failures.push(createFailure("article.architecture", "defined for NYT article", "missing", article.id));
    }
    if (article.url.includes("/athletic/") && !article.architecture?.layoutTokens) {
      failures.push(createFailure("article.architecture.layoutTokens", "defined for Athletic article", "missing", article.id));
    }
  }

  const articleSpecificExpectations: Array<{
    id: string;
    checks: Array<(article: DesignDocsRecord | undefined) => IntegrationFailure | null>;
  }> = [
    {
      id: "trump-economy-year-1",
      checks: [
        (article) => (!article ? createFailure("trump lookup", "article exists", "missing", "trump-economy-year-1") : null),
        (article) => article?.type === "interactive" ? null : createFailure("trump type", "interactive", String(article?.type), article?.id),
        (article) => article?.chartTypes?.length === 9 ? null : createFailure("trump chartTypes", "9", String(article?.chartTypes?.length ?? 0), article?.id),
        (article) => article?.quoteSections?.length === 8 ? null : createFailure("trump quoteSections", "8", String(article?.quoteSections?.length ?? 0), article?.id),
        (article) => article?.fonts?.some((font) => font.name === "nyt-cheltenham-cond") ? null : createFailure("trump fonts", "nyt-cheltenham-cond included", "missing", article?.id),
        (article) => article?.architecture?.hydrationId ? null : createFailure("trump hydrationId", "non-empty", "missing", article?.id),
      ],
    },
    {
      id: "online-casinos-sweepstakes-gambling",
      checks: [
        (article) => article?.type === "article" ? null : createFailure("sweepstakes type", "article", String(article?.type), article?.id),
        (article) => article?.chartTypes?.length === 2 ? null : createFailure("sweepstakes chartTypes", "2", String(article?.chartTypes?.length ?? 0), article?.id),
        (article) => article?.contentBlocks?.some((block) => block.type === "ai2html") ? null : createFailure("sweepstakes ai2html", "present", "missing", article?.id),
        (article) => article?.contentBlocks?.some((block) => block.type === "birdkit-chart") ? null : createFailure("sweepstakes birdkit-chart", "present", "missing", article?.id),
      ],
    },
    {
      id: "winter-olympics-leaders-nations",
      checks: [
        (article) => article?.type === "article" ? null : createFailure("winter type", "article", String(article?.type), article?.id),
        (article) => article?.chartTypes?.length === 6 ? null : createFailure("winter chartTypes", "6", String(article?.chartTypes?.length ?? 0), article?.id),
        (article) => stableJson(article?.colors?.chartPalette).includes("#C9B037") ? null : createFailure("winter gold color", "#C9B037 included", stableJson(article?.colors?.chartPalette), article?.id),
        (article) => stableJson(article?.colors?.chartPalette).includes("#A8A8A8") ? null : createFailure("winter silver color", "#A8A8A8 included", stableJson(article?.colors?.chartPalette), article?.id),
        (article) => stableJson(article?.colors?.chartPalette).includes("#AD8A56") ? null : createFailure("winter bronze color", "#AD8A56 included", stableJson(article?.colors?.chartPalette), article?.id),
      ],
    },
    {
      id: "nfl-playoff-coaches-fourth-down",
      checks: [
        (article) => article?.type === "standard" ? null : createFailure("nfl type", "standard", String(article?.type), article?.id),
        (article) => article?.url.includes("/athletic/") ? null : createFailure("nfl url", "contains /athletic/", String(article?.url), article?.id),
        (article) => article?.chartTypes?.length === 1 ? null : createFailure("nfl chartTypes", "1", String(article?.chartTypes?.length ?? 0), article?.id),
        (article) => article?.fonts?.some((font) => font.name === "RegularSlab") ? null : createFailure("nfl fonts", "RegularSlab included", "missing", article?.id),
        (article) => article?.contentBlocks?.some((block) => block.type === "storyline") ? null : createFailure("nfl storyline", "present", "missing", article?.id),
        (article) => article?.contentBlocks?.some((block) => block.type === "showcase-link") ? null : createFailure("nfl showcase-link", "present", "missing", article?.id),
        (article) => article?.contentBlocks?.some((block) => block.type === "puzzle-entry-point") ? null : createFailure("nfl puzzle-entry-point", "present", "missing", article?.id),
      ],
    },
    {
      id: "trump-tariffs-us-imports",
      checks: [
        (article) => article?.type === "interactive" ? null : createFailure("imports type", "interactive", String(article?.type), article?.id),
        (article) => getSocialImages(article ?? ({} as DesignDocsRecord)).length === 5 ? null : createFailure("imports socialImages", "5", String(getSocialImages(article ?? ({} as DesignDocsRecord)).length), article?.id),
        (article) =>
          article?.contentBlocks?.some(
            (block) => block.type === "storyline" && block.primitiveId === "nyt.storyline.tariffs-and-trade.standard",
          )
            ? null
            : createFailure("imports storyline primitive", "nyt.storyline.tariffs-and-trade.standard", "missing", article?.id),
      ],
    },
    {
      id: "trump-tariffs-reaction",
      checks: [
        (article) => article?.type === "interactive" ? null : createFailure("reaction type", "interactive", String(article?.type), article?.id),
        (article) => getSocialImages(article ?? ({} as DesignDocsRecord)).length === 5 ? null : createFailure("reaction socialImages", "5", String(getSocialImages(article ?? ({} as DesignDocsRecord)).length), article?.id),
        (article) =>
          article?.contentBlocks?.some(
            (block) => block.type === "site-header-shell" && block.primitiveId === "nyt.interactive.header-shell.standard",
          )
            ? null
            : createFailure("reaction shell primitive", "nyt.interactive.header-shell.standard", "missing", article?.id),
        (article) =>
          article?.contentBlocks?.some(
            (block) => block.type === "storyline" && block.primitiveId === "nyt.storyline.tariffs-and-trade.standard",
          )
            ? null
            : createFailure("reaction storyline primitive", "nyt.storyline.tariffs-and-trade.standard", "missing", article?.id),
      ],
    },
  ];

  for (const expectation of articleSpecificExpectations) {
    const article = allRecords.find((entry) => entry.id === expectation.id);
    for (const check of expectation.checks) {
      const failure = check(article);
      if (failure) {
        failures.push(failure);
      }
    }
  }

  const brandSections = [
    { slug: "nyt", file: "BrandNYTSection.tsx" },
    { slug: "athletic", file: "BrandTheAthleticSection.tsx" },
  ];

  for (const section of brandSections) {
    const source =
      sectionSourceOverrides?.[section.file] ??
      (await readFile(path.join(BRAND_SECTION_DIR, section.file), "utf8").catch(() => null));
    if (!source) {
      failures.push(createFailure("brand section file", "existing brand section source", "missing", section.slug));
      continue;
    }
    for (const keyword of ["Typography", "Color", "Component"]) {
      if (!source.includes(keyword)) {
        failures.push(createFailure("brand section content", `contains ${keyword}`, `missing ${keyword}`, section.slug));
      }
    }
  }

  const totalTests = allRecords.length * 10 + articleSpecificExpectations.reduce((sum, entry) => sum + entry.checks.length, 0) + brandSections.length * 4;
  return {
    passed: failures.length === 0,
    totalTests,
    passedTests: totalTests - failures.length,
    failedTests: failures.length,
    failures,
    duration: Date.now() - start,
  };
}

export function getDesignDocsValidatorPaths() {
  return {
    configPath: DEFAULT_CONFIG_PATH,
    chartDataPath: DEFAULT_CHART_DATA_PATH,
    articleDetailPagePath: DEFAULT_ARTICLE_DETAIL_PATH,
    brandSectionDir: BRAND_SECTION_DIR,
  };
}
