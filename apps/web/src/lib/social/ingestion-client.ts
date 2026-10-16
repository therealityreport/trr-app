"use client";

import createFetchClient from "openapi-fetch";
import createQueryClient from "openapi-react-query";
import { fetchAdminWithAuth } from "@/lib/admin/client-auth";
import { isDevAdminBypassEnabledClient } from "@/lib/admin/dev-admin-bypass";
import type { CatalogBackfillRequest, CatalogSyncRecentRequest, CatalogSyncNewerRequest } from "@/lib/admin/social-account-profile";
import type { components, paths } from "@/lib/server/trr-api/generated/openapi.v2";

export type IngestionLaunch = components["schemas"]["InstagramIngestionLaunchV2"];
export type IngestionProgress = components["schemas"]["InstagramIngestionProgressV2"];
export type IngestionCapabilities = components["schemas"]["InstagramIngestionCapabilitiesV2"];
export type IngestionDiagnostics = components["schemas"]["InstagramIngestionDiagnosticsV2"];
export type IngestionRetryTargets = components["schemas"]["InstagramRetryTargetsV2"];
export type IngestionReplay = components["schemas"]["InstagramReplayV2"];
export type IngestionReplayResult = components["schemas"]["InstagramReplayResultV2"];
export type IngestionStage = components["schemas"]["InstagramStageProgressV2"];
export type IngestionRecentRun = components["schemas"]["InstagramRecentRunV2"];
export type IngestionProblem = components["schemas"]["InstagramIngestionProblemV2"];
export const INGESTION_BASE = "/api/v2/admin/social/profiles/instagram/{handle}/ingestion" as const;

export class IngestionRequestError extends Error {
  constructor(public readonly problem: IngestionProblem) { super(problem.message); }
}

export function ingestionProxyPath(url: string): string {
  const pathname = new URL(url, "http://localhost");
  const match = pathname.pathname.match(/^\/api\/v2\/admin\/social\/profiles\/instagram\/([^/]+)\/ingestion\/(.+)$/);
  if (!match) throw new Error("Unsupported Instagram ingestion request");
  return `/api/admin/instagram-ingestion/${match[1]}/${match[2]}${pathname.search}`;
}

export const ingestionFetchClient = createFetchClient<paths>({
  // openapi-fetch creates absolute Requests; the transport sends only the local proxy URL.
  baseUrl: typeof window === "undefined" ? "http://localhost" : window.location.origin,
  fetch: async (request: Request) => {
    const response = await fetchAdminWithAuth(ingestionProxyPath(request.url), {
      method: request.method,
      headers: request.headers,
      body: request.method === "GET" ? undefined : await request.text(),
      signal: request.signal,
      cache: "no-store",
    }, { allowDevAdminBypass: isDevAdminBypassEnabledClient(), retryOnAuthError: request.method === "GET" });
    if (!response.ok) {
      const payload = await response.clone().json().catch(() => ({}));
      const detail = payload.detail;
      const retryHeader = response.headers.get("retry-after");
      const retryMs = retryHeader ? Number(retryHeader) * 1000 : undefined;
      throw new IngestionRequestError({
        code: typeof detail?.code === "string" ? detail.code : "INGESTION_REQUEST_FAILED",
        status: response.status,
        message: typeof detail?.message === "string" ? detail.message : "The ingestion request could not be completed.",
        retryable: Boolean(detail?.retryable ?? response.status >= 500),
        retry_after_ms: detail?.retry_after_ms ?? (Number.isFinite(retryMs) ? retryMs : null),
        request_id: detail?.request_id ?? null,
        trace_id: detail?.trace_id ?? null,
      });
    }
    return response;
  },
});
export const ingestionApi = createQueryClient(ingestionFetchClient);

export function ingestionErrorMessage(error: unknown): string {
  if (error instanceof IngestionRequestError) {
    const reference = error.problem.request_id ?? error.problem.trace_id;
    return `${error.message} (${error.problem.code})${reference ? ` · Reference ${reference}` : ""}`;
  }
  return "The request could not be confirmed. Retry uses the same request identity.";
}

/** Translate the existing operator dialog without sending legacy-only fields. */
export function ingestionLaunchFromCatalog(
  action: "backfill" | "sync_recent" | "sync_newer",
  request: CatalogBackfillRequest | CatalogSyncRecentRequest | CatalogSyncNewerRequest,
  fallbackScope: NonNullable<IngestionLaunch["source_scope"]>,
): IngestionLaunch {
  const requestedScope = "source_scope" in request ? request.source_scope ?? fallbackScope : fallbackScope;
  const sourceScope = requestedScope === "bravo" ? "network" : requestedScope;
  if (sourceScope !== "network" && sourceScope !== "creator" && sourceScope !== "community" && sourceScope !== "news") {
    throw new Error("Unsupported ingestion source scope.");
  }
  return {
    action, source_scope: sourceScope,
    force_catalog_rediscovery: false,
    enable_cap4_canary: "enable_cap4_canary" in request ? request.enable_cap4_canary ?? false : false,
    backfill_scope: "backfill_scope" in request ? request.backfill_scope : "full_history",
    lookback_days: "lookback_days" in request ? request.lookback_days : 1,
    date_start: "date_start" in request ? request.date_start : null,
    date_end: "date_end" in request ? request.date_end : null,
    selected_tasks: "selected_tasks" in request ? request.selected_tasks ?? ["post_details", "comments", "media"] : ["post_details", "comments", "media"],
    ...("detail_worker_count" in request ? { detail_worker_count: request.detail_worker_count } : {}),
    ...("comments_worker_count" in request ? { comments_worker_count: request.comments_worker_count } : {}),
    ...("comments_enable_media_followups" in request ? { comments_enable_media_followups: request.comments_enable_media_followups } : {}),
    ...("operator_confirmation" in request ? { operator_confirmation: request.operator_confirmation } : {}),
  };
}
