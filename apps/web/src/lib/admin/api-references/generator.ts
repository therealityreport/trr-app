import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import {
  ADMIN_API_REFERENCES_GENERATOR_VERSION,
  ADMIN_API_REFERENCES_SCHEMA_VERSION,
  type AdminApiReferenceCatalogOverrides,
  type AdminApiReferenceConfidence,
  type AdminApiReferenceEdge,
  type AdminApiReferenceEdgeKind,
  type AdminApiReferenceEdgeOverride,
  type AdminApiReferenceIgnoreEntry,
  type AdminApiReferenceIndexes,
  type AdminApiReferenceInventory,
  type AdminApiReferenceNode,
  type AdminApiReferenceNodeKind,
  type AdminApiReferenceNodeOverride,
  type AdminApiReferencePostgresAccess,
  type AdminApiReferenceProvenance,
  type AdminApiReferenceRisk,
  type AdminApiReferenceSourceLocator,
  type AdminApiReferenceUsageTier,
  type AdminApiReferenceVerificationStatus,
  type AdminApiReferenceViewKind,
} from "./types.ts";
import { ADMIN_API_REFERENCE_IGNORE_CATALOG } from "./ignores.ts";
import { ADMIN_API_REFERENCE_OVERRIDES } from "./overrides.ts";

type DiscoveredRequestTarget = {
  kind: "api_route" | "backend_endpoint";
  method: string;
  pathPattern: string;
  sourceLocator: AdminApiReferenceSourceLocator;
  provenance: AdminApiReferenceProvenance;
  confidence: AdminApiReferenceConfidence;
  verificationStatus: AdminApiReferenceVerificationStatus;
  basis: string[];
};

type PollingMatch = {
  detector: string;
  cadenceMs: number | null;
  sourceLocator: AdminApiReferenceSourceLocator;
  basis: string[];
};

type ImportMatch = {
  source: string;
  resolvedFile: string | null;
  line: number;
  defaultImport: string | null;
  namespaceImport: string | null;
  namedImports: string[];
};

type SourceFileRecord = {
  relativePath: string;
  absolutePath: string;
  content: string;
};

const PROJECT_ROOT_SENTINEL = "apps/web";
const METHOD_RE = /\b(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)\b/g;
const UI_REQUEST_FUNCTIONS = ["fetch", "adminFetch", "adminGetJson", "adminMutation", "adminStream", "withAuthFetch"];
const UI_QUERY_HOOKS = ["useSWR", "useQuery", "useInfiniteQuery"];
const SERVER_IMPORT_PREFIXES = ["@/lib/server/admin/", "@/lib/server/trr-api/", "@/lib/server/postgres"];
const SERVER_IMPORT_EXACT_ALLOWLIST = new Set(["@/lib/server/postgres"]);
const VIEW_KIND_LIST_HINTS = new Set([
  "list",
  "shows",
  "people",
  "responses",
  "questions",
  "runs",
  "communities",
  "threads",
  "posts",
  "catalog",
  "surveys",
  "users",
  "groups",
]);
const VIEW_KIND_GALLERY_HINTS = new Set([
  "gallery",
  "images",
  "videos",
  "assets",
  "logos",
  "photos",
  "thumbnails",
]);
const VIEW_KIND_DETAIL_HINTS = new Set(["detail", "post", "show", "person", "season", "episode"]);
const PAYLOAD_HINTS = ["blob", "arrayBuffer", "Record<string, unknown>", "unknown>", "content-disposition"];
const LARGE_DATA_HINTS = ["catalog", "responses", "posts", "communities", "shows", "people", "assets", "images"];
const PAGINATION_HINTS = ["limit", "offset", "cursor", "pageSize", "page_size", "perPage", "per_page"];
const FANOUT_HINTS = ["Promise.all(", "Promise.allSettled(", "await Promise.all(", "await Promise.allSettled("];
const KNOWN_PROXY_HELPERS = ["fetchSeasonBackendJson", "fetchSeasonBackendResponse"];
const REQUEST_PATH_ALIASES: Array<{ pattern: RegExp; replacement: string }> = [
  {
    pattern: /^\/api\/admin\/trr-api\/people\/\[personId\]\/images\/refresh$/i,
    replacement: "/api/admin/trr-api/people/[personId]/refresh-images",
  },
  {
    pattern: /^\/api\/admin\/images\/cast\/\[imageId\]\/reassign$/i,
    replacement: "/api/admin/images/[imageType]/[imageId]/reassign",
  },
  {
    pattern: /^\/api\/admin\/flashback\/events$/i,
    replacement: "/api/admin/flashback/events/[eventId]",
  },
];

function posixify(value: string): string {
  return value.split(sep).join("/");
}

function hashValue(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function buildProjectRelative(projectRoot: string, absolutePath: string): string {
  return posixify(relative(projectRoot, absolutePath));
}

function readSourceFile(projectRoot: string, relativePath: string): SourceFileRecord {
  const absolutePath = join(projectRoot, relativePath);
  return {
    relativePath,
    absolutePath,
    content: readFileSync(absolutePath, "utf8"),
  };
}

function walkFiles(rootDir: string, matcher: (relativePath: string) => boolean): string[] {
  const results: string[] = [];
  const visit = (currentDir: string) => {
    const entries = readdirSync(currentDir, { withFileTypes: true })
      .filter((entry) => !entry.name.startsWith("."))
      .sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      const absolutePath = join(currentDir, entry.name);
      if (entry.isDirectory()) {
        visit(absolutePath);
        continue;
      }
      const relativePath = posixify(relative(rootDir, absolutePath));
      if (matcher(relativePath)) {
        results.push(relativePath);
      }
    }
  };
  visit(rootDir);
  return results;
}

function removeRouteGroups(segments: string[]): string[] {
  return segments.filter((segment) => {
    if (!segment) return false;
    if (segment.startsWith("(") && segment.endsWith(")")) return false;
    if (segment.startsWith("@")) return false;
    return true;
  });
}

function normalizePathPattern(value: string): string {
  const withoutQuery = value.split("?")[0] ?? value;
  const normalized = withoutQuery.replace(/\/+/g, "/").replace(/\/$/, "");
  return normalized.length > 0 ? normalized : "/";
}

function toAppPath(relativePath: string): string {
  const segments = removeRouteGroups(relativePath.split("/"));
  const appIndex = segments.indexOf("app");
  const pathSegments = segments.slice(appIndex + 1, -1);
  return normalizePathPattern(`/${pathSegments.join("/")}`);
}

function normalizeDynamicSegmentToken(raw: string): string {
  const trimmed = raw.trim();
  const match = trimmed.match(/([A-Za-z_][A-Za-z0-9_]*)$/);
  const candidate = match?.[1] ?? "param";
  return candidate.replace(/^[A-Z]/, (letter) => letter.toLowerCase());
}

function normalizeStringPathPattern(rawLiteral: string): string | null {
  const unwrapped = rawLiteral.trim().replace(/^["'`]/, "").replace(/["'`]$/, "");
  const normalizedSegments = unwrapped.replace(/\$\{([^}]+)\}/g, (_match, expression: string) => {
    return `[${normalizeDynamicSegmentToken(expression)}]`;
  });
  if (!normalizedSegments.startsWith("/")) {
    return null;
  }
  const withoutTemplateQueries = normalizedSegments.replace(/\[[^\]]*(?:query|search|params?)[^\]]*\]$/i, "");
  return normalizePathPattern(withoutTemplateQueries);
}

function lineFromIndex(source: string, index: number): number {
  return source.slice(0, index).split("\n").length;
}

function titleFromPath(kind: "page" | "route" | "backend", pathPattern: string): string {
  const readable = pathPattern
    .split("/")
    .filter(Boolean)
    .map((segment) => {
      if (segment.startsWith("[") && segment.endsWith("]")) {
        return segment.slice(1, -1);
      }
      return segment.replace(/[-_]/g, " ");
    })
    .join(" / ");
  if (!readable) {
    if (kind === "page") return "Admin root";
    return "/";
  }
  return readable
    .split(" ")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function inferComponentSymbol(relativePath: string, source: string): string {
  const defaultFunctionMatch = source.match(/export\s+default\s+function\s+([A-Z][A-Za-z0-9_]*)/);
  if (defaultFunctionMatch?.[1]) return defaultFunctionMatch[1];
  const exportedFunctionMatch = source.match(/export\s+function\s+([A-Z][A-Za-z0-9_]*)/);
  if (exportedFunctionMatch?.[1]) return exportedFunctionMatch[1];
  const constMatch = source.match(/const\s+([A-Z][A-Za-z0-9_]*)\s*[:=]/);
  if (constMatch?.[1]) return constMatch[1];
  const basename = relativePath.split("/").pop()?.replace(/\.[^.]+$/, "") ?? "Component";
  return basename.replace(/[^A-Za-z0-9]+/g, "") || "Component";
}

function parseImports(relativePath: string, source: string, knownFiles: Set<string>): ImportMatch[] {
  const matches: ImportMatch[] = [];
  const importRe = /import\s+([\s\S]*?)\s+from\s+["']([^"']+)["'];?/g;
  for (const match of source.matchAll(importRe)) {
    const clause = match[1]?.trim() ?? "";
    const importSource = match[2]?.trim() ?? "";
    const line = lineFromIndex(source, match.index ?? 0);
    const defaultImport = clause.match(/^([A-Za-z_$][A-Za-z0-9_$]*)\s*(?:,|$)/)?.[1] ?? null;
    const namespaceImport = clause.match(/\*\s+as\s+([A-Za-z_$][A-Za-z0-9_$]*)/)?.[1] ?? null;
    const namedBlock = clause.match(/{([\s\S]*?)}/)?.[1] ?? "";
    const namedImports = namedBlock
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
      .map((value) => value.split(/\s+as\s+/i)[0]?.trim() ?? value)
      .filter(Boolean);
    matches.push({
      source: importSource,
      resolvedFile: resolveImportSource(relativePath, importSource, knownFiles),
      line,
      defaultImport,
      namespaceImport,
      namedImports,
    });
  }
  return matches;
}

function resolveImportSource(fromFile: string, source: string, knownFiles: Set<string>): string | null {
  let candidateBase: string | null = null;
  if (source.startsWith("@/")) {
    candidateBase = `src/${source.slice(2)}`;
  } else if (source.startsWith("./") || source.startsWith("../")) {
    candidateBase = posixify(join(dirname(fromFile), source));
  }
  if (!candidateBase) {
    return null;
  }
  const candidates = [
    candidateBase,
    `${candidateBase}.ts`,
    `${candidateBase}.tsx`,
    `${candidateBase}.js`,
    `${candidateBase}.mjs`,
    `${candidateBase}/index.ts`,
    `${candidateBase}/index.tsx`,
  ];
  return candidates.find((candidate) => knownFiles.has(posixify(candidate))) ?? null;
}

function buildPageId(pathPattern: string): string {
  return `page:${pathPattern}`;
}

function buildComponentId(relativePath: string, symbol: string): string {
  return `component:${relativePath}::${symbol}`;
}

function buildRouteId(method: string, pathPattern: string): string {
  return `route:${method.toUpperCase()}:${pathPattern}`;
}

function buildBackendId(method: string, pathPattern: string): string {
  return `backend:${method.toUpperCase()}:${pathPattern}`;
}

function buildRepoId(relativePath: string, symbol: string): string {
  return `repo:${relativePath}::${symbol}`;
}

function buildPollId(relativePath: string, detector: string, ordinal: number): string {
  return `poll:${relativePath}::${detector}-${ordinal}`;
}

function isServerRepositoryImport(source: string): boolean {
  if (SERVER_IMPORT_EXACT_ALLOWLIST.has(source)) return true;
  return SERVER_IMPORT_PREFIXES.some((prefix) => source.startsWith(prefix));
}

function detectRouteMethods(source: string): Array<{ method: string; line: number }> {
  const discovered = new Map<string, number>();
  for (const match of source.matchAll(/export\s+(?:async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)\b/g)) {
    const method = match[1]?.toUpperCase();
    if (method && !discovered.has(method)) {
      discovered.set(method, lineFromIndex(source, match.index ?? 0));
    }
  }
  for (const match of source.matchAll(/export\s+const\s+(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)\s*=/g)) {
    const method = match[1]?.toUpperCase();
    if (method && !discovered.has(method)) {
      discovered.set(method, lineFromIndex(source, match.index ?? 0));
    }
  }
  return [...discovered.entries()].map(([method, line]) => ({ method, line }));
}

function inferViewKinds(pathPattern: string, source: string): AdminApiReferenceViewKind[] {
  const haystack = `${pathPattern} ${source}`;
  const lowerHaystack = haystack.toLowerCase();
  const kinds = new Set<AdminApiReferenceViewKind>();
  if ([...VIEW_KIND_GALLERY_HINTS].some((hint) => lowerHaystack.includes(hint))) {
    kinds.add("gallery");
  }
  if ([...VIEW_KIND_LIST_HINTS].some((hint) => lowerHaystack.includes(hint))) {
    kinds.add("list");
  }
  if ([...VIEW_KIND_DETAIL_HINTS].some((hint) => lowerHaystack.includes(hint)) || /\[[^\]]+\]/.test(pathPattern)) {
    kinds.add("detail");
  }
  return [...kinds];
}

function inferUsageTier(pathPattern: string, source: string): { usageTier: AdminApiReferenceUsageTier; basis: string[] } {
  const lowerPath = pathPattern.toLowerCase();
  if (lowerPath.includes("/stream")) {
    return { usageTier: "continuous", basis: ["heuristic:stream_surface"] };
  }
  if (source.includes("setInterval(") || source.includes("refetchInterval") || source.includes("refreshInterval")) {
    return { usageTier: "continuous", basis: ["polling_behavior"] };
  }
  if (lowerPath.includes("health") || lowerPath.includes("summary")) {
    return { usageTier: "high", basis: ["heuristic:health_or_summary_surface"] };
  }
  return { usageTier: "manual", basis: ["manual_default"] };
}

function inferPayloadFlags(pathPattern: string, source: string): {
  loadsLargeDatasets: boolean;
  usesPagination: boolean;
  returnsWideRowsOrBlobsOrRawJson: boolean;
  fansOutQueries: boolean;
} {
  const lowerSource = source.toLowerCase();
  const lowerPath = pathPattern.toLowerCase();
  const usesPagination = PAGINATION_HINTS.some((hint) => source.includes(hint));
  const returnsWideRowsOrBlobsOrRawJson =
    PAYLOAD_HINTS.some((hint) => source.includes(hint)) ||
    lowerPath.includes("/export") ||
    lowerPath.includes("/detail");
  const loadsLargeDatasets =
    LARGE_DATA_HINTS.some((hint) => lowerPath.includes(hint)) || (usesPagination && lowerSource.includes("rows"));
  const fansOutQueries =
    FANOUT_HINTS.some((hint) => source.includes(hint)) ||
    (source.match(/getBackendApiUrl\(/g)?.length ?? 0) > 1 ||
    (source.match(/fetch\(/g)?.length ?? 0) > 1;
  return { loadsLargeDatasets, usesPagination, returnsWideRowsOrBlobsOrRawJson, fansOutQueries };
}

function isDynamicSegment(segment: string): boolean {
  return /^\[\[?\.{0,3}[^\]]+\]?\]$/.test(segment);
}

function canonicalizeToKnownPathPattern(pathPattern: string, knownPaths: readonly string[]): string {
  let normalized = normalizePathPattern(pathPattern);
  for (const alias of REQUEST_PATH_ALIASES) {
    if (alias.pattern.test(normalized)) {
      normalized = alias.replacement;
      break;
    }
  }
  if (knownPaths.includes(normalized)) return normalized;

  const observedSegments = normalized.split("/").filter(Boolean);
  let bestMatch: { path: string; score: number } | null = null;

  for (const candidate of knownPaths) {
    const candidateSegments = candidate.split("/").filter(Boolean);
    if (candidateSegments.length !== observedSegments.length) continue;
    let compatible = true;
    let score = 0;
    for (let index = 0; index < candidateSegments.length; index += 1) {
      const observedSegment = observedSegments[index] ?? "";
      const candidateSegment = candidateSegments[index] ?? "";
      if (observedSegment === candidateSegment) {
        score += 3;
        continue;
      }
      if (isDynamicSegment(observedSegment) && isDynamicSegment(candidateSegment)) {
        score += 1;
        continue;
      }
      compatible = false;
      break;
    }
    if (!compatible) continue;
    if (!bestMatch || score > bestMatch.score) {
      bestMatch = { path: candidate, score };
    }
  }

  return bestMatch?.path ?? normalized;
}

function derivePayloadRisk(node: Pick<AdminApiReferenceNode, "returnsWideRowsOrBlobsOrRawJson" | "loadsLargeDatasets" | "pathPattern">): AdminApiReferenceRisk {
  if (node.returnsWideRowsOrBlobsOrRawJson || node.loadsLargeDatasets) return "high";
  if ((node.pathPattern ?? "").includes("/stream")) return "medium";
  return "low";
}

function deriveFanoutRisk(
  node: Pick<AdminApiReferenceNode, "fansOutQueries" | "polls" | "automatic">,
  outboundEdgeCount: number,
): AdminApiReferenceRisk {
  if (node.fansOutQueries || outboundEdgeCount > 1 || (node.polls && node.automatic)) return "high";
  if (outboundEdgeCount === 1 && node.automatic) return "medium";
  return "low";
}

function discoverRequestTargets(source: string): DiscoveredRequestTarget[] {
  const targets: DiscoveredRequestTarget[] = [];
  const addTarget = (target: DiscoveredRequestTarget) => {
    const key = `${target.kind}:${target.method}:${target.pathPattern}:${target.sourceLocator.line}`;
    if (!targets.some((candidate) => `${candidate.kind}:${candidate.method}:${candidate.pathPattern}:${candidate.sourceLocator.line}` === key)) {
      targets.push(target);
    }
  };

  const callPattern = new RegExp(`(?:${UI_REQUEST_FUNCTIONS.join("|")})\\s*\\(\\s*([\\\`'"][\\s\\S]*?[\\\`'"])`, "g");
  for (const match of source.matchAll(callPattern)) {
    const literal = match[1];
    const pathPattern = literal ? normalizeStringPathPattern(literal) : null;
    if (!pathPattern?.startsWith("/api/admin/")) continue;
    const callSource = source.slice(match.index ?? 0, (match.index ?? 0) + 320);
    const explicitMethod = callSource.match(/method\s*:\s*["'](GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)["']/i)?.[1];
    const method = explicitMethod?.toUpperCase() ?? "GET";
    addTarget({
      kind: "api_route",
      method,
      pathPattern,
      sourceLocator: { line: lineFromIndex(source, match.index ?? 0), matchedText: literal },
      provenance: "static_scan",
      confidence: "high",
      verificationStatus: "verified",
      basis: ["static_scan:ui_request_call"],
    });
  }

  for (const hookName of UI_QUERY_HOOKS) {
    const hookRe = new RegExp(`${hookName}\\s*\\([\\s\\S]{0,240}?([\\\`'"]\\/api\\/admin\\/[\\s\\S]*?[\\\`'"])`, "g");
    for (const match of source.matchAll(hookRe)) {
      const literal = match[1];
      const pathPattern = literal ? normalizeStringPathPattern(literal) : null;
      if (!pathPattern?.startsWith("/api/admin/")) continue;
      addTarget({
        kind: "api_route",
        method: "GET",
        pathPattern,
        sourceLocator: { line: lineFromIndex(source, match.index ?? 0), matchedText: literal },
        provenance: "heuristic_inference",
        confidence: "medium",
        verificationStatus: "inferred",
        basis: [`heuristic:${hookName}_network_fetcher`],
      });
    }
  }

  for (const helperName of KNOWN_PROXY_HELPERS) {
    const helperRe = new RegExp(`${helperName}\\s*\\(\\s*[^,]+,\\s*([\\\`'"][\\s\\S]*?[\\\`'"])`, "g");
    for (const match of source.matchAll(helperRe)) {
      const literal = match[1];
      const suffix = literal ? normalizeStringPathPattern(literal) : null;
      if (!suffix) continue;
      addTarget({
        kind: "backend_endpoint",
        method: "GET",
        pathPattern: normalizePathPattern(`/api/v1/admin/socials/seasons/[seasonId]${suffix}`),
        sourceLocator: { line: lineFromIndex(source, match.index ?? 0), matchedText: literal },
        provenance: "heuristic_inference",
        confidence: "medium",
        verificationStatus: "inferred",
        basis: [`heuristic:${helperName}`],
      });
    }
  }

  for (const match of source.matchAll(/new\s+EventSource\s*\(\s*([`'"][\s\S]*?[`'"])/g)) {
    const literal = match[1];
    const pathPattern = literal ? normalizeStringPathPattern(literal) : null;
    if (!pathPattern?.startsWith("/api/admin/")) continue;
    addTarget({
      kind: "api_route",
      method: "GET",
      pathPattern,
      sourceLocator: { line: lineFromIndex(source, match.index ?? 0), matchedText: literal },
      provenance: "static_scan",
      confidence: "high",
      verificationStatus: "verified",
      basis: ["static_scan:event_source_request"],
    });
  }

  return targets.sort((left, right) => left.pathPattern.localeCompare(right.pathPattern));
}

function detectPollingMatches(source: string): PollingMatch[] {
  const matches: PollingMatch[] = [];
  const add = (detector: string, index: number, basis: string[], cadenceMs: number | null, matchedText?: string) => {
    matches.push({
      detector,
      cadenceMs,
      basis,
      sourceLocator: {
        line: lineFromIndex(source, index),
        matchedText,
      },
    });
  };

  for (const match of source.matchAll(/setInterval\s*\(/g)) {
    const window = source.slice(match.index ?? 0, (match.index ?? 0) + 200);
    const cadence = window.match(/setInterval\s*\([^,]+,\s*([0-9_]+)/)?.[1];
    add("set-interval", match.index ?? 0, ["static_scan:setInterval"], cadence ? Number(cadence.replaceAll("_", "")) : null, "setInterval");
  }
  for (const match of source.matchAll(/setTimeout\s*\(\s*([A-Za-z_$][A-Za-z0-9_$]*)\s*,/g)) {
    const callbackName = match[1] ?? "";
    const body = callbackName ? source.slice(match.index ?? 0, Math.min(source.length, (match.index ?? 0) + 600)) : "";
    if (!callbackName || !body.includes(`${callbackName}(`)) continue;
    add("timeout-loop", match.index ?? 0, ["static_scan:recursive_setTimeout"], null, callbackName);
  }
  for (const match of source.matchAll(/new\s+EventSource\s*\(/g)) {
    add("event-source", match.index ?? 0, ["static_scan:event_source"], null, "EventSource");
  }
  for (const match of source.matchAll(/refreshInterval\s*:\s*([0-9_]+)/g)) {
    const cadence = Number((match[1] ?? "0").replaceAll("_", ""));
    add("swr-refresh-interval", match.index ?? 0, ["heuristic:useSWR_refreshInterval"], cadence || null, "refreshInterval");
  }
  for (const match of source.matchAll(/refetchInterval\s*:\s*([0-9_]+)/g)) {
    const cadence = Number((match[1] ?? "0").replaceAll("_", ""));
    add("react-query-refetch-interval", match.index ?? 0, ["heuristic:react_query_refetchInterval"], cadence || null, "refetchInterval");
  }
  for (const match of source.matchAll(/router\.refresh\s*\(/g)) {
    const snippet = source.slice(Math.max(0, (match.index ?? 0) - 160), (match.index ?? 0) + 200);
    if (snippet.includes("setInterval") || snippet.includes("setTimeout") || snippet.includes("visibilitychange")) {
      add("router-refresh-loop", match.index ?? 0, ["heuristic:scheduled_router_refresh"], null, "router.refresh");
    }
  }
  for (const match of source.matchAll(/visibilitychange|focus/gi)) {
    const snippet = source.slice(Math.max(0, (match.index ?? 0) - 200), (match.index ?? 0) + 240);
    if (snippet.includes("/api/admin/") || snippet.includes("fetch(") || snippet.includes("adminFetch(")) {
      add("visibility-refresh", match.index ?? 0, ["heuristic:visibility_or_focus_refresh"], null, match[0] ?? "visibility");
    }
  }

  return matches;
}

function autoIgnoreEntry(id: string, source: string): AdminApiReferenceIgnoreEntry | null {
  if (source.includes("redirect(")) {
    return {
      id,
      reason: "redirect_only",
      note: "Auto-detected redirect-only admin surface.",
    };
  }
  return null;
}

function buildNode(
  input: Omit<AdminApiReferenceNode, "payloadRisk" | "fanoutRisk">,
): AdminApiReferenceNode {
  return {
    ...input,
    payloadRisk: "low",
    fanoutRisk: "low",
  };
}

function buildEdge(input: AdminApiReferenceEdge): AdminApiReferenceEdge {
  return input;
}

function applyNodeOverride(node: AdminApiReferenceNode, override: AdminApiReferenceNodeOverride | undefined): AdminApiReferenceNode {
  if (!override) return node;
  return {
    ...node,
    title: override.title ?? node.title,
    basis: override.basis ? [...override.basis] : node.basis,
    usageTier: override.usageTier ?? node.usageTier,
    polls: override.polls ?? node.polls,
    pollCadenceMs: override.pollCadenceMs ?? node.pollCadenceMs,
    automatic: override.automatic ?? node.automatic,
    loadsLargeDatasets: override.loadsLargeDatasets ?? node.loadsLargeDatasets,
    usesPagination: override.usesPagination ?? node.usesPagination,
    returnsWideRowsOrBlobsOrRawJson:
      override.returnsWideRowsOrBlobsOrRawJson ?? node.returnsWideRowsOrBlobsOrRawJson,
    fansOutQueries: override.fansOutQueries ?? node.fansOutQueries,
    postgresAccess: override.postgresAccess ?? node.postgresAccess,
    viewKinds: override.viewKinds ? [...override.viewKinds] : node.viewKinds,
    staticOnly: override.staticOnly ?? node.staticOnly,
    confidence: override.confidence ?? node.confidence,
    verificationStatus: override.verificationStatus ?? node.verificationStatus,
    provenance: "manual_override",
  };
}

function isKnownKind<T extends string>(value: T, allowed: readonly string[]): boolean {
  return allowed.includes(value);
}

function validateInventory(
  inventory: AdminApiReferenceInventory,
  pageFiles: string[],
  routeFiles: string[],
  requestComponentIds: string[],
  ignoreEntries: readonly AdminApiReferenceIgnoreEntry[],
): string[] {
  const errors: string[] = [];
  const nodeMap = new Map<string, AdminApiReferenceNode>();
  const edgeIds = new Set<string>();
  for (const node of inventory.nodes) {
    if (nodeMap.has(node.id)) {
      errors.push(`Duplicate node id: ${node.id}`);
      continue;
    }
    nodeMap.set(node.id, node);
    if (!node.sourceFile && !(node.kind === "backend_endpoint" && node.verificationStatus === "unverified_manual")) {
      errors.push(`Represented node is missing sourceFile: ${node.id}`);
    }
    if ((node.provenance === "heuristic_inference" || node.provenance === "manual_override") && node.basis.length === 0) {
      errors.push(`Node requires basis: ${node.id}`);
    }
    if (node.provenance === "heuristic_inference" && !node.confidence) {
      errors.push(`Inferred node requires confidence: ${node.id}`);
    }
  }
  for (const edge of inventory.edges) {
    if (edgeIds.has(edge.id)) {
      errors.push(`Duplicate edge id: ${edge.id}`);
      continue;
    }
    edgeIds.add(edge.id);
    if (!nodeMap.has(edge.from) || !nodeMap.has(edge.to)) {
      errors.push(`Edge references missing node: ${edge.id}`);
    }
    if ((edge.provenance === "heuristic_inference" || edge.provenance === "manual_override") && edge.basis.length === 0) {
      errors.push(`Edge requires basis: ${edge.id}`);
    }
  }

  const outboundByNode = new Map<string, AdminApiReferenceEdge[]>();
  const inboundByNode = new Map<string, AdminApiReferenceEdge[]>();
  for (const edge of inventory.edges) {
    const outbound = outboundByNode.get(edge.from) ?? [];
    outbound.push(edge);
    outboundByNode.set(edge.from, outbound);
    const inbound = inboundByNode.get(edge.to) ?? [];
    inbound.push(edge);
    inboundByNode.set(edge.to, inbound);
  }

  for (const node of inventory.nodes) {
    const outbound = outboundByNode.get(node.id) ?? [];
    const inbound = inboundByNode.get(node.id) ?? [];
    if (node.kind === "polling_loop" && inbound.every((edge) => edge.kind !== "contains_polling")) {
      errors.push(`Polling loop has no owning UI surface: ${node.id}`);
    }
    if (node.kind === "backend_endpoint" && node.verificationStatus !== "unverified_manual" && inbound.length === 0) {
      errors.push(`Discovered backend endpoint is orphaned: ${node.id}`);
    }
    if (node.kind === "repository_surface" && node.provenance !== "manual_override" && inbound.length === 0) {
      errors.push(`Discovered repository surface is orphaned: ${node.id}`);
    }
    if (node.kind === "ui_surface" && node.id.startsWith("component:")) {
      const hasRequestEdge = outbound.some((edge) =>
        edge.kind === "originates_request" || edge.kind === "calls" || edge.kind === "proxies_to",
      );
      if (!hasRequestEdge) {
        errors.push(`Request-originating component has no request edge: ${node.id}`);
      }
    }
    if (node.kind === "ui_surface" && node.id.startsWith("page:") && outbound.length === 0 && !node.staticOnly) {
      errors.push(`Admin page is orphaned without staticOnly=true: ${node.id}`);
    }
  }

  const ignoredIds = new Set(ignoreEntries.map((entry) => entry.id));
  const pageIds = new Set(
    pageFiles.map((relativePath) => buildPageId(toAppPath(relativePath))),
  );
  const representedPageIds = new Set(
    inventory.nodes.filter((node) => node.id.startsWith("page:")).map((node) => node.id),
  );
  for (const pageId of pageIds) {
    if (!representedPageIds.has(pageId) && !ignoredIds.has(pageId)) {
      errors.push(`Admin page missing from represented or ignored set: ${pageId}`);
    }
  }

  const routePathByFile = new Map<string, string>();
  for (const routeFile of routeFiles) {
    routePathByFile.set(routeFile, toAppPath(routeFile));
  }
  for (const [routeFile, routePath] of routePathByFile) {
    const represented = inventory.nodes.some((node) => node.kind === "api_route" && node.pathPattern === routePath);
    if (!represented) {
      errors.push(`Admin API route missing from represented set: ${routeFile}`);
    }
  }

  const representedComponentIds = new Set(
    inventory.nodes.filter((node) => node.id.startsWith("component:")).map((node) => node.id),
  );
  for (const componentId of requestComponentIds) {
    if (!representedComponentIds.has(componentId) && !ignoredIds.has(componentId)) {
      errors.push(`Request-originating component missing from represented or ignored set: ${componentId}`);
    }
  }

  const allowedProvenance = ["static_scan", "heuristic_inference", "manual_override", "derived"] as const;
  const allowedVerificationStatus = ["verified", "inferred", "unverified_manual"] as const;
  for (const node of inventory.nodes) {
    if (!isKnownKind(node.provenance, allowedProvenance)) {
      errors.push(`Unknown node provenance: ${node.id}`);
    }
    if (!isKnownKind(node.verificationStatus, allowedVerificationStatus)) {
      errors.push(`Unknown node verificationStatus: ${node.id}`);
    }
  }
  for (const edge of inventory.edges) {
    if (!isKnownKind(edge.provenance, allowedProvenance)) {
      errors.push(`Unknown edge provenance: ${edge.id}`);
    }
    if (!isKnownKind(edge.verificationStatus, allowedVerificationStatus)) {
      errors.push(`Unknown edge verificationStatus: ${edge.id}`);
    }
  }

  return errors;
}

function buildIndexes(nodes: AdminApiReferenceNode[], edges: AdminApiReferenceEdge[]): AdminApiReferenceIndexes {
  const nodeKinds: AdminApiReferenceNodeKind[] = [
    "ui_surface",
    "api_route",
    "backend_endpoint",
    "repository_surface",
    "polling_loop",
  ];
  const edgeKinds: AdminApiReferenceEdgeKind[] = [
    "originates_request",
    "contains_polling",
    "calls",
    "proxies_to",
    "touches_repository",
    "renders_view",
  ];
  const nodeIdsByKind = Object.fromEntries(
    nodeKinds.map((kind) => [kind, nodes.filter((node) => node.kind === kind).map((node) => node.id)]),
  ) as Record<AdminApiReferenceNodeKind, string[]>;
  const edgeIdsByKind = Object.fromEntries(
    edgeKinds.map((kind) => [kind, edges.filter((edge) => edge.kind === kind).map((edge) => edge.id)]),
  ) as Record<AdminApiReferenceEdgeKind, string[]>;
  return {
    nodeIdsByKind,
    edgeIdsByKind,
    summary: {
      totalNodes: nodes.length,
      totalEdges: edges.length,
      nodesByKind: Object.fromEntries(nodeKinds.map((kind) => [kind, nodeIdsByKind[kind].length])) as Record<
        AdminApiReferenceNodeKind,
        number
      >,
      edgesByKind: Object.fromEntries(edgeKinds.map((kind) => [kind, edgeIdsByKind[kind].length])) as Record<
        AdminApiReferenceEdgeKind,
        number
      >,
      automaticNodes: nodes.filter((node) => node.automatic).length,
      pollingNodes: nodes.filter((node) => node.polls || node.kind === "polling_loop").length,
      directPostgresNodes: nodes.filter((node) => node.postgresAccess === "direct").length,
      indirectPostgresNodes: nodes.filter((node) => node.postgresAccess === "indirect").length,
    },
  };
}

function resolveCommitSha(projectRoot: string): string {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: projectRoot,
      encoding: "utf8",
    }).trim();
  } catch {
    return "unknown";
  }
}

function computeOverrideDigest(
  overrides: AdminApiReferenceCatalogOverrides,
  ignores: readonly AdminApiReferenceIgnoreEntry[],
): string {
  return hashValue(JSON.stringify({ overrides, ignores }));
}

function shouldRepresentUiSurface(relativePath: string, content: string): boolean {
  if (relativePath.endsWith("/page.tsx")) return true;
  return discoverRequestTargets(content).length > 0;
}

function buildGeneratedTypescriptModule(inventory: AdminApiReferenceInventory): string {
  return `/* eslint-disable */\nimport type { AdminApiReferenceInventory } from "@/lib/admin/api-references/types";\n\nexport const GENERATED_ADMIN_API_REFERENCE_INVENTORY = ${JSON.stringify(inventory, null, 2)} satisfies AdminApiReferenceInventory;\n`;
}

export function buildAdminApiReferenceInventory(
  projectRoot: string,
  options?: { generatedAt?: string },
): AdminApiReferenceInventory {
  const appRoot = join(projectRoot, "src");
  const adminPagesRoot = join(projectRoot, "src/app/admin");
  const adminApiRoot = join(projectRoot, "src/app/api/admin");
  const componentAdminRoot = join(projectRoot, "src/components/admin");
  const allSourceFiles = walkFiles(appRoot, (relativePath) => /\.(ts|tsx)$/.test(relativePath));
  const knownFiles = new Set(allSourceFiles);
  const pageFiles = walkFiles(adminPagesRoot, (relativePath) => relativePath.endsWith("page.tsx")).map((relativePath) =>
    posixify(`src/app/admin/${relativePath}`),
  );
  const routeFiles = walkFiles(adminApiRoot, (relativePath) => relativePath.endsWith("route.ts")).map((relativePath) =>
    posixify(`src/app/api/admin/${relativePath}`),
  );
  const knownRoutePaths = routeFiles.map((routeFile) => toAppPath(routeFile));
  const componentFiles = [
    ...walkFiles(componentAdminRoot, (relativePath) => relativePath.endsWith(".tsx")).map((relativePath) =>
      posixify(`src/components/admin/${relativePath}`),
    ),
    ...walkFiles(adminPagesRoot, (relativePath) => relativePath.endsWith(".tsx") && !relativePath.endsWith("page.tsx")).map(
      (relativePath) => posixify(`src/app/admin/${relativePath}`),
    ),
  ].sort((left, right) => left.localeCompare(right));

  const manualIgnores = new Map(ADMIN_API_REFERENCE_IGNORE_CATALOG.map((entry) => [entry.id, entry]));
  const nodes = new Map<string, AdminApiReferenceNode>();
  const edges = new Map<string, AdminApiReferenceEdge>();
  const requestComponentIds: string[] = [];

  const ensureNode = (node: AdminApiReferenceNode) => {
    nodes.set(node.id, node);
  };

  const ensureEdge = (edge: AdminApiReferenceEdge) => {
    edges.set(edge.id, edge);
  };

  for (const seedNode of ADMIN_API_REFERENCE_OVERRIDES.seedNodes) {
    ensureNode(buildNode(seedNode));
  }

  for (const pageFile of pageFiles) {
    const record = readSourceFile(projectRoot, pageFile);
    const pathPattern = toAppPath(pageFile);
    const pageId = buildPageId(pathPattern);
    const autoIgnore = autoIgnoreEntry(pageId, record.content);
    if (autoIgnore && !manualIgnores.has(autoIgnore.id)) {
      manualIgnores.set(autoIgnore.id, autoIgnore);
    }
    if (manualIgnores.has(pageId)) continue;

    const requestTargets = discoverRequestTargets(record.content).map((target) =>
      target.kind === "api_route"
        ? { ...target, pathPattern: canonicalizeToKnownPathPattern(target.pathPattern, knownRoutePaths) }
        : target,
    );
    const usage = inferUsageTier(pathPattern, record.content);
    const payloadFlags = inferPayloadFlags(pathPattern, record.content);
    const pollingMatches = detectPollingMatches(record.content);
    const imports = parseImports(pageFile, record.content, knownFiles);
    const componentImports = imports
      .map((entry) => entry.resolvedFile)
      .filter((value): value is string => Boolean(value))
      .filter((value) => value.startsWith("src/components/admin/") || value.startsWith("src/app/admin/"));

    const node = buildNode({
      id: pageId,
      kind: "ui_surface",
      title: titleFromPath("page", pathPattern),
      pathPattern,
      symbol: "page",
      sourceFile: pageFile,
      sourceLocator: { line: 1, symbol: "page" },
      provenance: "static_scan",
      confidence: "high",
      verificationStatus: "verified",
      basis: ["static_scan:admin_page"],
      usageTier: usage.usageTier,
      polls: pollingMatches.length > 0,
      pollCadenceMs: pollingMatches.find((match) => match.cadenceMs != null)?.cadenceMs ?? null,
      automatic: pollingMatches.length > 0,
      loadsLargeDatasets: payloadFlags.loadsLargeDatasets,
      usesPagination: payloadFlags.usesPagination,
      returnsWideRowsOrBlobsOrRawJson: payloadFlags.returnsWideRowsOrBlobsOrRawJson,
      fansOutQueries: payloadFlags.fansOutQueries,
      postgresAccess: requestTargets.length > 0 ? "indirect" : "none",
      viewKinds: inferViewKinds(pathPattern, record.content),
      staticOnly: false,
    });
    ensureNode(node);

    for (const target of requestTargets) {
      const targetId =
        target.kind === "api_route"
          ? buildRouteId(target.method, target.pathPattern)
          : buildBackendId(target.method, target.pathPattern);
      ensureEdge(
        buildEdge({
          id: `originates_request:${pageId}:${targetId}`,
          kind: "originates_request",
          from: pageId,
          to: targetId,
          title: null,
          sourceFile: pageFile,
          sourceLocator: target.sourceLocator,
          provenance: target.provenance,
          confidence: target.confidence,
          verificationStatus: target.verificationStatus,
          basis: [...target.basis],
        }),
      );
    }

    for (const pollMatch of pollingMatches) {
      const ordinal = pollingMatches.indexOf(pollMatch) + 1;
      const pollId = buildPollId(pageFile, pollMatch.detector, ordinal);
      ensureNode(
        buildNode({
          id: pollId,
          kind: "polling_loop",
          title: `${titleFromPath("page", pathPattern)} ${pollMatch.detector}`,
          pathPattern,
          symbol: pollMatch.detector,
          sourceFile: pageFile,
          sourceLocator: pollMatch.sourceLocator,
          provenance: pollMatch.basis.some((entry) => entry.startsWith("heuristic")) ? "heuristic_inference" : "static_scan",
          confidence: pollMatch.basis.some((entry) => entry.startsWith("heuristic")) ? "medium" : "high",
          verificationStatus: pollMatch.basis.some((entry) => entry.startsWith("heuristic")) ? "inferred" : "verified",
          basis: [...pollMatch.basis],
          usageTier: "continuous",
          polls: true,
          pollCadenceMs: pollMatch.cadenceMs,
          automatic: true,
          loadsLargeDatasets: false,
          usesPagination: false,
          returnsWideRowsOrBlobsOrRawJson: false,
          fansOutQueries: false,
          postgresAccess: "indirect",
          viewKinds: [],
          staticOnly: false,
        }),
      );
      ensureEdge(
        buildEdge({
          id: `contains_polling:${pageId}:${pollId}`,
          kind: "contains_polling",
          from: pageId,
          to: pollId,
          title: null,
          sourceFile: pageFile,
          sourceLocator: pollMatch.sourceLocator,
          provenance: pollMatch.basis.some((entry) => entry.startsWith("heuristic")) ? "heuristic_inference" : "static_scan",
          confidence: pollMatch.basis.some((entry) => entry.startsWith("heuristic")) ? "medium" : "high",
          verificationStatus: pollMatch.basis.some((entry) => entry.startsWith("heuristic")) ? "inferred" : "verified",
          basis: [...pollMatch.basis],
        }),
      );
    }

    for (const importedComponentFile of componentImports) {
      const componentSource = readSourceFile(projectRoot, importedComponentFile).content;
      if (!shouldRepresentUiSurface(importedComponentFile, componentSource)) continue;
      const symbol = inferComponentSymbol(importedComponentFile, componentSource);
      const componentId = buildComponentId(importedComponentFile, symbol);
      ensureEdge(
        buildEdge({
          id: `renders_view:${pageId}:${componentId}`,
          kind: "renders_view",
          from: pageId,
          to: componentId,
          title: null,
          sourceFile: pageFile,
          sourceLocator: { line: 1, symbol },
          provenance: "heuristic_inference",
          confidence: "medium",
          verificationStatus: "inferred",
          basis: ["heuristic:page_imports_request_component"],
        }),
      );
    }
  }

  for (const componentFile of componentFiles) {
    const record = readSourceFile(projectRoot, componentFile);
    if (!shouldRepresentUiSurface(componentFile, record.content)) continue;
    const symbol = inferComponentSymbol(componentFile, record.content);
    const componentId = buildComponentId(componentFile, symbol);
    requestComponentIds.push(componentId);
    const requestTargets = discoverRequestTargets(record.content).map((target) =>
      target.kind === "api_route"
        ? { ...target, pathPattern: canonicalizeToKnownPathPattern(target.pathPattern, knownRoutePaths) }
        : target,
    );
    const pollingMatches = detectPollingMatches(record.content);
    const usage = inferUsageTier(componentFile, record.content);
    const payloadFlags = inferPayloadFlags(componentFile, record.content);
    const node = buildNode({
      id: componentId,
      kind: "ui_surface",
      title: symbol,
      pathPattern: null,
      symbol,
      sourceFile: componentFile,
      sourceLocator: { line: 1, symbol },
      provenance: "static_scan",
      confidence: "high",
      verificationStatus: "verified",
      basis: ["static_scan:request_originating_component"],
      usageTier: usage.usageTier,
      polls: pollingMatches.length > 0,
      pollCadenceMs: pollingMatches.find((match) => match.cadenceMs != null)?.cadenceMs ?? null,
      automatic: pollingMatches.length > 0,
      loadsLargeDatasets: payloadFlags.loadsLargeDatasets,
      usesPagination: payloadFlags.usesPagination,
      returnsWideRowsOrBlobsOrRawJson: payloadFlags.returnsWideRowsOrBlobsOrRawJson,
      fansOutQueries: payloadFlags.fansOutQueries,
      postgresAccess: requestTargets.length > 0 ? "indirect" : "none",
      viewKinds: inferViewKinds(componentFile, record.content),
      staticOnly: false,
    });
    ensureNode(node);

    for (const target of requestTargets) {
      const targetId =
        target.kind === "api_route"
          ? buildRouteId(target.method, target.pathPattern)
          : buildBackendId(target.method, target.pathPattern);
      ensureEdge(
        buildEdge({
          id: `originates_request:${componentId}:${targetId}`,
          kind: "originates_request",
          from: componentId,
          to: targetId,
          title: null,
          sourceFile: componentFile,
          sourceLocator: target.sourceLocator,
          provenance: target.provenance,
          confidence: target.confidence,
          verificationStatus: target.verificationStatus,
          basis: [...target.basis],
        }),
      );
    }

    for (const pollMatch of pollingMatches) {
      const ordinal = pollingMatches.indexOf(pollMatch) + 1;
      const pollId = buildPollId(componentFile, pollMatch.detector, ordinal);
      ensureNode(
        buildNode({
          id: pollId,
          kind: "polling_loop",
          title: `${symbol} ${pollMatch.detector}`,
          pathPattern: null,
          symbol: pollMatch.detector,
          sourceFile: componentFile,
          sourceLocator: pollMatch.sourceLocator,
          provenance: pollMatch.basis.some((entry) => entry.startsWith("heuristic")) ? "heuristic_inference" : "static_scan",
          confidence: pollMatch.basis.some((entry) => entry.startsWith("heuristic")) ? "medium" : "high",
          verificationStatus: pollMatch.basis.some((entry) => entry.startsWith("heuristic")) ? "inferred" : "verified",
          basis: [...pollMatch.basis],
          usageTier: "continuous",
          polls: true,
          pollCadenceMs: pollMatch.cadenceMs,
          automatic: true,
          loadsLargeDatasets: false,
          usesPagination: false,
          returnsWideRowsOrBlobsOrRawJson: false,
          fansOutQueries: false,
          postgresAccess: "indirect",
          viewKinds: [],
          staticOnly: false,
        }),
      );
      ensureEdge(
        buildEdge({
          id: `contains_polling:${componentId}:${pollId}`,
          kind: "contains_polling",
          from: componentId,
          to: pollId,
          title: null,
          sourceFile: componentFile,
          sourceLocator: pollMatch.sourceLocator,
          provenance: pollMatch.basis.some((entry) => entry.startsWith("heuristic")) ? "heuristic_inference" : "static_scan",
          confidence: pollMatch.basis.some((entry) => entry.startsWith("heuristic")) ? "medium" : "high",
          verificationStatus: pollMatch.basis.some((entry) => entry.startsWith("heuristic")) ? "inferred" : "verified",
          basis: [...pollMatch.basis],
        }),
      );
    }
  }

  for (const routeFile of routeFiles) {
    const record = readSourceFile(projectRoot, routeFile);
    const pathPattern = toAppPath(routeFile);
    const methods = detectRouteMethods(record.content);
    const imports = parseImports(routeFile, record.content, knownFiles);
    const backendMatches = [...record.content.matchAll(/getBackendApiUrl\s*\(\s*([`'"][\s\S]*?[`'"])\s*\)/g)]
      .map((match) => ({
        pathPattern: normalizeStringPathPattern(match[1] ?? ""),
        line: lineFromIndex(record.content, match.index ?? 0),
        literal: match[1] ?? "",
      }))
      .filter((match): match is { pathPattern: string; line: number; literal: string } => Boolean(match.pathPattern))
      .map((match) => ({
        pathPattern: normalizePathPattern(`/api/v1${match.pathPattern}`),
        line: match.line,
        literal: match.literal,
      }));
    const helperTargets = discoverRequestTargets(record.content).filter((target) => target.kind === "backend_endpoint");

    for (const methodRecord of methods) {
      const usage = inferUsageTier(pathPattern, record.content);
      const payloadFlags = inferPayloadFlags(pathPattern, record.content);
      const routeId = buildRouteId(methodRecord.method, pathPattern);
      ensureNode(
        buildNode({
          id: routeId,
          kind: "api_route",
          title: `${methodRecord.method} ${pathPattern}`,
          pathPattern,
          symbol: methodRecord.method,
          sourceFile: routeFile,
          sourceLocator: { line: methodRecord.line, symbol: methodRecord.method },
          provenance: "static_scan",
          confidence: "high",
          verificationStatus: "verified",
          basis: ["static_scan:app_api_route"],
          usageTier: usage.usageTier,
          polls: pathPattern.includes("/stream"),
          pollCadenceMs: null,
          automatic: pathPattern.includes("/stream"),
          loadsLargeDatasets: payloadFlags.loadsLargeDatasets,
          usesPagination: payloadFlags.usesPagination,
          returnsWideRowsOrBlobsOrRawJson: payloadFlags.returnsWideRowsOrBlobsOrRawJson,
          fansOutQueries: payloadFlags.fansOutQueries,
          postgresAccess: "none",
          viewKinds: inferViewKinds(pathPattern, record.content),
          staticOnly: false,
        }),
      );

      for (const backendTarget of backendMatches) {
        const backendId = buildBackendId(methodRecord.method, backendTarget.pathPattern);
        ensureNode(
          buildNode({
            id: backendId,
            kind: "backend_endpoint",
            title: `${methodRecord.method} ${backendTarget.pathPattern}`,
            pathPattern: backendTarget.pathPattern,
            symbol: methodRecord.method,
            sourceFile: routeFile,
            sourceLocator: { line: backendTarget.line, matchedText: backendTarget.literal },
            provenance: "static_scan",
            confidence: "high",
            verificationStatus: "verified",
            basis: ["static_scan:getBackendApiUrl"],
            usageTier: usage.usageTier,
            polls: backendTarget.pathPattern.includes("/stream"),
            pollCadenceMs: null,
            automatic: backendTarget.pathPattern.includes("/stream"),
            loadsLargeDatasets: payloadFlags.loadsLargeDatasets,
            usesPagination: payloadFlags.usesPagination,
            returnsWideRowsOrBlobsOrRawJson: payloadFlags.returnsWideRowsOrBlobsOrRawJson,
            fansOutQueries: payloadFlags.fansOutQueries,
            postgresAccess: "indirect",
            viewKinds: inferViewKinds(backendTarget.pathPattern, record.content),
            staticOnly: false,
          }),
        );
        ensureEdge(
          buildEdge({
            id: `proxies_to:${routeId}:${backendId}`,
            kind: "proxies_to",
            from: routeId,
            to: backendId,
            title: null,
            sourceFile: routeFile,
            sourceLocator: { line: backendTarget.line, matchedText: backendTarget.literal },
            provenance: "static_scan",
            confidence: "high",
            verificationStatus: "verified",
            basis: ["static_scan:getBackendApiUrl"],
          }),
        );
      }

      for (const helperTarget of helperTargets) {
        const backendId = buildBackendId(helperTarget.method, helperTarget.pathPattern);
        ensureNode(
          buildNode({
            id: backendId,
            kind: "backend_endpoint",
            title: `${helperTarget.method} ${helperTarget.pathPattern}`,
            pathPattern: helperTarget.pathPattern,
            symbol: helperTarget.method,
            sourceFile: routeFile,
            sourceLocator: helperTarget.sourceLocator,
            provenance: helperTarget.provenance,
            confidence: helperTarget.confidence,
            verificationStatus: helperTarget.verificationStatus,
            basis: [...helperTarget.basis],
            usageTier: usage.usageTier,
            polls: helperTarget.pathPattern.includes("/stream"),
            pollCadenceMs: null,
            automatic: helperTarget.pathPattern.includes("/stream"),
            loadsLargeDatasets: payloadFlags.loadsLargeDatasets,
            usesPagination: payloadFlags.usesPagination,
            returnsWideRowsOrBlobsOrRawJson: payloadFlags.returnsWideRowsOrBlobsOrRawJson,
            fansOutQueries: payloadFlags.fansOutQueries,
            postgresAccess: "indirect",
            viewKinds: inferViewKinds(helperTarget.pathPattern, record.content),
            staticOnly: false,
          }),
        );
        ensureEdge(
          buildEdge({
            id: `proxies_to:${routeId}:${backendId}`,
            kind: "proxies_to",
            from: routeId,
            to: backendId,
            title: null,
            sourceFile: routeFile,
            sourceLocator: helperTarget.sourceLocator,
            provenance: helperTarget.provenance,
            confidence: helperTarget.confidence,
            verificationStatus: helperTarget.verificationStatus,
            basis: [...helperTarget.basis],
          }),
        );
      }

      const serverImports = imports.filter((entry) => isServerRepositoryImport(entry.source) && entry.resolvedFile);
      if (serverImports.length > 0) {
        const currentNode = nodes.get(routeId);
        if (currentNode) {
          currentNode.postgresAccess = "direct";
        }
      }
      for (const serverImport of serverImports) {
        const importSymbols = serverImport.namedImports.length > 0
          ? serverImport.namedImports
          : [serverImport.defaultImport ?? serverImport.namespaceImport ?? "module"];
        for (const symbol of importSymbols) {
          const repoId = buildRepoId(serverImport.resolvedFile ?? "", symbol);
          ensureNode(
            buildNode({
              id: repoId,
              kind: "repository_surface",
              title: `${symbol}`,
              pathPattern: null,
              symbol,
              sourceFile: serverImport.resolvedFile,
              sourceLocator: { line: serverImport.line, symbol },
              provenance: "static_scan",
              confidence: "high",
              verificationStatus: "verified",
              basis: ["static_scan:server_import"],
              usageTier: "manual",
              polls: false,
              pollCadenceMs: null,
              automatic: false,
              loadsLargeDatasets: false,
              usesPagination: false,
              returnsWideRowsOrBlobsOrRawJson: false,
              fansOutQueries: false,
              postgresAccess: "direct",
              viewKinds: [],
              staticOnly: false,
            }),
          );
          ensureEdge(
            buildEdge({
              id: `touches_repository:${routeId}:${repoId}`,
              kind: "touches_repository",
              from: routeId,
              to: repoId,
              title: null,
              sourceFile: routeFile,
              sourceLocator: { line: serverImport.line, symbol },
              provenance: "static_scan",
              confidence: "high",
              verificationStatus: "verified",
              basis: ["static_scan:route_server_import"],
            }),
          );
        }
      }
    }
  }

  for (const edgeOverride of ADMIN_API_REFERENCE_OVERRIDES.edgeOverrides) {
    ensureEdge(
      buildEdge({
        id: `${edgeOverride.kind}:${edgeOverride.from}:${edgeOverride.to}`,
        kind: edgeOverride.kind,
        from: edgeOverride.from,
        to: edgeOverride.to,
        title: edgeOverride.title ?? null,
        sourceFile: edgeOverride.sourceFile ?? null,
        sourceLocator: edgeOverride.sourceLocator ?? null,
        provenance: edgeOverride.provenance,
        confidence: edgeOverride.confidence,
        verificationStatus: edgeOverride.verificationStatus,
        basis: [...edgeOverride.basis],
      }),
    );
  }

  const nodeOverrides = new Map(ADMIN_API_REFERENCE_OVERRIDES.nodeOverrides.map((override) => [override.id, override]));
  let materializedNodes = [...nodes.values()]
    .map((node) => applyNodeOverride(node, nodeOverrides.get(node.id)))
    .sort((left, right) => left.id.localeCompare(right.id));
  const materializedEdges = [...edges.values()].sort((left, right) => left.id.localeCompare(right.id));
  const outboundByNode = new Map<string, AdminApiReferenceEdge[]>();
  for (const edge of materializedEdges) {
    const outbound = outboundByNode.get(edge.from) ?? [];
    outbound.push(edge);
    outboundByNode.set(edge.from, outbound);
  }

  materializedNodes = materializedNodes.map((node) => {
    const outbound = outboundByNode.get(node.id) ?? [];
    const updatedNode = { ...node };
    if (updatedNode.kind === "ui_surface" && updatedNode.id.startsWith("page:") && outbound.length === 0) {
      updatedNode.staticOnly = true;
      if (!updatedNode.basis.includes("derived:static_only_page")) {
        updatedNode.basis = [...updatedNode.basis, "derived:static_only_page"];
      }
    }
    updatedNode.payloadRisk = derivePayloadRisk(updatedNode);
    updatedNode.fanoutRisk = deriveFanoutRisk(updatedNode, outbound.length);
    return updatedNode;
  });

  const inventory: AdminApiReferenceInventory = {
    inventorySchemaVersion: ADMIN_API_REFERENCES_SCHEMA_VERSION,
    generatorVersion: ADMIN_API_REFERENCES_GENERATOR_VERSION,
    generatedAt: options?.generatedAt ?? new Date().toISOString(),
    sourceCommitSha: resolveCommitSha(projectRoot),
    overrideDigest: computeOverrideDigest(ADMIN_API_REFERENCE_OVERRIDES, [...manualIgnores.values()]),
    nodes: materializedNodes,
    edges: materializedEdges,
    indexes: buildIndexes(materializedNodes, materializedEdges),
  };

  const validationErrors = validateInventory(
    inventory,
    pageFiles,
    routeFiles,
    requestComponentIds,
    [...manualIgnores.values()],
  );
  if (validationErrors.length > 0) {
    throw new Error(`Admin API references validation failed:\n${validationErrors.join("\n")}`);
  }

  return inventory;
}

export function renderGeneratedAdminApiReferenceInventoryModule(
  projectRoot: string,
  options?: { generatedAt?: string },
): string {
  return buildGeneratedTypescriptModule(buildAdminApiReferenceInventory(projectRoot, options));
}

export function resolveProjectRootFromGeneratorFile(generatorFileUrl: string): string {
  const generatorDir = dirname(new URL(generatorFileUrl).pathname);
  const projectRoot = join(generatorDir, "..");
  if (!existsSync(join(projectRoot, PROJECT_ROOT_SENTINEL))) {
    throw new Error(`Could not resolve apps/web project root from ${generatorFileUrl}`);
  }
  return projectRoot;
}
