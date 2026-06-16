import "server-only";

import {
  PORTLESS_ADMIN_DASHBOARD_URL,
  PORTLESS_API_ORIGIN,
  PORTLESS_APP_ORIGIN,
} from "@/lib/admin/admin-url-defaults";
import { getWorkspaceRoot, safeExec } from "@/lib/server/admin/shell-exec";

const TRR_ROUTE_NAMES = new Set(["trr", "admin.trr", "api.trr", "wordle.trr"]);
const EXPECTED_ROUTES = [
  {
    id: "trr",
    label: "App",
    url: PORTLESS_APP_ORIGIN,
    expectedPath: "/",
  },
  {
    id: "admin.trr",
    label: "Admin",
    url: PORTLESS_ADMIN_DASHBOARD_URL,
    expectedPath: "/admin",
  },
  {
    id: "api.trr",
    label: "API",
    url: `${PORTLESS_API_ORIGIN}/health/live`,
    expectedPath: "/health/live",
  },
  {
    id: "wordle.trr",
    label: "Wordle",
    url: "https://wordle.trr.localhost",
    expectedPath: "/",
  },
] as const;

export interface PortlessRouteStatus {
  url: string;
  name: string;
  target: string;
  kind: string;
}

export interface PortlessStatusSnapshot {
  status: "ok" | "unavailable";
  checked_at: string;
  routes: Array<{
    id: string;
    label: string;
    url: string;
    expectedPath: string;
    target: string | null;
    kind: string | null;
    present: boolean;
    staticAlias: boolean;
  }>;
  static_alias_count: number;
  uses_static_aliases: boolean;
  repair_command: string;
  open_admin_command: string;
  raw_error?: string;
}

function routeNameFromUrl(url: string) {
  try {
    const hostname = new URL(url).hostname;
    return hostname.endsWith(".localhost") ? hostname.slice(0, -".localhost".length) : hostname;
  } catch {
    return url;
  }
}

export function parsePortlessList(output: string): PortlessRouteStatus[] {
  return output
    .split("\n")
    .map((line) => line.trim())
    .map((line) => {
      const match = line.match(/^(https?:\/\/\S+)\s+->\s+(.+?)(?:\s+\(([^)]+)\))?$/);
      if (!match) return null;
      const [, url, target, kind = "managed"] = match;
      const normalizedKind = kind.trim() === "alias" ? "alias" : "managed";
      return {
        url,
        name: routeNameFromUrl(url),
        target: target.trim(),
        kind: normalizedKind,
      };
    })
    .filter((route): route is PortlessRouteStatus => Boolean(route));
}

export function buildPortlessStatusSnapshot(input: {
  routes: PortlessRouteStatus[];
  exitCode: number;
  stderr?: string;
  checkedAt?: string;
}): PortlessStatusSnapshot {
  const routeByName = new Map(input.routes.map((route) => [route.name, route]));
  const expectedRoutes = EXPECTED_ROUTES.map((expected) => {
    const route = routeByName.get(expected.id);
    const wildcardFallback =
      expected.id === "admin.trr" && !route && routeByName.get("trr")?.kind !== "alias"
        ? routeByName.get("trr")
        : null;
    return {
      id: expected.id,
      label: expected.label,
      url: expected.url,
      expectedPath: expected.expectedPath,
      target: route?.target ?? wildcardFallback?.target ?? null,
      kind: wildcardFallback ? "wildcard" : route?.kind ?? null,
      present: Boolean(route || wildcardFallback),
      staticAlias: route?.kind === "alias",
    };
  });
  const staticAliasCount = input.routes.filter((route) => TRR_ROUTE_NAMES.has(route.name) && route.kind === "alias").length;

  return {
    status: input.exitCode === 0 ? "ok" : "unavailable",
    checked_at: input.checkedAt ?? new Date().toISOString(),
    routes: expectedRoutes,
    static_alias_count: staticAliasCount,
    uses_static_aliases: staticAliasCount > 0,
    repair_command: "make portless-repair",
    open_admin_command: "make open-admin",
    raw_error: input.exitCode === 0 ? undefined : input.stderr,
  };
}

export async function getPortlessStatus(): Promise<PortlessStatusSnapshot> {
  const result = await safeExec("portless", ["list"], getWorkspaceRoot(), 5_000);
  const routes = result.exitCode === 0 ? parsePortlessList(result.stdout) : [];
  return buildPortlessStatusSnapshot({
    routes,
    exitCode: result.exitCode,
    stderr: result.stderr,
  });
}
