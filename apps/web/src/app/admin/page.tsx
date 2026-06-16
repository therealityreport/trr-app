"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import ClientOnly from "@/components/ClientOnly";
import AdminBreadcrumbs from "@/components/admin/AdminBreadcrumbs";
import AdminGlobalHeader from "@/components/admin/AdminGlobalHeader";
import AdminGlobalSearch from "@/components/admin/AdminGlobalSearch";
import { Button } from "@/components/ui/button";
import { buildAdminRootBreadcrumb } from "@/lib/admin/admin-breadcrumbs";
import { fetchAdminWithAuth } from "@/lib/admin/client-auth";
import { ADMIN_DASHBOARD_TOOLS } from "@/lib/admin/admin-navigation";
import {
  PORTLESS_ADMIN_DASHBOARD_URL,
  PORTLESS_ADMIN_ORIGIN,
  PORTLESS_API_ORIGIN,
  PORTLESS_APP_ORIGIN,
} from "@/lib/admin/admin-url-defaults";
import { useAdminGuard } from "@/lib/admin/useAdminGuard";

const RECENT_UPDATES = [
  "Survey exports now route through the shared survey registry.",
  "Typography coverage is documented in the design-system and design-docs surfaces.",
  "Display-name based access is still the only path into the admin workspace.",
] as const;

const STATUS_NOTES = [
  "Use global search first when you already know the show, person, or episode.",
  "Open Design Docs for composition guidance before rebuilding dense UI.",
  "Use Settings and Users for access work instead of editing local state directly.",
] as const;
const ACCENT = "#7A0307";
const ADMIN_DASHBOARD_BUTTON_CLASS =
  "rounded-none border-black bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-black hover:bg-black hover:text-white";

type DbPressureSnapshot = {
  status?: string;
  reason?: string;
  application_name?: string;
  db_configured?: boolean;
  vercel_pool_attached?: boolean;
  pool_max?: number;
  max_concurrent_operations?: number;
  active_permit_count?: number;
  queued_operation_count?: number;
  pool_total_count?: number;
  pool_idle_count?: number;
  pool_waiting_count?: number;
  backend_db_pressure?: {
    status?: string;
    reason?: string;
    application_name?: string;
    db_configured?: boolean;
    upstream_status?: number;
    pools?: Array<{
      pool_name?: string;
      pressure_state?: string;
      reason?: string;
    }>;
  };
};

type PortlessRouteStatus = {
  id: string;
  label: string;
  url: string;
  expectedPath: string;
  target: string | null;
  kind: string | null;
  present: boolean;
  staticAlias: boolean;
};

type PortlessStatusSnapshot = {
  status: "ok" | "unavailable";
  checked_at: string;
  routes: PortlessRouteStatus[];
  static_alias_count: number;
  uses_static_aliases: boolean;
  repair_command: string;
  open_admin_command: string;
  raw_error?: string;
};

const TRANSIENT_BACKEND_PRESSURE_REASONS = new Set([
  "pool_capacity",
  "pool_near_capacity",
  "session_pool_capacity",
]);

function isPortlessHost() {
  if (typeof window === "undefined") return false;
  const hostname = window.location.hostname;
  return hostname === "trr.localhost" || hostname.endsWith(".trr.localhost");
}

function isWrongAdminHost() {
  if (typeof window === "undefined") return false;
  return window.location.hostname !== "admin.trr.localhost";
}

function summarizePressurePools(backendSnapshot?: DbPressureSnapshot["backend_db_pressure"]) {
  const pools = backendSnapshot?.pools ?? [];
  const saturatedPools = pools
    .filter((pool) => pool.pressure_state === "saturated")
    .map((pool) => pool.pool_name)
    .filter(Boolean);
  if (saturatedPools.length > 0) return saturatedPools.join(", ");

  const pressuredPools = pools
    .filter((pool) => pool.pressure_state && !["ok", "unconfigured"].includes(pool.pressure_state))
    .map((pool) => pool.pool_name)
    .filter(Boolean);
  return pressuredPools.length > 0 ? pressuredPools.join(", ") : null;
}

function ConnectionBudgetCard() {
  const [snapshot, setSnapshot] = useState<DbPressureSnapshot | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetchAdminWithAuth("/api/admin/health/app-db-pressure", {
          cache: "no-store",
        }, { allowDevAdminBypass: true });
        if (!response.ok) throw new Error(`status ${response.status}`);
        const payload = (await response.json()) as DbPressureSnapshot;
        if (!cancelled) {
          setSnapshot(payload);
          setState("ready");
        }
      } catch {
        if (!cancelled) {
          setSnapshot(null);
          setState("error");
        }
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const queueDepth = snapshot?.queued_operation_count ?? 0;
  const waitingClients = snapshot?.pool_waiting_count ?? 0;
  const statusLabel = state === "ready" && queueDepth === 0 && waitingClients === 0 ? "OK" : state.toUpperCase();

  return (
    <section className="rounded-[1.8rem] border border-black bg-white p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em]" style={{ color: ACCENT }}>
            DB budget
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-black">
            App pool pressure
          </h2>
        </div>
        <span className="rounded-full border border-black px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-black">
          {statusLabel}
        </span>
      </div>
      <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
        {[
          ["Pool max", snapshot?.pool_max ?? "-"],
          ["Max ops", snapshot?.max_concurrent_operations ?? "-"],
          ["Active", snapshot?.active_permit_count ?? "-"],
          ["Queued", snapshot?.queued_operation_count ?? "-"],
          ["Clients", snapshot?.pool_total_count ?? "-"],
          ["Idle", snapshot?.pool_idle_count ?? "-"],
        ].map(([label, value]) => (
          <div key={label} className="border border-black px-3 py-3">
            <dt className="text-[10px] font-semibold uppercase tracking-[0.18em] text-black/50">{label}</dt>
            <dd className="mt-1 text-lg font-semibold text-black">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 break-words text-xs leading-6 text-black/60">
        {snapshot?.application_name ?? "No app pool snapshot yet"}
        {snapshot?.vercel_pool_attached ? " - Vercel pool attached" : ""}
      </p>
    </section>
  );
}

function BackendEnvironmentReadinessCard() {
  const [snapshot, setSnapshot] = useState<DbPressureSnapshot | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [portlessActive, setPortlessActive] = useState(false);
  const autoRefreshAttemptedRef = useRef(false);

  useEffect(() => {
    setPortlessActive(isPortlessHost());
  }, []);

  useEffect(() => {
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    const load = async () => {
      setState("loading");
      try {
        const response = await fetchAdminWithAuth("/api/admin/health/app-db-pressure", {
          cache: "no-store",
        }, { allowDevAdminBypass: true });
        if (!response.ok) throw new Error(`status ${response.status}`);
        const payload = (await response.json()) as DbPressureSnapshot;
        if (!cancelled) {
          setSnapshot(payload);
          setState("ready");
          const backendSnapshot = payload.backend_db_pressure;
          const shouldRetryTransientPressure =
            backendSnapshot?.status === "degraded" &&
            Boolean(backendSnapshot.reason && TRANSIENT_BACKEND_PRESSURE_REASONS.has(backendSnapshot.reason));
          if (shouldRetryTransientPressure && !autoRefreshAttemptedRef.current) {
            autoRefreshAttemptedRef.current = true;
            retryTimer = setTimeout(() => {
              if (!cancelled) setRefreshNonce((current) => current + 1);
            }, 1500);
          }
        }
      } catch {
        if (!cancelled) {
          setSnapshot(null);
          setState("error");
        }
      }
    };
    void load();
    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [refreshNonce]);

  const backendSnapshot = snapshot?.backend_db_pressure;
  const backendStatus = backendSnapshot?.status;
  const backendReachable = Boolean(backendSnapshot && backendStatus !== "unavailable");
  const backendReady = backendStatus === "ok";
  const backendReason = backendSnapshot?.reason;
  const pressurePoolNames = summarizePressurePools(backendSnapshot);
  const appDatabaseReady = snapshot?.db_configured === true;
  const appPoolAttached = snapshot?.vercel_pool_attached === true;
  const shouldRequireVercelPool = process.env.NODE_ENV === "production";
  const readinessLabel =
    state === "loading"
      ? "Checking"
      : state === "error"
        ? "Backend unavailable"
        : !backendReachable
          ? "Backend unavailable"
          : !backendReady
            ? "Backend degraded"
            : !appDatabaseReady
              ? "App DB URL missing"
              : shouldRequireVercelPool && !appPoolAttached
                ? "Vercel pool detached"
                : "Ready";
  const readinessDetail =
    state === "loading"
      ? "Checking the admin backend and database pool contract."
      : state === "error"
        ? "Admin could not load backend health. In local dev this usually means the backend is down or TRR_DB_URL is missing."
        : !backendReachable
          ? `Admin reached the app health route, but backend pressure details are unavailable${backendReason ? ` (${backendReason})` : ""}.`
          : !backendReady
            ? `Backend health is reachable, but database pool pressure is degraded${pressurePoolNames ? ` in ${pressurePoolNames}` : ""}${backendReason ? ` (${backendReason})` : ""}.`
          : !appDatabaseReady
            ? "Backend health is reachable, but the app process is missing its database URL."
            : shouldRequireVercelPool && !appPoolAttached
              ? "Backend health is reachable. The Vercel pool attachment is not reported on this app-process snapshot."
              : "Backend health and app database configuration are reported as ready.";
  const readinessRows = [
    [
      "Backend API",
      state === "error" ? "Unavailable" : state === "loading" ? "Checking" : backendReachable ? "Reachable" : "Unavailable",
    ],
    ["App DB URL", state === "ready" ? (appDatabaseReady ? "Configured" : "Missing") : "-"],
    ["Vercel pool", state === "ready" ? (appPoolAttached ? "Attached" : "Not attached") : "-"],
    ["Portless", portlessActive ? "Active" : "Loopback"],
    ["App name", snapshot?.application_name ?? backendSnapshot?.application_name ?? "No snapshot"],
  ] as const;

  return (
    <section className="rounded-[1.8rem] border border-black bg-white p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em]" style={{ color: ACCENT }}>
            Backend readiness
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-black">
            Environment check
          </h2>
        </div>
        <span className="rounded-none border border-black px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-black">
          {readinessLabel}
        </span>
      </div>
      <p className="mt-4 text-sm leading-7 text-black/70">{readinessDetail}</p>
      <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
        {readinessRows.map(([label, value]) => (
          <div key={label} className="border border-black px-3 py-3">
            <dt className="text-[10px] font-semibold uppercase tracking-[0.18em] text-black/50">{label}</dt>
            <dd className="mt-1 text-sm font-semibold text-black">{value}</dd>
          </div>
        ))}
      </dl>
      <Button
        onClick={() => {
          autoRefreshAttemptedRef.current = false;
          setRefreshNonce((current) => current + 1);
        }}
        disabled={state === "loading"}
        size="sm"
        variant="outline"
        className={`mt-5 ${ADMIN_DASHBOARD_BUTTON_CLASS}`}
      >
        {state === "loading" ? "Checking..." : "Refresh readiness"}
      </Button>
    </section>
  );
}

function PortlessUrlCard() {
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);
  const [wrongAdminHost, setWrongAdminHost] = useState(false);
  const [snapshot, setSnapshot] = useState<PortlessStatusSnapshot | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [diagnosticsState, setDiagnosticsState] = useState<"idle" | "copying" | "copied" | "error">("idle");

  useEffect(() => {
    if (typeof window === "undefined") return;
    setCurrentUrl(window.location.href);
    setWrongAdminHost(isWrongAdminHost());
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetchAdminWithAuth("/api/admin/portless/status", {
          cache: "no-store",
        }, { allowDevAdminBypass: true });
        if (!response.ok) throw new Error(`status ${response.status}`);
        const payload = (await response.json()) as PortlessStatusSnapshot;
        if (!cancelled) {
          setSnapshot(payload);
          setState("ready");
        }
      } catch {
        if (!cancelled) {
          setSnapshot(null);
          setState("error");
        }
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const links = [
    ["Admin", PORTLESS_ADMIN_DASHBOARD_URL],
    ["App", PORTLESS_APP_ORIGIN],
    ["API", `${PORTLESS_API_ORIGIN}/health/live`],
  ] as const;
  const usesStaticAliases = snapshot?.uses_static_aliases === true;
  const statusLabel =
    wrongAdminHost ? "Wrong host" : usesStaticAliases ? "Aliases" : state === "ready" ? "Clean" : state.toUpperCase();
  const actionLabel =
    diagnosticsState === "copying"
      ? "Copying..."
      : diagnosticsState === "copied"
        ? "Diagnostics copied"
        : diagnosticsState === "error"
          ? "Copy failed"
          : "Open clean admin + copy diagnostics";

  const openCleanAdminWithDiagnostics = async () => {
    if (typeof window === "undefined") return;
    setDiagnosticsState("copying");
    const diagnostics = {
      copied_at: new Date().toISOString(),
      current_url: window.location.href,
      expected_admin_url: PORTLESS_ADMIN_DASHBOARD_URL,
      expected_app_url: PORTLESS_APP_ORIGIN,
      expected_api_url: `${PORTLESS_API_ORIGIN}/health/live`,
      wrong_admin_host: isWrongAdminHost(),
      status_state: state,
      portless_status: snapshot,
      user_agent: window.navigator.userAgent,
    };

    try {
      await window.navigator.clipboard.writeText(JSON.stringify(diagnostics, null, 2));
      setDiagnosticsState("copied");
      window.location.assign(PORTLESS_ADMIN_DASHBOARD_URL);
    } catch {
      setDiagnosticsState("error");
    }
  };

  return (
    <section className="rounded-[1.8rem] border border-black bg-white p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em]" style={{ color: ACCENT }}>
            Portless URLs
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-black">
            Clean local routes
          </h2>
        </div>
        <span className="rounded-none border border-black px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-black">
          {statusLabel}
        </span>
      </div>
      <p className="mt-4 text-sm leading-7 text-black/70">
        Use these stable HTTPS names for admin browser work instead of numeric local ports.
      </p>
      {(wrongAdminHost || usesStaticAliases || state === "error" || snapshot?.status === "unavailable") ? (
        <div className="mt-4 border-2 border-black bg-[#FFF7D6] px-4 py-3 text-sm leading-6 text-black">
          {wrongAdminHost ? (
            <p>
              This admin page is loaded from the wrong local host. Open the clean admin dashboard at{" "}
              <a className="font-semibold underline" href={`${PORTLESS_ADMIN_ORIGIN}/admin`}>
                {PORTLESS_ADMIN_ORIGIN}/admin
              </a>
              .
            </p>
          ) : usesStaticAliases ? (
            <p>
              Portless is still serving at least one TRR route through a static alias. Run{" "}
              <code className="font-mono text-xs">make portless-repair</code>, then restart with{" "}
              <code className="font-mono text-xs">make dev-portless</code>.
            </p>
          ) : (
            <p>
              Portless status is unavailable from the app process. Run{" "}
              <code className="font-mono text-xs">make portless-repair</code> before opening admin.
            </p>
          )}
        </div>
      ) : null}
      <div className="mt-5 grid gap-2">
        {links.map(([label, href]) => (
          <a
            key={label}
            href={href}
            className="group flex items-center justify-between gap-3 border border-black px-3 py-3 text-sm transition hover:bg-black hover:text-white"
          >
            <span className="font-semibold">{label}</span>
            <span className="min-w-0 truncate font-mono text-xs opacity-70 group-hover:opacity-100">{href}</span>
          </a>
        ))}
      </div>
      <Button
        onClick={() => {
          void openCleanAdminWithDiagnostics();
        }}
        disabled={diagnosticsState === "copying"}
        size="sm"
        variant="outline"
        className={`mt-4 w-full ${ADMIN_DASHBOARD_BUTTON_CLASS}`}
      >
        {actionLabel}
      </Button>
      <p className="mt-4 break-words text-xs leading-6 text-black/60">
        Current route: {currentUrl ?? "checking"}
      </p>
      <dl className="mt-4 grid gap-2 text-xs">
        {(snapshot?.routes ?? []).map((route) => (
          <div key={route.id} className="grid grid-cols-[5rem_minmax(0,1fr)_5rem] gap-2 border border-black px-3 py-2">
            <dt className="font-semibold uppercase tracking-[0.12em] text-black/60">{route.label}</dt>
            <dd className="min-w-0 truncate font-mono text-black/70">{route.target ?? route.url}</dd>
            <dd className="text-right font-semibold uppercase tracking-[0.12em] text-black/60">
              {route.present ? route.kind ?? "route" : "missing"}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export default function AdminDashboardPage() {
  const { user, checking, hasAccess } = useAdminGuard();

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-black border-t-transparent" />
          <p className="text-sm text-black/75">Preparing admin dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user || !hasAccess) {
    return null;
  }

  const displayName = user.displayName ?? user.email ?? "Admin";
  const primaryTools = ADMIN_DASHBOARD_TOOLS.filter((tool) =>
    ["trr-shows", "screenalytics", "cast-reference-review", "people", "surveys", "social-media", "games"].includes(tool.key),
  );
  const secondaryTools = ADMIN_DASHBOARD_TOOLS.filter(
    (tool) => !primaryTools.some((primaryTool) => primaryTool.key === tool.key),
  );

  return (
    <ClientOnly>
      <div className="min-h-screen bg-white">
        <AdminGlobalHeader bodyClassName="px-6 py-6">
          <div className="mx-auto max-w-7xl">
            <AdminBreadcrumbs items={buildAdminRootBreadcrumb()} className="mb-3" />
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,24rem)] lg:items-start">
              <div className="max-w-3xl">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em]" style={{ color: ACCENT }}>
                  Admin operations
                </p>
                <h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em] text-black sm:text-5xl">
                  Search, route, and act.
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-black/75 sm:text-base">
                  {displayName}, this page is the fast entry point for shows, people, seasons, surveys,
                  and diagnostics. Search first when you know the target. Use the route list below when
                  you need the right workspace quickly.
                </p>
                <section
                  aria-label="Admin dashboard quick search"
                  className="mt-6 rounded-[1.8rem] border-2 border-black bg-white p-6"
                >
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                    <div className="max-w-2xl">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.24em]" style={{ color: ACCENT }}>
                        Quick search
                      </p>
                      <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-black">
                        Jump straight to the target record.
                      </h2>
                      <p className="mt-2 text-sm leading-7 text-black/75">
                        Search shows, people, and episodes from here before opening a larger admin route.
                      </p>
                    </div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-black/50">
                      Start typing at 3 characters
                    </div>
                  </div>
                  <div className="mt-6">
                    <AdminGlobalSearch variant="hero" />
                  </div>
                </section>
              </div>
              <div className="grid gap-3 text-left sm:grid-cols-3 lg:grid-cols-1">
                {[
                  ["Primary tools", primaryTools.length.toString()],
                  ["Reference routes", secondaryTools.length.toString()],
                  ["Signed in", "Active"],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-[1.5rem] border border-black bg-white px-4 py-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: ACCENT }}>
                      {label}
                    </p>
                    <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-black">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </AdminGlobalHeader>

        <main className="mx-auto grid max-w-7xl gap-8 px-6 py-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(20rem,0.8fr)]">
          <section className="min-w-0 space-y-8">
            <section className="rounded-[1.8rem] border-2 border-black bg-white p-6">
              <div className="flex flex-col gap-2 border-b border-black pb-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em]" style={{ color: ACCENT }}>
                    Primary routes
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-black">
                    Core workflows
                  </h2>
                </div>
                <p className="text-sm text-black/65">High-frequency admin surfaces.</p>
              </div>

              <div className="mt-2 divide-y divide-black">
                {primaryTools.map((tool) => (
                  <Link
                    key={tool.key}
                    href={tool.href}
                    className="group grid gap-4 px-1 py-5 transition hover:bg-black/[0.02] md:grid-cols-[8rem_minmax(0,1fr)_auto] md:items-start"
                  >
                    <div className="pt-1">
                      <span
                        className="rounded-full border border-black bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em]"
                        style={{ color: ACCENT }}
                      >
                        {tool.badge}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-xl font-semibold tracking-[-0.03em] text-black">
                        {tool.title}
                      </h3>
                      <p className="mt-2 max-w-2xl text-sm leading-7 text-black/75">
                        {tool.description}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.14em] text-black transition group-hover:opacity-70">
                      <span>Open</span>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                        <path
                          d="M3.5 10.5L10.5 3.5M10.5 3.5H4.75M10.5 3.5V9.25"
                          stroke="currentColor"
                          strokeWidth="1.4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                  </Link>
                ))}
              </div>
            </section>

            <section className="rounded-[1.8rem] border-2 border-black bg-white p-6">
              <div className="flex flex-col gap-2 border-b border-black pb-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em]" style={{ color: ACCENT }}>
                    Reference routes
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-black">
                    Secondary surfaces
                  </h2>
                </div>
                <p className="text-sm text-black/65">Lower-frequency but still routable from here.</p>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {secondaryTools.map((tool) => (
                  <Link
                    key={tool.key}
                    href={tool.href}
                    className="rounded-[1.4rem] border border-black bg-white px-4 py-4 transition hover:bg-black/[0.02]"
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: ACCENT }}>
                      {tool.badge}
                    </p>
                    <h3 className="mt-2 text-lg font-semibold text-black">{tool.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-black/75">{tool.description}</p>
                  </Link>
                ))}
              </div>
            </section>
          </section>

          <aside className="space-y-6">
            <PortlessUrlCard />
            <BackendEnvironmentReadinessCard />
            <ConnectionBudgetCard />

            <section className="rounded-[1.8rem] border border-black bg-white p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em]" style={{ color: ACCENT }}>
                Status notes
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-black">
                What this page is for
              </h2>
              <ul className="mt-5 space-y-4 text-sm leading-7 text-black/75">
                {STATUS_NOTES.map((note) => (
                  <li key={note} className="flex gap-3">
                    <span className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: ACCENT }} />
                    <span>{note}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-[1.8rem] border border-black bg-white p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em]" style={{ color: ACCENT }}>
                Recent updates
              </p>
              <div className="mt-5 space-y-5">
                {RECENT_UPDATES.map((update, index) => (
                  <div key={update} className="border-b border-black pb-5 last:border-b-0 last:pb-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-black/50">
                      Update {index + 1}
                    </p>
                    <p className="mt-2 text-sm leading-7 text-black/75">{update}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[1.8rem] border border-black bg-white p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em]" style={{ color: ACCENT }}>
                Access path
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-black">
                Need a different route?
              </h2>
              <p className="mt-3 text-sm leading-7 text-black/75">
                Use the top navigation search for records, Design Docs for UI guidance, and Users or
                Settings when the task is access-related. This page should stay operational, not promotional.
              </p>
            </section>
          </aside>
        </main>
      </div>
    </ClientOnly>
  );
}
