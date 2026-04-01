import { parseCacheTtlMs } from "@/lib/server/admin/route-response-cache";

export const SURVEY_DETAIL_CACHE_NAMESPACE = "admin-survey-detail";
export const SURVEY_DETAIL_CACHE_TTL_MS = parseCacheTtlMs(
  process.env.TRR_ADMIN_SURVEY_DETAIL_CACHE_TTL_MS,
  15_000,
);

export const SURVEY_SEASON_CAST_CACHE_NAMESPACE = "admin-survey-season-cast";
export const SURVEY_SEASON_CAST_CACHE_TTL_MS = parseCacheTtlMs(
  process.env.TRR_ADMIN_SURVEY_SEASON_CAST_CACHE_TTL_MS,
  20_000,
);
