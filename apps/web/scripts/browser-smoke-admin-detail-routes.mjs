#!/usr/bin/env node

import { chromium } from "@playwright/test";
import { mkdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

const DEFAULT_BASE_URL = "http://admin.localhost:3000";
const DEFAULT_TIMEOUT_MS = 45_000;
const DEFAULT_ROUTES = [
  {
    name: "social-detail",
    path: "/admin/social/instagram/thetraitorsus",
    expectedText: "thetraitorsus",
    waitForResponsePath: "/cookies/health",
    waitForResponseTimeoutMs: 35_000,
  },
  {
    name: "social-posts",
    path: "/admin/social/instagram/thetraitorsus/posts",
    expectedText: "thetraitorsus",
  },
  {
    name: "show-detail",
    path: "/admin/trr-shows/the-traitors",
    expectedText: "The Traitors",
    pendingTexts: ["Loading show data..."],
  },
  {
    name: "show-social",
    path: "/admin/trr-shows/the-traitors/social",
    expectedText: "The Traitors",
    pendingTexts: ["Loading show data..."],
  },
];

const args = process.argv.slice(2);
const readOption = (name, fallback = null) => {
  const prefix = `${name}=`;
  const inline = args.find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const index = args.indexOf(name);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith("--")) {
    return args[index + 1];
  }
  return fallback;
};

const baseUrl = readOption("--base-url", process.env.TRR_BROWSER_SMOKE_BASE_URL || DEFAULT_BASE_URL);
const headed = args.includes("--headed") || process.env.TRR_BROWSER_SMOKE_HEADED === "1";
const backgroundStubsEnabled =
  !args.includes("--no-background-stubs") && process.env.TRR_BROWSER_SMOKE_BACKGROUND_STUBS !== "0";
const fallbackAssertionEnabled =
  !args.includes("--skip-fallback-assertion") &&
  process.env.TRR_BROWSER_SMOKE_SHOW_FALLBACK_ASSERTION !== "0";
const backendPoolReportEnabled =
  !args.includes("--skip-backend-pool-report") && process.env.TRR_BROWSER_SMOKE_BACKEND_POOL_REPORT !== "0";
const bravoVideosAssertionEnabled =
  !args.includes("--skip-bravo-videos-assertion") &&
  !backgroundStubsEnabled &&
  process.env.TRR_BROWSER_SMOKE_BRAVO_VIDEOS_ASSERTION !== "0";
const cookieHealthAssertionEnabled =
  !args.includes("--skip-cookie-health-assertion") &&
  !backgroundStubsEnabled &&
  process.env.TRR_BROWSER_SMOKE_COOKIE_HEALTH_ASSERTION !== "0";
const consoleGatewayTimeoutAssertionEnabled =
  !args.includes("--skip-console-504-assertion") &&
  !backgroundStubsEnabled &&
  process.env.TRR_BROWSER_SMOKE_CONSOLE_504_ASSERTION !== "0";
const backendGatewayTimeoutAssertionEnabled =
  !args.includes("--skip-backend-504-assertion") &&
  !backgroundStubsEnabled &&
  backendPoolReportEnabled &&
  process.env.TRR_BROWSER_SMOKE_BACKEND_504_ASSERTION !== "0";
const routeArgs = args.filter((arg, index) => {
  if (arg.startsWith("--")) return false;
  const previous = args[index - 1];
  return previous !== "--base-url";
});
const routes =
  routeArgs.length > 0
    ? routeArgs.map((routePath, index) => ({
        name: `custom-${index + 1}`,
        path: routePath,
        expectedText: null,
        pendingTexts: ["Loading show data..."],
      }))
    : DEFAULT_ROUTES;

const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const outputDir =
  process.env.TRR_BROWSER_SMOKE_OUTPUT_DIR ||
  path.resolve(process.cwd(), "../../..", ".logs", "browser-smoke", `admin-detail-routes-${timestamp}`);
const backendLogPath =
  process.env.TRR_BROWSER_SMOKE_BACKEND_LOG ||
  path.resolve(process.cwd(), "../../..", ".logs", "workspace", "trr-backend.log");

const blockingTextPatterns = [
  /Application error/i,
  /Unhandled Runtime Error/i,
  /Failed to load show/i,
  /Failed to fetch show/i,
];

const buildRouteUrl = (routePath) => new URL(routePath, baseUrl).toString();

const sanitizeFilename = (value) => value.replace(/[^a-z0-9-]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();

const readFileSize = async (filePath) => {
  try {
    return (await stat(filePath)).size;
  } catch {
    return 0;
  }
};

const readFileFromOffset = async (filePath, offset) => {
  try {
    const buffer = await readFile(filePath);
    return buffer.subarray(Math.min(offset, buffer.length)).toString("utf8");
  } catch {
    return "";
  }
};

const maxNumberByLabel = (target, label, value) => {
  const numeric = Number.parseFloat(value);
  if (!Number.isFinite(numeric)) return;
  target[label] = Math.max(target[label] || 0, numeric);
};

const parseBackendPoolReport = (logText) => {
  const acquireFailed = new Map();
  const maxAcquireMsByLabel = {};
  const maxHeldMsByLabel = {};
  const backend504s = [];
  const statementTimeouts = [];

  for (const line of logText.split("\n")) {
    let match = line.match(/\[db-pool\] acquire_failed label=([^ ]+).*error=([^ ]+).*in_use=([^ ]+) available=([^ ]+)/);
    if (match) {
      const key = `${match[1]}|${match[2]}`;
      const previous = acquireFailed.get(key) || {
        label: match[1],
        error: match[2],
        count: 0,
        max_in_use: 0,
        min_available: Number.POSITIVE_INFINITY,
      };
      previous.count += 1;
      previous.max_in_use = Math.max(previous.max_in_use, Number.parseInt(match[3], 10) || 0);
      previous.min_available = Math.min(previous.min_available, Number.parseInt(match[4], 10) || 0);
      acquireFailed.set(key, previous);
      continue;
    }

    match = line.match(/\[db-pool\] checkout id=\d+ label=([^ ]+) acquire_ms=([0-9.]+)/);
    if (match) {
      maxNumberByLabel(maxAcquireMsByLabel, match[1], match[2]);
      continue;
    }

    match = line.match(/\[db-pool\] return id=\d+ label=([^ ]+) held_ms=([0-9.]+)/);
    if (match) {
      maxNumberByLabel(maxHeldMsByLabel, match[1], match[2]);
      continue;
    }

    match = line.match(/\[db-pool\] statement_timeout label=([^ ]+).*error=(.*)$/);
    if (match) {
      statementTimeouts.push({ label: match[1], error: match[2].slice(0, 240) });
      continue;
    }

    if (line.includes(" 504 Gateway Timeout")) {
      backend504s.push(line.slice(0, 500));
    }
  }

  const acquireFailures = [...acquireFailed.values()]
    .map((item) => ({
      ...item,
      min_available: Number.isFinite(item.min_available) ? item.min_available : null,
    }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label));

  return {
    acquire_failures: acquireFailures,
    max_acquire_ms_by_label: Object.fromEntries(
      Object.entries(maxAcquireMsByLabel).sort((left, right) => right[1] - left[1]).slice(0, 12),
    ),
    max_held_ms_by_label: Object.fromEntries(
      Object.entries(maxHeldMsByLabel).sort((left, right) => right[1] - left[1]).slice(0, 12),
    ),
    statement_timeouts: statementTimeouts.slice(-12),
    backend_504s: backend504s.slice(-12),
  };
};

const optionalBackgroundApiStub = (requestUrl) => {
  const url = new URL(requestUrl);
  const pathname = url.pathname;

  if (/^\/api\/admin\/trr-api\/shows\/[^/]+\/seasons$/.test(pathname)) {
    return {
      label: "show-seasons",
      body: { seasons: [], pagination: { limit: 50, offset: 0, count: 0 } },
    };
  }
  if (/^\/api\/admin\/trr-api\/shows\/[^/]+\/social-posts$/.test(pathname)) {
    return { label: "show-social-posts", body: { posts: [], items: [], pagination: { count: 0 } } };
  }
  if (/^\/api\/admin\/trr-api\/shows\/[^/]+\/links$/.test(pathname)) {
    return { label: "show-links", body: { links: [] } };
  }
  if (/^\/api\/admin\/trr-api\/shows\/[^/]+\/bravo\/videos$/.test(pathname)) {
    return { label: "show-bravo-videos", body: { videos: [], items: [] } };
  }
  if (pathname === "/api/admin/reddit/communities") {
    return { label: "reddit-communities", body: { communities: [] } };
  }
  if (/^\/api\/admin\/trr-api\/social\/profiles\/[^/]+\/[^/]+\/catalog\/freshness$/.test(pathname)) {
    return { label: "catalog-freshness", body: { status: "skipped", freshness: null } };
  }
  if (/^\/api\/admin\/trr-api\/social\/profiles\/[^/]+\/[^/]+\/catalog\/review-queue$/.test(pathname)) {
    return { label: "catalog-review-queue", body: { items: [], total: 0 } };
  }
  if (/^\/api\/admin\/trr-api\/social\/profiles\/[^/]+\/[^/]+\/hashtags$/.test(pathname)) {
    return { label: "social-hashtags", body: { hashtags: [], items: [] } };
  }

  return null;
};

const summarizeStubbedRequests = (stubbedRequests) => {
  const byLabel = new Map();
  for (const request of stubbedRequests) {
    byLabel.set(request.label, (byLabel.get(request.label) || 0) + 1);
  }
  return Object.fromEntries([...byLabel.entries()].sort(([left], [right]) => left.localeCompare(right)));
};

const isBravoVideosApiResponse = (responseUrl) => {
  try {
    const url = new URL(responseUrl);
    return /^\/api\/admin\/trr-api\/shows\/[^/]+\/bravo\/videos$/.test(url.pathname);
  } catch {
    return false;
  }
};

const fetchBravoVideosAssertionResponse = async (page) =>
  page.evaluate(async ({ baseUrl }) => {
    const resolveUrl = new URL("/api/admin/trr-api/shows/resolve-slug", baseUrl);
    resolveUrl.searchParams.set("slug", "the-traitors");
    const resolveResponse = await fetch(resolveUrl.toString(), { credentials: "include" });
    const resolveText = await resolveResponse.text();
    let resolvePayload = null;
    try {
      resolvePayload = JSON.parse(resolveText);
    } catch {
      return {
        url: resolveUrl.toString(),
        status: resolveResponse.status,
        error: `resolve-slug returned non-JSON: ${resolveText.slice(0, 240)}`,
      };
    }
    const showId = resolvePayload?.resolved?.show_id;
    if (!resolveResponse.ok || typeof showId !== "string" || showId.length === 0) {
      return {
        url: resolveUrl.toString(),
        status: resolveResponse.status,
        error: `resolve-slug failed: ${resolveText.slice(0, 240)}`,
      };
    }
    const bravoUrl = new URL(`/api/admin/trr-api/shows/${showId}/bravo/videos`, baseUrl);
    bravoUrl.searchParams.set("merge_person_sources", "true");
    const bravoResponse = await fetch(bravoUrl.toString(), { credentials: "include" });
    return {
      url: bravoUrl.toString(),
      status: bravoResponse.status,
      source: bravoResponse.headers.get("x-trr-bravo-videos-source"),
    };
  }, { baseUrl });

const assertBravoVideosNoGatewayTimeout = async (page, responses) => {
  const checkedResponses = responses.length > 0 ? responses : [await fetchBravoVideosAssertionResponse(page)];
  const assertionErrors = checkedResponses.filter((response) => response.error);
  if (assertionErrors.length > 0) {
    throw new Error(assertionErrors.map((response) => response.error).join("; "));
  }
  const gatewayTimeouts = checkedResponses.filter((response) => response.status === 504);
  if (gatewayTimeouts.length > 0) {
    throw new Error(
      `Bravo videos API returned 504 for ${gatewayTimeouts.map((response) => response.url).join(", ")}`,
    );
  }
  const failedResponses = checkedResponses.filter((response) => response.status >= 400);
  if (failedResponses.length > 0) {
    throw new Error(
      `Bravo videos API returned an error status: ${failedResponses
        .map((response) => `${response.status} ${response.url}`)
        .join(", ")}`,
    );
  }
  return {
    name: "bravo-videos-no-504",
    status: "passed",
    response_count: checkedResponses.length,
    statuses: checkedResponses.map((response) => response.status),
    source: checkedResponses.length === responses.length ? "observed-route-load" : "direct-api-check",
  };
};

const assertShowDetailFallback = async (page) => {
  const result = await page.evaluate(async ({ baseUrl }) => {
    const readJson = (text) => {
      try {
        return JSON.parse(text);
      } catch {
        return null;
      }
    };

    const resolveUrl = new URL("/api/admin/trr-api/shows/resolve-slug", baseUrl);
    resolveUrl.searchParams.set("slug", "the-traitors");
    const resolveResponse = await fetch(resolveUrl.toString(), { credentials: "include" });
    const resolveText = await resolveResponse.text();
    const resolvePayload = readJson(resolveText);
    if (!resolveResponse.ok) {
      return {
        name: "show-detail-local-fallback",
        status: "failed",
        step: "resolve-slug",
        error: `resolve-slug returned HTTP ${resolveResponse.status}: ${resolveText.slice(0, 240)}`,
      };
    }

    const showId = resolvePayload?.resolved?.show_id;
    if (typeof showId !== "string" || showId.length === 0) {
      return {
        name: "show-detail-local-fallback",
        status: "failed",
        step: "resolve-slug",
        error: "resolve-slug did not return resolved.show_id",
      };
    }

    const detailUrl = new URL(`/api/admin/trr-api/shows/${showId}`, baseUrl);
    detailUrl.searchParams.set("__trr_smoke_force_local_fallback", "1");
    const detailResponse = await fetch(detailUrl.toString(), { credentials: "include" });
    const detailText = await detailResponse.text();
    const detailPayload = readJson(detailText);
    const source = detailResponse.headers.get("x-trr-show-detail-source");
    const showName = detailPayload?.show?.name;
    if (!detailResponse.ok) {
      return {
        name: "show-detail-local-fallback",
        status: "failed",
        step: "show-detail",
        source,
        show_id: showId,
        error: `show-detail returned HTTP ${detailResponse.status}: ${detailText.slice(0, 240)}`,
      };
    }
    if (source !== "local-fallback") {
      return {
        name: "show-detail-local-fallback",
        status: "failed",
        step: "show-detail",
        source,
        show_id: showId,
        error: `expected x-trr-show-detail-source=local-fallback, got ${source || "missing"}`,
      };
    }
    if (typeof showName !== "string" || !showName.includes("The Traitors")) {
      return {
        name: "show-detail-local-fallback",
        status: "failed",
        step: "show-detail",
        source,
        show_id: showId,
        show_name: showName || null,
        error: "forced fallback response did not include The Traitors show data",
      };
    }

    return {
      name: "show-detail-local-fallback",
      status: "passed",
      source,
      show_id: showId,
      show_name: showName,
    };
  }, { baseUrl });

  if (result.status !== "passed") {
    throw new Error(result.error || `${result.name} failed`);
  }
  return result;
};

await mkdir(outputDir, { recursive: true });
const backendLogOffset = backendPoolReportEnabled ? await readFileSize(backendLogPath) : 0;

const browser = await chromium.launch({ headless: !headed });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const consoleErrors = [];
const pageErrors = [];
const stubbedRequests = [];
const bravoVideosResponses = [];
const cookieHealthResponses = [];
page.on("console", (message) => {
  if (message.type() === "error") {
    consoleErrors.push(message.text());
  }
});
page.on("pageerror", (error) => {
  pageErrors.push(error instanceof Error ? error.message : String(error));
});
page.on("response", (response) => {
  if (isBravoVideosApiResponse(response.url())) {
    bravoVideosResponses.push({
      url: response.url(),
      status: response.status(),
    });
  }
  try {
    const url = new URL(response.url());
    if (/^\/api\/admin\/trr-api\/social\/profiles\/[^/]+\/[^/]+\/cookies\/health$/.test(url.pathname)) {
      cookieHealthResponses.push({
        url: response.url(),
        status: response.status(),
        posts_auth: url.searchParams.get("posts_auth"),
      });
    }
  } catch {
    // Ignore non-URL response strings.
  }
});

if (backgroundStubsEnabled) {
  await page.route("**/api/admin/**", async (route) => {
    const request = route.request();
    const stub = optionalBackgroundApiStub(request.url());
    if (!stub) {
      await route.continue();
      return;
    }
    stubbedRequests.push({
      label: stub.label,
      method: request.method(),
      url: request.url(),
    });
    await route.fulfill({
      status: 200,
      headers: {
        "content-type": "application/json",
        "x-trr-browser-smoke-stub": stub.label,
      },
      body: JSON.stringify(stub.body),
    });
  });
}

const results = [];
const assertions = [];

try {
  for (const route of routes) {
    const url = buildRouteUrl(route.path);
    const startedAt = Date.now();
    let status = "passed";
    let error = null;
    let finalUrl = url;
    const awaitedResponses = [];
    const screenshot = path.join(outputDir, `${sanitizeFilename(route.name)}.png`);

    try {
      const responsePaths = route.waitForResponsePaths || (route.waitForResponsePath ? [route.waitForResponsePath] : []);
      const responseWait =
        responsePaths.length > 0
          ? page
              .waitForResponse((response) => responsePaths.some((responsePath) => response.url().includes(responsePath)), {
                timeout: route.waitForResponseTimeoutMs || DEFAULT_TIMEOUT_MS,
              })
              .then((response) => {
                awaitedResponses.push({
                  url: response.url(),
                  status: response.status(),
                });
              })
              .catch((caught) => {
                awaitedResponses.push({
                  url_contains_any: responsePaths,
                  error: caught instanceof Error ? caught.message : String(caught),
                });
              })
          : null;
      const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: DEFAULT_TIMEOUT_MS });
      if (!response) {
        throw new Error("Navigation produced no response");
      }
      if (response.status() >= 400) {
        throw new Error(`Navigation failed with HTTP ${response.status()}`);
      }
      await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => undefined);
      if (route.expectedText) {
        await page.getByText(route.expectedText, { exact: false }).first().waitFor({ timeout: 30_000 });
      } else {
        await page.waitForFunction(() => document.body.innerText.trim().length > 0, null, { timeout: 30_000 });
      }
      if (responseWait) {
        await responseWait;
        const awaitedFailure = awaitedResponses.find((awaitedResponse) => {
          if (awaitedResponse.error) return true;
          return typeof awaitedResponse.status === "number" && awaitedResponse.status >= 400;
        });
        if (awaitedFailure) {
          throw new Error(
            awaitedFailure.error ||
              `Awaited response returned HTTP ${awaitedFailure.status}: ${awaitedFailure.url}`,
          );
        }
      }
      for (const pendingText of route.pendingTexts || []) {
        await page
          .waitForFunction((text) => !document.body.innerText.includes(text), pendingText, { timeout: 15_000 })
          .catch(() => {
            throw new Error(`Page stayed on "${pendingText}"`);
          });
      }
      const bodyText = await page.locator("body").innerText({ timeout: 5_000 });
      const blockingPattern = blockingTextPatterns.find((pattern) => pattern.test(bodyText));
      if (blockingPattern) {
        throw new Error(`Page contains blocking text matching ${blockingPattern}`);
      }
      finalUrl = page.url();
    } catch (caught) {
      status = "failed";
      error = caught instanceof Error ? caught.message : String(caught);
      finalUrl = page.url();
    } finally {
      await page.screenshot({ path: screenshot, fullPage: true }).catch(() => undefined);
      results.push({
        name: route.name,
        path: route.path,
        status,
        final_url: finalUrl,
        elapsed_ms: Date.now() - startedAt,
        screenshot,
        ...(awaitedResponses.length > 0 ? { awaited_responses: awaitedResponses } : {}),
        ...(error ? { error } : {}),
      });
      console.log(
        `[browser-smoke] ${status.toUpperCase()} ${route.name} ${route.path} -> ${finalUrl}`,
      );
      if (error) console.log(`[browser-smoke]   ${error}`);
    }
  }

  if (fallbackAssertionEnabled) {
    try {
      const assertion = await assertShowDetailFallback(page);
      assertions.push(assertion);
      console.log(`[browser-smoke] PASSED ${assertion.name} source=${assertion.source}`);
    } catch (caught) {
      const assertion = {
        name: "show-detail-local-fallback",
        status: "failed",
        error: caught instanceof Error ? caught.message : String(caught),
      };
      assertions.push(assertion);
      console.log(`[browser-smoke] FAILED ${assertion.name}`);
      console.log(`[browser-smoke]   ${assertion.error}`);
    }
  }

  if (bravoVideosAssertionEnabled) {
    try {
      const assertion = await assertBravoVideosNoGatewayTimeout(page, bravoVideosResponses);
      assertions.push(assertion);
      console.log(
        `[browser-smoke] PASSED ${assertion.name} source=${assertion.source} responses=${assertion.response_count} statuses=${assertion.statuses.join(",")}`,
      );
    } catch (caught) {
      const assertion = {
        name: "bravo-videos-no-504",
        status: "failed",
        error: caught instanceof Error ? caught.message : String(caught),
      };
      assertions.push(assertion);
      console.log(`[browser-smoke] FAILED ${assertion.name}`);
      console.log(`[browser-smoke]   ${assertion.error}`);
    }
  }

  if (cookieHealthAssertionEnabled) {
    const postsAuthResponses = cookieHealthResponses.filter((response) => response.posts_auth === "true");
    if (postsAuthResponses.length > 0) {
      const assertion = {
        name: "cookie-health-no-default-posts-auth",
        status: "failed",
        error: `Cookie health called posts_auth=true by default: ${postsAuthResponses.map((response) => response.url).join(", ")}`,
      };
      assertions.push(assertion);
      console.log(`[browser-smoke] FAILED ${assertion.name}`);
      console.log(`[browser-smoke]   ${assertion.error}`);
    } else {
      const assertion = {
        name: "cookie-health-no-default-posts-auth",
        status: "passed",
        response_count: cookieHealthResponses.length,
        statuses: cookieHealthResponses.map((response) => response.status),
      };
      assertions.push(assertion);
      console.log(
        `[browser-smoke] PASSED ${assertion.name} responses=${assertion.response_count} statuses=${assertion.statuses.join(",")}`,
      );
    }
  }

  if (consoleGatewayTimeoutAssertionEnabled) {
    const gatewayTimeoutErrors = consoleErrors.filter(
      (error) => error.includes("504") || /gateway timeout/i.test(error),
    );
    if (gatewayTimeoutErrors.length > 0) {
      const assertion = {
        name: "console-no-504",
        status: "failed",
        error: `Console reported 504/Gateway Timeout errors: ${gatewayTimeoutErrors.join(" | ")}`,
      };
      assertions.push(assertion);
      console.log(`[browser-smoke] FAILED ${assertion.name}`);
      console.log(`[browser-smoke]   ${assertion.error}`);
    } else {
      const assertion = {
        name: "console-no-504",
        status: "passed",
        console_error_count: consoleErrors.length,
      };
      assertions.push(assertion);
      console.log(`[browser-smoke] PASSED ${assertion.name} console_errors=${assertion.console_error_count}`);
    }
  }
} finally {
  await browser.close();
}

const backendPoolReport = backendPoolReportEnabled
  ? parseBackendPoolReport(await readFileFromOffset(backendLogPath, backendLogOffset))
  : null;

if (backendGatewayTimeoutAssertionEnabled) {
  const backendGatewayTimeouts = backendPoolReport?.backend_504s ?? [];
  if (backendGatewayTimeouts.length > 0) {
    const assertion = {
      name: "backend-no-504",
      status: "failed",
      error: `Backend log reported 504 Gateway Timeout responses: ${backendGatewayTimeouts.join(" | ")}`,
    };
    assertions.push(assertion);
    console.log(`[browser-smoke] FAILED ${assertion.name}`);
    console.log(`[browser-smoke]   ${assertion.error}`);
  } else {
    const assertion = {
      name: "backend-no-504",
      status: "passed",
      backend_504_count: 0,
    };
    assertions.push(assertion);
    console.log(`[browser-smoke] PASSED ${assertion.name} backend_504s=0`);
  }
}

const failedRoutes = results.filter((result) => result.status !== "passed");
const failedAssertions = assertions.filter((assertion) => assertion.status !== "passed");
const summary = {
  base_url: baseUrl,
  output_dir: outputDir,
  passed: results.length - failedRoutes.length + assertions.length - failedAssertions.length,
  failed: failedRoutes.length + failedAssertions.length,
  routes: results,
  assertions,
  background_stubs: {
    enabled: backgroundStubsEnabled,
    count: stubbedRequests.length,
    by_label: summarizeStubbedRequests(stubbedRequests),
  },
  backend_pool_report: {
    enabled: backendPoolReportEnabled,
    log_path: backendLogPath,
    ...(backendPoolReport ?? {}),
  },
  console_errors: consoleErrors,
  page_errors: pageErrors,
};

console.log(JSON.stringify(summary, null, 2));

if (failedRoutes.length > 0 || failedAssertions.length > 0) {
  process.exitCode = 1;
}
