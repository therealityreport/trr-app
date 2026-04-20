type UpstreamDetail = {
  required_execution_backend?: string;
};

export type InstagramCommentsProxyErrorPayload = {
  error?: string;
  detail?: string;
  upstream_detail_code?: string;
  upstream_status?: number;
  upstream_detail?: unknown;
};

const readRequiredExecutionBackend = (
  payload: InstagramCommentsProxyErrorPayload | null | undefined,
): string | null => {
  const detail = payload?.upstream_detail;
  if (!detail || typeof detail !== "object") return null;
  const backend = (detail as UpstreamDetail).required_execution_backend;
  if (typeof backend !== "string" || !backend.trim()) return null;
  return backend.trim().toLowerCase();
};

const MODAL_GUIDANCE =
  "Instagram comments scraping is configured for Modal-backed execution. Verify Modal readiness with: " +
  "cd TRR-Backend && python3.11 scripts/modal/verify_modal_readiness.py --probe-remote-auth instagram --json";

export const readInstagramCommentsErrorMessage = (
  payload: InstagramCommentsProxyErrorPayload | null | undefined,
  fallback: string,
): string => {
  const code = typeof payload?.upstream_detail_code === "string" ? payload.upstream_detail_code : "";
  const requiredExecutionBackend = readRequiredExecutionBackend(payload);

  if (
    code === "SOCIAL_MODAL_EXECUTOR_REQUIRED" ||
    code === "SOCIAL_MODAL_DISPATCH_UNAVAILABLE" ||
    (code === "SOCIAL_WORKER_UNAVAILABLE" && requiredExecutionBackend === "modal") ||
    (code === "SOCIAL_REMOTE_JOB_PLANE_ENFORCED" && requiredExecutionBackend === "modal")
  ) {
    return MODAL_GUIDANCE;
  }
  if (code === "SOCIAL_WORKER_UNAVAILABLE") {
    return (
      "No Instagram comments worker is online. Start one with: " +
      "TRR_SOCIAL_INGEST_WORKER_ENABLED=1 TRR_SOCIAL_INGEST_WORKER_COMMENTS_SCRAPLING=1 ./scripts/start_remote_job_workers.sh"
    );
  }
  if (code === "instagram_comments_auth_failed") {
    return "Instagram session expired. Refresh cookies via scripts/socials/cookie_refresh_worker.py.";
  }
  if (typeof payload?.error === "string" && payload.error.trim()) return payload.error;
  if (typeof payload?.detail === "string" && payload.detail.trim()) return payload.detail;
  return fallback;
};
