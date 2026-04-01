import { parseCacheTtlMs } from "@/lib/server/admin/route-response-cache";

export const NETWORKS_STREAMING_SUMMARY_CACHE_NAMESPACE = "admin-networks-streaming-summary";
export const NETWORKS_STREAMING_DETAIL_CACHE_NAMESPACE = "admin-networks-streaming-detail";

export const NETWORKS_STREAMING_SUMMARY_CACHE_TTL_MS = parseCacheTtlMs(
  process.env.TRR_ADMIN_NETWORKS_STREAMING_SUMMARY_CACHE_TTL_MS,
  5_000,
);

export const NETWORKS_STREAMING_DETAIL_CACHE_TTL_MS = parseCacheTtlMs(
  process.env.TRR_ADMIN_NETWORKS_STREAMING_DETAIL_CACHE_TTL_MS,
  10_000,
);
