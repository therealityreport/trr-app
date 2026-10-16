import { expect, type Page, type Route } from "@playwright/test";
import type { components } from "../../src/lib/server/trr-api/generated/openapi.v2";
import { buildSeededTypographyRuntimeState } from "../../src/lib/server/admin/typography-seed";
import { mockAdminApi, waitForAdminReady } from "./admin-fixtures";

type Progress = components["schemas"]["InstagramIngestionProgressV2"];
type Launch = components["schemas"]["InstagramIngestionLaunchV2"];
type Diagnostics = components["schemas"]["InstagramIngestionDiagnosticsV2"];

export const OPERATOR_ORIGIN = "https://admin.trr.localhost";
export const OPERATOR_PATH = "/social/instagram/bravotv/catalog";
export const RUN_ID = "11111111-1111-4111-8111-111111111111";
export const HISTORY_ID = "22222222-2222-4222-8222-222222222222";
export const EVIDENCE_ID = "33333333-3333-4333-8333-333333333333";
export const EXPIRED_EVIDENCE_ID = "44444444-4444-4444-8444-444444444444";
const PREFIX = "/api/admin/instagram-ingestion/bravotv/";
const NOW = "2026-10-16T12:00:00.000Z";

const summary = {
  summary_detail: "full", platform: "instagram", account_handle: "bravotv",
  profile_url: "https://www.instagram.com/bravotv/", total_posts: 12,
  total_engagement: 1200, total_views: 5000, last_post_at: NOW,
  catalog_total_posts: 12, catalog_assigned_posts: 6, catalog_unassigned_posts: 2,
  catalog_pending_review_posts: 2, last_catalog_run_at: NOW, last_catalog_run_status: "completed",
  catalog_recent_runs: [], per_show_counts: [], per_season_counts: [],
  top_hashtags: [], top_collaborators: [], top_tags: [], source_status: [],
};

export function buildIngestionProgress(overrides: Partial<Progress> = {}): Progress {
  return {
    run_id: RUN_ID, account: "bravotv", intent_hash: "fixture-intent", engine: "dbos", execution_placement: "modal",
    workflow_version: "instagram-fixture-v1", state: "running", generation: 1,
    created_at: NOW, updated_at: NOW, last_committed_at: NOW, pinned_evidence_count: 0,
    complete: false, allowed_actions: ["cancel", "replay", "retry_targets"],
    intent: {
      platform: "instagram", account: "bravotv", action: "backfill", source_scope: "network",
      scope: "bounded_window", date_start: "2026-01-01T00:00:00Z", date_end: "2026-09-30T23:59:59.999Z",
      selected_tasks: ["post_details", "comments", "media"], metadata_ttl_days: 30,
      metrics_ttl_hours: 24, force: false, policy_version: 1, comments_enable_media_followups: true,
      comments_max_attempts: 12, listing_max_attempts: 12, media_max_attempts: 3, enable_cap4_canary: false,
    },
    stages: [{
      stage: "post_details", discovery_complete: false, sealed_at: null, total: 10,
      committed: 4, cached_satisfied: 2, source_unavailable: 1, unresolved: 3,
      attempts: 30, requests: 100, retry_at: null, blocked_reasons: [],
      last_committed_at: NOW, complete: false,
    }],
    ...overrides,
  };
}

const buildDiagnostics = (runId: string): Diagnostics => ({
  run_id: runId, account: "bravotv", targets_truncated: false, evidence_truncated: false,
  targets: [{ stage: "post_details", target_key: "post-fixture-1", outcome: "unresolved", attempts: 2, requests: 3, max_attempts: 12, retry_at: null, blocked_reason: "cooldown" }],
  evidence: [
    { evidence_id: EVIDENCE_ID, stage: "post_details", target_key: "post-fixture-1", source_identity: "post:fixture-1", captured_at: NOW, content_hash: "fixture-hash", available: true, expires_at: "2099-01-01T00:00:00Z", pinned: false, parser_version: "parser-fixture-v1", schema_version: 1 },
    { evidence_id: EXPIRED_EVIDENCE_ID, stage: "post_details", target_key: "expired-fixture", source_identity: "post:expired-fixture", captured_at: "2020-01-01T00:00:00Z", content_hash: "expired-fixture-hash", available: false, expires_at: "2020-01-02T00:00:00Z", pinned: false, parser_version: "parser-fixture-v1", schema_version: 1 },
  ],
});

type Command = { operation: string; key: string | undefined; body: Record<string, unknown> };

/** Browser-only fixture. No admin API request or mutation is forwarded. */
export class IngestionOperatorFixture {
  enabled = true;
  capabilitiesMissing = false;
  replayApplyEnabled = true;
  failProgressRequests = 0;
  loseNextLaunchResponse = false;
  expireNextReplay = false;
  commands: Command[] = [];
  legacyCommands: string[] = [];
  cacheInvalidations = 0;
  unexpectedWrites: string[] = [];
  reads: string[] = [];
  runs = new Map<string, Progress>();
  private identities = new Map<string, string>();
  private guardedContexts = new WeakSet<object>();

  seedRunning() { this.runs.set(RUN_ID, buildIngestionProgress()); }
  seedHistory() { this.runs.set(HISTORY_ID, buildIngestionProgress({ run_id: HISTORY_ID, state: "failed", allowed_actions: ["resume", "replay"], created_at: "2026-10-15T12:00:00Z" })); }

  async install(page: Page) {
    const context = page.context();
    if (!this.guardedContexts.has(context)) {
      this.guardedContexts.add(context);
      await context.route("**/*", async route => {
        if (!["GET", "HEAD", "OPTIONS"].includes(route.request().method())) {
          this.unexpectedWrites.push(`${route.request().method()} ${new URL(route.request().url()).origin}${new URL(route.request().url()).pathname}`);
          return route.abort("blockedbyclient");
        }
        return route.fallback();
      });
    }
    // Keep the shared admin fixture setup; the last page route owns this account.
    await mockAdminApi(page);
    await page.route("**/api/**", route => this.route(route));
  }

  async open(page: Page) {
    await this.install(page);
    await page.goto(`${OPERATOR_ORIGIN}${OPERATOR_PATH}`);
    await waitForAdminReady(page);
    await expect(page.getByRole("button", { name: "Backfill Posts", exact: true })).toBeVisible();
  }

  assertIsolated() { expect(this.unexpectedWrites, "All non-fixture writes must remain blocked").toEqual([]); }

  private async json(route: Route, body: unknown, status = 200) {
    return route.fulfill({ status, contentType: "application/json", headers: { "Cache-Control": "no-store" }, body: JSON.stringify(body) });
  }

  private async route(route: Route) {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const write = !["GET", "HEAD", "OPTIONS"].includes(request.method());
    if (url.origin !== OPERATOR_ORIGIN) {
      if (write) this.unexpectedWrites.push(`${request.method()} ${url.origin}${path}`);
      return route.abort("blockedbyclient");
    }
    if (!write) this.reads.push(path);
    if (path === "/api/design-system/typography" && !write) return this.json(route, buildSeededTypographyRuntimeState());
    if (path.startsWith(PREFIX)) {
      const operation = path.slice(PREFIX.length);
      if (write) return this.command(route, operation);
      if (operation === "capabilities") return this.capabilitiesMissing
        ? this.json(route, { detail: { code: "INGESTION_SERVICE_UNAVAILABLE", message: "Fixture service absent.", retryable: false } }, 503)
        : this.json(route, { enabled: this.enabled, account: "bravotv", engine: "dbos", workflow_version: "instagram-fixture-v1", supported_actions: ["backfill", "sync_recent", "sync_newer"], replay_apply_enabled: this.replayApplyEnabled });
      if (operation === "runs/recent") return this.json(route, { runs: [...this.runs.values()] });
      const match = operation.match(/^runs\/([^/]+)(\/diagnostics)?$/);
      if (match) {
        if (match[2]) return this.json(route, buildDiagnostics(match[1]));
        if (this.failProgressRequests > 0) { this.failProgressRequests--; return route.abort("connectionreset"); }
        return this.json(route, this.runs.get(match[1]) ?? {}, this.runs.has(match[1]) ? 200 : 404);
      }
      return this.json(route, { detail: { code: "FIXTURE_UNKNOWN_ROUTE", message: "Unknown fixture route." } }, 404);
    }
    if (write) {
      if (request.method() === "POST" && path === "/api/admin/trr-api/snapshots/invalidate") {
        this.cacheInvalidations++;
        return this.json(route, { ok: true });
      }
      if (path.endsWith("/catalog/backfill")) {
        this.legacyCommands.push(path);
        return this.json(route, { run_id: "legacy-fixture-run", status: "queued" }, 202);
      }
      this.unexpectedWrites.push(`${request.method()} ${path}`);
      return route.abort("blockedbyclient");
    }
    if (path.endsWith("/snapshot")) return this.json(route, { summary, catalog_run_progress: null, generated_at: NOW });
    if (path.endsWith("/summary")) return this.json(route, summary);
    if (path.endsWith("/cookies/health")) return this.json(route, { platform: "instagram", required: true, healthy: true, reason: null, refresh_supported: true, refresh_available: true, refresh_action: "instagram_auth_repair", refresh_label: "Manual Instagram Auth", source_kind: "default_file" });
    if (path.endsWith("/catalog/capacity")) return this.json(route, { available: true, blocked: false, safe_combined_worker_limit: 16, remaining_workers: 16, raw_requested_workers: 16, backend_effective_requested_workers: 16, effective_details_worker_count: 8, effective_comments_worker_count: 8, active_db_jobs: 0, dispatched_unclaimed_jobs: 0, nonterminal_remote_call_ids: [] });
    if (path.endsWith("/catalog/posts")) return this.json(route, { items: [], pagination: { page: 1, page_size: 25, total: 0, total_pages: 1 } });
    if (path.endsWith("/runs/recent")) return this.json(route, { runs: [] });
    if (path.startsWith("/api/admin/")) return this.json(route, {});
    // Unrelated API readers retain their own fallback behavior instead of
    // receiving a malformed successful payload. No request reaches the server.
    return this.json(route, { error: "Unconfigured browser fixture read" }, 503);
  }

  private async command(route: Route, operation: string) {
    const request = route.request();
    const key = request.headers()["idempotency-key"];
    const body = request.postDataJSON() as Record<string, unknown>;
    const match = operation.match(/^runs\/([^/]+)\/(cancel|resume|retry-targets|replay)$/);
    if (request.method() !== "POST" || !key || (operation !== "runs" && !match)) {
      this.unexpectedWrites.push(`${request.method()} ${PREFIX}${operation}`);
      return route.abort("blockedbyclient");
    }
    this.commands.push({ operation, key, body });
    if (operation === "runs") {
      const known = this.identities.get(key);
      const runId = known ?? RUN_ID;
      if (!known) {
        const defaults = buildIngestionProgress().intent;
        const launch = body as Launch;
        this.identities.set(key, runId);
        this.runs.set(runId, buildIngestionProgress({ intent: { ...defaults, ...launch, comments_enable_media_followups: launch.comments_enable_media_followups ?? defaults.comments_enable_media_followups } }));
      }
      if (this.loseNextLaunchResponse) { this.loseNextLaunchResponse = false; return route.abort("connectionreset"); }
      return this.json(route, { run_id: runId, state: this.runs.get(runId)!.state, engine: "dbos", workflow_version: "instagram-fixture-v1", generation: 1 }, 202);
    }
    const [, runId, action] = match!;
    const run = this.runs.get(runId)!;
    if (action === "replay") {
      if (this.expireNextReplay) { this.expireNextReplay = false; return this.json(route, { detail: { code: "EVIDENCE_EXPIRED", status: 410, message: "Evidence has expired.", retryable: false } }, 410); }
      return this.json(route, { mode: body.apply ? "apply" : "dry_run", evidence_id: body.evidence_id, parser_version: body.parser_version, comparison: { changed: true, before: { fixture: "old" }, after: { fixture: "reviewed" } }, writes: body.apply ? 1 : 0, source_requests: 0, receipt_id: body.apply ? "fixture-receipt" : null });
    }
    const state = action === "cancel" ? "cancelled" : "running";
    this.runs.set(runId, { ...run, state, generation: run.generation + (action === "resume" ? 1 : 0), allowed_actions: state === "cancelled" ? ["resume", "replay"] : ["cancel", "replay", "retry_targets"] });
    return this.json(route, { run_id: runId, state, engine: "dbos", workflow_version: "instagram-fixture-v1", generation: this.runs.get(runId)!.generation }, 202);
  }
}
