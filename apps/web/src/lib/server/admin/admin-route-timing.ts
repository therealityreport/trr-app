import "server-only";

import type { NextResponse } from "next/server";

type AdminRouteTiming = {
  routeFamily: string;
  routeName?: string;
  cacheStatus?: string | null;
  startedAt?: number;
  totalMs?: number;
  backendMs?: number | null;
  databaseMs?: number | null;
};

const normalizeDuration = (value: number | null | undefined): number | null => {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.max(0, Math.round(value));
};

const timingMetric = (name: string, value: number | null | undefined): string | null => {
  const duration = normalizeDuration(value);
  return duration === null ? null : `${name};dur=${duration}`;
};

export const attachAdminRouteTiming = (
  response: NextResponse,
  timing: AdminRouteTiming,
): NextResponse => {
  const totalMs =
    normalizeDuration(timing.totalMs) ??
    normalizeDuration(
      typeof timing.startedAt === "number" ? performance.now() - timing.startedAt : null,
    ) ??
    0;
  const backendMs = normalizeDuration(timing.backendMs);
  const databaseMs = normalizeDuration(timing.databaseMs);
  const metrics = [
    timingMetric("trr_admin_route", totalMs),
    timingMetric("trr_admin_backend", backendMs),
    timingMetric("trr_admin_db", databaseMs),
  ].filter((entry): entry is string => Boolean(entry));
  const existingServerTiming = response.headers.get("Server-Timing");
  response.headers.set(
    "Server-Timing",
    existingServerTiming ? `${existingServerTiming}, ${metrics.join(", ")}` : metrics.join(", "),
  );
  response.headers.set("x-trr-admin-route-ms", String(totalMs));
  if (backendMs !== null) {
    response.headers.set("x-trr-admin-backend-ms", String(backendMs));
  }
  if (databaseMs !== null) {
    response.headers.set("x-trr-admin-db-ms", String(databaseMs));
  }
  console.info("[admin-route-timing]", {
    route_family: timing.routeFamily,
    route_name: timing.routeName ?? null,
    cache_status: timing.cacheStatus ?? null,
    backend_ms: backendMs,
    database_ms: databaseMs,
    total_ms: totalMs,
  });
  return response;
};
