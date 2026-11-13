// Isolated rendering + protected FastAPI + real provider parser, using fixtures.
// No dev server, existing browser profile, imported auth state, or live provider.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { chromium } from "@playwright/test";

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const backendRoot = path.resolve(appRoot, "../../../TRR-Backend");
const origin = "https://admin.trr.localhost";
const endpoint = "/api/admin/trr-api/social/twitter/search";
const python = `
import json, resource, socket, sys
from pathlib import Path
from datetime import UTC, datetime, timedelta
import jwt
from fastapi.testclient import TestClient
from api.main import app
from trr_backend.socials.twitter import public_search
from trr_backend.socials.control_plane import runtime
import api.routers.socials.platform_scrape as routes
import trr_backend.socials.twitter.scraper as scraper
def forbidden(*args, **kwargs):
    raise AssertionError("Unexpected credentials, persistence, media, or network")
runtime._load_twitter_auth = runtime._load_twikit_credentials = forbidden
routes.persist_standalone_twitter_search = scraper.mirror_tweet_media = forbidden
socket.socket.connect = forbidden
fixture = Path("tests/fixtures/twitter/lurkbird-search.html").read_bytes()
calls = []
def fetch(url, **kwargs):
    calls.append(url)
    if sys.argv[1] == "blocked":
        return b"<html>challenge</html>"
    if sys.argv[1] == "partial" and len(calls) == 2:
        raise ValueError("Public search HTTP 429")
    return fixture
public_search._fetch = fetch
token = jwt.encode({"sub":"fixture-admin", "role":"service_role", "exp":datetime.now(UTC)+timedelta(minutes=5)},
                   "fixture-only-twitter-research-secret-123456", algorithm="HS256")
response = TestClient(app).post("/api/v1/admin/socials/twitter/search",
    json=json.load(sys.stdin), headers={"Authorization":"Bearer "+token})
peak_rss = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
peak_bytes = peak_rss if sys.platform == "darwin" else peak_rss * 1024
assert peak_bytes < 512*1024**2, "Fixture Python process exceeded its 512 MiB RSS budget"
print(json.dumps({"status":response.status_code, "body":response.json(), "provider_calls":len(calls)}))
`;

const bundle = await build({
  stdin: {
    contents: `import React from "react"; import {createRoot} from "react-dom/client";
      import Panel from "./src/components/admin/TwitterResearchPanel";
      createRoot(document.getElementById("root")).render(<Panel user={{uid:"fixture-admin"}} />);`,
    loader: "tsx", resolveDir: appRoot,
  },
  bundle: true, write: false, format: "iife", platform: "browser", jsx: "automatic",
  define: { "process.env.NODE_ENV": '"test"' },
  plugins: [{ name: "fixture-admin-client", setup(builder) {
    builder.onResolve({ filter: /^@\/lib\/admin\/client-auth$/ }, () => ({ path: "fixture-auth", namespace: "fixture" }));
    builder.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({
      contents: "export const fetchAdminWithAuth = (url, init) => fetch(url, init);", loader: "js",
    }));
  } }],
});

const browser = await chromium.launch({ headless: true, args: ["--js-flags=--max-old-space-size=512"] });
const sentinel = await browser.newContext();
const context = await browser.newContext();
const requests = [];
let scenario = "records";
let routeFailure = null;
try {
  await sentinel.addCookies([{ name: "test-sentinel", value: "preserved", url: origin }]);
  const sentinelPage = await sentinel.newPage();
  await sentinelPage.setContent("<p>Test-owned sentinel remains open</p>");
  assert.deepEqual(await context.cookies(), []);
  const handleRoute = async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    assert.equal(url.origin, origin, "Unexpected browser origin");
    if (url.pathname === "/_isolated/twitter-research") {
      await route.fulfill({ contentType: "text/html", body: `<div id="root"></div><script>${bundle.outputFiles[0].text}</script>` });
      return;
    }
    if (url.pathname !== endpoint || request.method() !== "POST") {
      await route.fulfill({ status: 404, body: "Fixture route not found" });
      return;
    }
    const body = request.postDataJSON();
    assert.equal(body.mode, "anonymous_research");
    assert.equal(body.provider, "lurkbird");
    const checked = spawnSync(path.join(backendRoot, ".venv/bin/python"), ["-c", python, scenario], {
      cwd: backendRoot, input: JSON.stringify(body), encoding: "utf8", timeout: 30_000,
      env: { PATH: "/usr/bin:/bin", PYTHONPATH: backendRoot, TRR_DISABLE_DOTENV: "1",
        SUPABASE_JWT_SECRET: "fixture-only-twitter-research-secret-123456",
        TRR_INTERNAL_ADMIN_ALLOW_SERVICE_ROLE: "1" },
    });
    assert.equal(checked.status, 0, checked.stderr);
    const result = JSON.parse(checked.stdout.trim().split("\n").at(-1));
    requests.push({ body, provider_calls: result.provider_calls, status: result.status });
    await route.fulfill({ status: result.status, contentType: "application/json", body: JSON.stringify(result.body) });
  };
  await context.route("**/*", async (route) => {
    try {
      await handleRoute(route);
    } catch (error) {
      routeFailure = error;
      await route.fulfill({ status: 500, contentType: "application/json", body: '{"error":"Fixture bridge failed"}' });
    }
  });
  const page = await context.newPage();
  await page.goto(`${origin}/_isolated/twitter-research`);
  await page.getByText("X research search", { exact: true }).click();
  assert.equal(requests.length, 0);
  assert.equal(await page.getByRole("textbox", { name: "Search query" }).isDisabled(), true);
  await page.getByRole("checkbox", { name: "Anonymous research" }).check();
  await page.getByRole("textbox", { name: "Search query" }).fill("Artemis");
  await page.getByRole("button", { name: "Search public posts" }).click();
  await page.waitForFunction(() => document.querySelector('[role="status"], [role="alert"]'));
  assert.equal(routeFailure, null, routeFailure?.message);
  await page.getByRole("status").filter({ hasText: "Partial results: 2 posts" }).waitFor();
  assert.equal(requests[0].provider_calls, 1);
  assert.equal(requests[0].body.max_items, 20);
  assert.equal(await page.getByText("@landusethot ty artemis", { exact: true }).count(), 1);

  scenario = "partial";
  await page.getByRole("combobox", { name: "Page limit" }).selectOption("2");
  await page.getByRole("button", { name: "Search public posts" }).click();
  await page.getByRole("alert").filter({ hasText: "Public search HTTP 429" }).waitFor();
  assert.equal(await page.getByText("@landusethot ty artemis", { exact: true }).count(), 1);
  assert.equal(requests[1].provider_calls, 2);

  scenario = "blocked";
  await page.getByRole("button", { name: "Search public posts" }).click();
  await page.getByRole("status").filter({ hasText: "Search unavailable or unverified" }).waitFor();
  assert.equal(await page.getByText("This does not prove there are no matching posts.", { exact: true }).count(), 1);
  assert.equal(requests.length, 3);
  await context.close();
  assert.equal(browser.contexts().length, 1);
  assert.equal(sentinelPage.isClosed(), false);
  assert.equal((await sentinel.cookies())[0].value, "preserved");
  console.log(JSON.stringify({ proof: "fixture browser to protected API to real adapter parser",
    next_proxy: "covered separately by Vitest", queries: requests.length,
    provider_calls: requests.map((entry) => entry.provider_calls),
    preserved_sentinel_context: true, imported_state: false, live_provider: false }));
} finally {
  if (browser.contexts().includes(context)) await context.close();
  await sentinel.close();
  await browser.close();
}
