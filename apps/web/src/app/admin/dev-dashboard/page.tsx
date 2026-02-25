"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ClientOnly from "@/components/ClientOnly";
import AdminBreadcrumbs from "@/components/admin/AdminBreadcrumbs";
import AdminGlobalHeader from "@/components/admin/AdminGlobalHeader";
import { buildAdminSectionBreadcrumb } from "@/lib/admin/admin-breadcrumbs";
import { fetchAdminWithAuth } from "@/lib/admin/client-auth";
import { useAdminGuard } from "@/lib/admin/useAdminGuard";

// ============================================================================
// Types (duplicated from server service; keep additive + compatible)
// ============================================================================

type RepoName = "TRR-Backend" | "TRR-APP" | "screenalytics";

interface BranchInfo {
  name: string;
  isRemote: boolean;
  isCurrent: boolean;
  lastCommitDate: string | null;
}

interface BranchSummaryCommit {
  hash: string;
  subject: string;
}

type BranchRecommendation = "delete" | "pr" | "review" | "wip" | "unknown";

interface BranchSummary {
  name: string;
  baseBranch: string;
  lastCommitDate: string | null;
  uniquePatches: number;
  appliedPatches: number;
  uniqueCommits: BranchSummaryCommit[];
  shortStat: string | null;
  recommendation: BranchRecommendation;
  recommendationReason: string;
  error: string | null;
}

interface CommitInfo {
  hash: string;
  message: string;
  author: string;
  date: string;
}

interface FileChange {
  status: string;
  file: string;
}

interface PullRequest {
  number: number;
  title: string;
  url: string;
  state: string;
  headRefName: string;
  author: string | null;
}

interface Worktree {
  path: string;
  branch: string | null;
  bare: boolean;
  headHash: string | null;
  headCommitDate: string | null;
}

interface RepoStatus {
  name: RepoName;
  path: string;
  githubRemote: string;
  currentBranch: string;
  branches: BranchInfo[];
  branchSummaries: BranchSummary[];
  commits: CommitInfo[];
  changes: FileChange[];
  pullRequests: PullRequest[];
  worktrees: Worktree[];
  errors: string[];
}

interface TaskPlanItem {
  repo: RepoName;
  taskNumber: number;
  title: string;
  statusSnapshot: string;
  filePath: string;
  lastUpdated: string | null;
  updatedAt: string | null;
}

interface ClaudePlanItem {
  filename: string;
  title: string;
  filePath: string;
  updatedAt: string | null;
}

interface OutstandingTasks {
  taskPlans: TaskPlanItem[];
  claudePlans: ClaudePlanItem[];
}

interface DevDashboardData {
  repos: RepoStatus[];
  tasks: OutstandingTasks;
  generatedAt: string;
}

interface AuthDiagnostics {
  provider: "firebase" | "supabase";
  shadowMode: boolean;
  windowStartedAt: string;
  lastObservedAt: string | null;
  allowlistSizes: {
    emails: number;
    uids: number;
    displayNames: number;
  };
  counters: {
    shadowChecks: number;
    shadowFailures: number;
    shadowMismatchEvents: number;
    shadowMismatchFieldCounts: {
      uid: number;
      email: number;
      name: number;
    };
    fallbackSuccesses: number;
  };
}

interface AuthCutoverReadiness {
  ready: boolean;
  reasons: string[];
  thresholds: {
    minShadowChecks: number;
    maxShadowFailures: number;
    maxShadowMismatchEvents: number;
  };
  observed: {
    shadowChecks: number;
    shadowFailures: number;
    shadowMismatchEvents: number;
  };
}

interface AuthStatusPayload {
  diagnostics: AuthDiagnostics;
  cutoverReadiness: AuthCutoverReadiness;
  viewer: {
    uid: string;
    provider: "firebase" | "supabase";
  };
}

// ============================================================================
// Helpers
// ============================================================================

const REPO_TABS: RepoName[] = ["TRR-Backend", "TRR-APP", "screenalytics"];

function formatRelativeTime(isoDate: string) {
  const date = new Date(isoDate);
  const now = Date.now();
  const diffMs = now - date.getTime();
  if (!Number.isFinite(diffMs)) return isoDate;

  const diffSeconds = Math.floor(diffMs / 1000);
  const abs = Math.abs(diffSeconds);

  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  const minute = 60;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (abs < minute) return rtf.format(-diffSeconds, "second");
  if (abs < hour) return rtf.format(-Math.round(diffSeconds / minute), "minute");
  if (abs < day) return rtf.format(-Math.round(diffSeconds / hour), "hour");
  return rtf.format(-Math.round(diffSeconds / day), "day");
}

function formatAbsoluteDate(isoDate: string) {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return isoDate;
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function maxIsoDate(a: string | null, b: string | null) {
  if (!a) return b;
  if (!b) return a;
  const aMs = Date.parse(a);
  const bMs = Date.parse(b);
  if (!Number.isFinite(aMs)) return b;
  if (!Number.isFinite(bMs)) return a;
  return aMs >= bMs ? a : b;
}

function getChangeBadge(status: string) {
  const normalized = status.toLowerCase();
  if (normalized === "added") {
    return { label: "A", className: "border border-green-200 bg-green-50 text-green-800" };
  }
  if (normalized === "modified") {
    return { label: "M", className: "border border-amber-200 bg-amber-50 text-amber-800" };
  }
  if (normalized === "deleted") {
    return { label: "D", className: "border border-red-200 bg-red-50 text-red-800" };
  }
  if (normalized === "untracked") {
    return { label: "??", className: "border border-zinc-200 bg-zinc-100 text-zinc-700" };
  }
  return { label: status.toUpperCase(), className: "border border-zinc-200 bg-zinc-100 text-zinc-700" };
}

function getReadinessBadge(ready: boolean) {
  if (ready) {
    return { label: "Cutover Ready", className: "border border-green-200 bg-green-50 text-green-800" };
  }
  return { label: "Not Ready", className: "border border-amber-200 bg-amber-50 text-amber-800" };
}

// ============================================================================
// Page
// ============================================================================

export default function DevDashboardPage() {
  const { user, userKey, checking, hasAccess } = useAdminGuard();

  const [data, setData] = useState<DevDashboardData | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatusPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [resettingAuthWindow, setResettingAuthWindow] = useState(false);
  const [downloadingDrillReport, setDownloadingDrillReport] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeRepo, setActiveRepo] = useState<RepoName>("TRR-Backend");

  const fetchWithAuth = useCallback(
    (input: RequestInfo | URL, init?: RequestInit) =>
      fetchAdminWithAuth(input, init, {
        preferredUser: user,
      }),
    [user],
  );

  const load = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);

      const [dashboardRes, authStatusRes] = await Promise.all([
        fetchWithAuth("/api/admin/dev-dashboard"),
        fetchWithAuth("/api/admin/auth/status"),
      ]);
      const dashboardPayload = await dashboardRes.json().catch(() => null);
      const authStatusPayload = await authStatusRes.json().catch(() => null);

      if (!dashboardRes.ok) {
        const message =
          typeof dashboardPayload?.error === "string"
            ? dashboardPayload.error
            : `Request failed (${dashboardRes.status})`;
        throw new Error(message);
      }

      setData(dashboardPayload as DevDashboardData);
      setAuthStatus(authStatusRes.ok ? (authStatusPayload as AuthStatusPayload) : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
      setData(null);
      setAuthStatus(null);
    } finally {
      setLoading(false);
    }
  }, [fetchWithAuth]);

  const resetAuthDiagnosticsWindow = useCallback(async () => {
    try {
      setError(null);
      setResettingAuthWindow(true);
      const response = await fetchWithAuth("/api/admin/auth/status/reset", {
        method: "POST",
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        const message = typeof payload?.error === "string" ? payload.error : `Request failed (${response.status})`;
        throw new Error(message);
      }
      setAuthStatus(payload as AuthStatusPayload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset auth diagnostics");
    } finally {
      setResettingAuthWindow(false);
    }
  }, [fetchWithAuth]);

  const downloadAuthDrillReport = useCallback(async () => {
    try {
      setError(null);
      setDownloadingDrillReport(true);
      const response = await fetchWithAuth("/api/admin/auth/status/drill-report?format=download", {
        method: "GET",
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        const message = typeof payload?.error === "string" ? payload.error : `Request failed (${response.status})`;
        throw new Error(message);
      }

      const blob = await response.blob();
      const disposition = response.headers.get("content-disposition") ?? "";
      const match = disposition.match(/filename=\"([^\"]+)\"/);
      const filename = match?.[1] || "auth-cutover-drill.json";
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to download drill report");
    } finally {
      setDownloadingDrillReport(false);
    }
  }, [fetchWithAuth]);

  useEffect(() => {
    if (checking) return;
    if (!userKey || !hasAccess) return;
    void load();
  }, [checking, userKey, hasAccess, load]);

  const activeRepoData = useMemo(() => {
    return data?.repos.find((repo) => repo.name === activeRepo) ?? null;
  }, [data, activeRepo]);

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-neutral-900 border-t-transparent" />
          <p className="text-sm text-zinc-600">Preparing dev dashboard…</p>
        </div>
      </div>
    );
  }

  if (!user || !hasAccess) {
    return null;
  }

  return (
    <ClientOnly>
      <div className="min-h-screen bg-zinc-50">
        <AdminGlobalHeader bodyClassName="px-6 py-6">
          <div className="mx-auto flex max-w-7xl flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <AdminBreadcrumbs items={buildAdminSectionBreadcrumb("Dev Dashboard", "/admin/dev-dashboard")} className="mb-1" />
              <div className="mt-1 flex items-center gap-3">
                <h1 className="text-3xl font-bold text-zinc-900">Dev Dashboard</h1>
                <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-semibold text-zinc-700">
                  Dev
                </span>
              </div>
              <p className="mt-2 text-sm text-zinc-500">
                Cross-repo git state, PRs, and outstanding task signals. Refresh the browser to update.
              </p>
              {data?.generatedAt ? (
                <p className="mt-1 text-xs text-zinc-400">Generated: {new Date(data.generatedAt).toLocaleString()}</p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/admin"
                className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
              >
                Back to Admin
              </Link>
            </div>
          </div>
        </AdminGlobalHeader>

        <main className="mx-auto max-w-7xl px-6 py-8">
          {error ? (
            <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              {error}
            </div>
          ) : null}

          {!data && loading ? (
            <div className="flex items-center justify-center py-24">
              <div className="text-center">
                <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-neutral-900 border-t-transparent" />
                <p className="text-sm text-zinc-600">Loading dev dashboard…</p>
              </div>
            </div>
          ) : null}

          {data ? (
            <>
              {authStatus ? (
                <div className="mb-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold text-zinc-900">Auth Migration Status</h2>
                      <p className="text-xs text-zinc-500">
                        Provider: <span className="font-mono">{authStatus.diagnostics.provider}</span> · Shadow mode:{" "}
                        <span className="font-mono">{authStatus.diagnostics.shadowMode ? "enabled" : "disabled"}</span>
                      </p>
                      <p className="text-xs text-zinc-500">
                        Window:{" "}
                        <span className="font-mono">
                          {new Date(authStatus.diagnostics.windowStartedAt).toLocaleString()}
                        </span>
                        {" · "}Last observed:{" "}
                        <span className="font-mono">
                          {authStatus.diagnostics.lastObservedAt
                            ? new Date(authStatus.diagnostics.lastObservedAt).toLocaleString()
                            : "none"}
                        </span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => void downloadAuthDrillReport()}
                        disabled={downloadingDrillReport}
                        className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {downloadingDrillReport ? "Downloading..." : "Download Drill Report"}
                      </button>
                      <button
                        type="button"
                        onClick={() => void resetAuthDiagnosticsWindow()}
                        disabled={resettingAuthWindow}
                        className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {resettingAuthWindow ? "Resetting..." : "Reset Window"}
                      </button>
                      {(() => {
                        const badge = getReadinessBadge(authStatus.cutoverReadiness.ready);
                        return (
                          <span className={`rounded-md px-2 py-1 text-xs font-semibold ${badge.className}`}>
                            {badge.label}
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                  <div className="grid gap-4 text-sm text-zinc-700 md:grid-cols-3">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-zinc-500">Observed</p>
                      <p>Shadow checks: {authStatus.cutoverReadiness.observed.shadowChecks}</p>
                      <p>Shadow failures: {authStatus.cutoverReadiness.observed.shadowFailures}</p>
                      <p>Mismatch events: {authStatus.cutoverReadiness.observed.shadowMismatchEvents}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-zinc-500">Thresholds</p>
                      <p>Min checks: {authStatus.cutoverReadiness.thresholds.minShadowChecks}</p>
                      <p>Max failures: {authStatus.cutoverReadiness.thresholds.maxShadowFailures}</p>
                      <p>
                        Max mismatches: {authStatus.cutoverReadiness.thresholds.maxShadowMismatchEvents}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-zinc-500">Mismatch Fields</p>
                      <p>Email: {authStatus.diagnostics.counters.shadowMismatchFieldCounts.email}</p>
                      <p>Name: {authStatus.diagnostics.counters.shadowMismatchFieldCounts.name}</p>
                      <p>UID: {authStatus.diagnostics.counters.shadowMismatchFieldCounts.uid}</p>
                    </div>
                  </div>
                  {authStatus.cutoverReadiness.reasons.length > 0 ? (
                    <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">Blocking Reasons</p>
                      <p className="mt-1 text-sm text-amber-900">
                        {authStatus.cutoverReadiness.reasons.join(" | ")}
                      </p>
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className="mb-6 flex flex-wrap gap-2">
                {REPO_TABS.map((tab) => {
                  const isActive = tab === activeRepo;
                  return (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setActiveRepo(tab)}
                      className={
                        isActive
                          ? "rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
                          : "rounded-full bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-200"
                      }
                    >
                      {tab}
                    </button>
                  );
                })}
              </div>

              {activeRepoData ? (
                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                    <div className="mb-4 flex items-center justify-between gap-4">
                      <h2 className="text-lg font-semibold text-zinc-900">Current Branch</h2>
                    </div>
                    <p className="font-mono text-sm text-zinc-900">
                      {activeRepoData.currentBranch || <span className="italic text-zinc-500">Unknown</span>}
                    </p>
                    <p className="mt-2 text-xs text-zinc-500">{activeRepoData.path}</p>
                  </div>

                  <ErrorsSection errors={activeRepoData.errors} />

                  <BranchesSection branches={activeRepoData.branches} summaries={activeRepoData.branchSummaries} />
                  <CommitsSection commits={activeRepoData.commits} />
                  <ChangesSection changes={activeRepoData.changes} />
                  <PullRequestsSection prs={activeRepoData.pullRequests} />
                  <WorktreesSection worktrees={activeRepoData.worktrees} />
                </div>
              ) : (
                <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600 shadow-sm">
                  No repo data for {activeRepo}.
                </div>
              )}

              <section className="mt-10">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-zinc-900">Outstanding Tasks</h2>
                    <p className="text-sm text-zinc-500">Cross-collab plans and Claude plans (last 10 days).</p>
                  </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                  <TaskPlansSection items={data.tasks.taskPlans} />
                  <ClaudePlansSection items={data.tasks.claudePlans} />
                </div>
              </section>
            </>
          ) : null}
        </main>
      </div>
    </ClientOnly>
  );
}

// ============================================================================
// Inline components
// ============================================================================

function SectionHeader({ title, count }: { title: string; count: number }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-4">
      <h2 className="text-lg font-semibold text-zinc-900">{title}</h2>
      <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-600">{count}</span>
    </div>
  );
}

function ErrorsSection({ errors }: { errors: string[] }) {
  if (!errors?.length) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <SectionHeader title="Errors" count={0} />
        <p className="text-sm text-zinc-500 italic">No errors reported.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-6 shadow-sm">
      <SectionHeader title="Errors" count={errors.length} />
      <ul className="space-y-2 text-sm text-red-800">
        {errors.map((err, idx) => (
          <li key={`${idx}-${err}`} className="break-words">
            {err}
          </li>
        ))}
      </ul>
    </div>
  );
}

function getBranchRecommendationBadge(rec: BranchRecommendation) {
  if (rec === "pr") {
    return { label: "Commit/PR", className: "border border-blue-200 bg-blue-50 text-blue-800" };
  }
  if (rec === "review") {
    return { label: "Review", className: "border border-indigo-200 bg-indigo-50 text-indigo-800" };
  }
  if (rec === "wip") {
    return { label: "WIP", className: "border border-amber-200 bg-amber-50 text-amber-800" };
  }
  if (rec === "delete") {
    return { label: "Skip", className: "border border-zinc-200 bg-zinc-100 text-zinc-700" };
  }
  return { label: "Unknown", className: "border border-red-200 bg-red-50 text-red-800" };
}

function BranchesSection({ branches, summaries }: { branches: BranchInfo[]; summaries: BranchSummary[] }) {
  const grouped = useMemo(() => {
    const map = new Map<
      string,
      { name: string; local: boolean; remote: boolean; isCurrent: boolean; lastCommitDate: string | null }
    >();

    for (const b of branches ?? []) {
      const existing =
        map.get(b.name) ?? { name: b.name, local: false, remote: false, isCurrent: false, lastCommitDate: null };
      if (b.isRemote) existing.remote = true;
      else existing.local = true;
      if (b.isCurrent) existing.isCurrent = true;
      existing.lastCommitDate = maxIsoDate(existing.lastCommitDate, b.lastCommitDate);
      map.set(b.name, existing);
    }

    return Array.from(map.values()).sort((a, b) => {
      if (a.isCurrent !== b.isCurrent) return a.isCurrent ? -1 : 1;
      const aMs = a.lastCommitDate ? Date.parse(a.lastCommitDate) : Number.NEGATIVE_INFINITY;
      const bMs = b.lastCommitDate ? Date.parse(b.lastCommitDate) : Number.NEGATIVE_INFINITY;
      if (Number.isFinite(aMs) && Number.isFinite(bMs) && aMs !== bMs) return bMs - aMs;
      return a.name.localeCompare(b.name);
    });
  }, [branches]);

  const summaryMap = useMemo(() => {
    const map = new Map<string, BranchSummary>();
    for (const summary of summaries ?? []) {
      map.set(summary.name, summary);
    }
    return map;
  }, [summaries]);

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <SectionHeader title="Branches" count={grouped.length} />
      {grouped.length === 0 ? (
        <p className="text-sm text-zinc-500 italic">No branches found.</p>
      ) : (
        <ul className="space-y-2">
          {grouped.map((branch) => {
            const summary = summaryMap.get(branch.name) ?? null;
            const badge = summary ? getBranchRecommendationBadge(summary.recommendation) : null;
            return (
              <li key={branch.name} className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-mono text-sm text-zinc-900">
                    {branch.name} {branch.isCurrent ? <span className="text-zinc-500">★</span> : null}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {branch.local && branch.remote
                      ? "local + remote"
                      : branch.remote
                        ? "remote only"
                        : "local only"}
                    {branch.lastCommitDate
                      ? ` · ${formatRelativeTime(branch.lastCommitDate)} · ${formatAbsoluteDate(branch.lastCommitDate)}`
                      : ""}
                  </p>

                  {summary ? (
                    <div className="mt-2 space-y-1 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
                      <p className="text-xs text-zinc-700">
                        Base: <span className="font-mono">{summary.baseBranch}</span>
                        {summary.uniquePatches > 0 ? (
                          <span className="text-zinc-500"> · +{summary.uniquePatches} unique</span>
                        ) : (
                          <span className="text-zinc-500"> · 0 unique</span>
                        )}
                        {summary.appliedPatches > 0 ? (
                          <span className="text-zinc-500"> · {summary.appliedPatches} already applied</span>
                        ) : null}
                        {summary.shortStat ? <span className="text-zinc-500"> · {summary.shortStat}</span> : null}
                      </p>
                      {summary.uniqueCommits?.length ? (
                        <p className="text-xs text-zinc-600">
                          Unique:{" "}
                          <span className="font-mono text-zinc-700">
                            {summary.uniqueCommits
                              .map((c) => `${c.hash.slice(0, 7)} ${c.subject}`)
                              .join(" | ")}
                          </span>
                        </p>
                      ) : null}
                      <p className="text-xs text-zinc-600">
                        Recommendation: <span className="text-zinc-800">{summary.recommendationReason}</span>
                      </p>
                      {summary.error ? <p className="text-xs text-red-700">Error: {summary.error}</p> : null}
                    </div>
                  ) : null}
                </div>

                {badge ? (
                  <span className={`shrink-0 rounded-md px-2 py-1 text-[11px] font-semibold ${badge.className}`}>
                    {badge.label}
                  </span>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function CommitsSection({ commits }: { commits: CommitInfo[] }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <SectionHeader title="Recent Commits" count={commits?.length ?? 0} />
      {commits?.length ? (
        <ul className="space-y-2">
          {commits.map((commit) => (
            <li key={commit.hash} className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="font-mono text-sm text-zinc-900">
                  <span className="text-zinc-500">{commit.hash.slice(0, 7)}</span>{" "}
                  <span className="text-zinc-900">{commit.message}</span>
                </p>
                <p className="text-xs text-zinc-500">
                  {commit.author} · {formatRelativeTime(commit.date)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-zinc-500 italic">No commits found.</p>
      )}
    </div>
  );
}

function ChangesSection({ changes }: { changes: FileChange[] }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <SectionHeader title="Uncommitted Changes" count={changes?.length ?? 0} />
      {changes?.length ? (
        <ul className="space-y-2">
          {changes.map((change, idx) => {
            const badge = getChangeBadge(change.status);
            return (
              <li key={`${idx}-${change.file}`} className="flex items-center gap-3">
                <span className={`rounded-md px-2 py-1 text-xs font-semibold ${badge.className}`}>{badge.label}</span>
                <span className="min-w-0 truncate font-mono text-sm text-zinc-900">{change.file}</span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-zinc-500 italic">Working tree clean.</p>
      )}
    </div>
  );
}

function PullRequestsSection({ prs }: { prs: PullRequest[] }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <SectionHeader title="Open PRs" count={prs?.length ?? 0} />
      {prs?.length ? (
        <ul className="space-y-3">
          {prs.map((pr) => (
            <li key={pr.number} className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-zinc-900">
                  <span className="font-mono text-zinc-500">#{pr.number}</span> {pr.title}
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  {pr.headRefName} · {pr.state} · {pr.author ?? "unknown"}
                </p>
              </div>
              <a
                href={pr.url}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100"
              >
                Link
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-zinc-500 italic">No PRs found (or gh not authenticated).</p>
      )}
    </div>
  );
}

function WorktreesSection({ worktrees }: { worktrees: Worktree[] }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <SectionHeader title="Worktrees" count={worktrees?.length ?? 0} />
      {worktrees?.length ? (
        <ul className="space-y-2">
          {worktrees.map((wt) => (
            <li key={wt.path} className="text-sm text-zinc-900">
              <p className="truncate font-mono">{wt.path}</p>
              <p className="text-xs text-zinc-500">
                {wt.bare ? "bare" : wt.branch ? wt.branch : "detached"}
                {wt.headCommitDate ? (
                  <span className="text-zinc-400">
                    {" "}
                    · {formatRelativeTime(wt.headCommitDate)} · {formatAbsoluteDate(wt.headCommitDate)}
                  </span>
                ) : null}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-zinc-500 italic">No worktrees found.</p>
      )}
    </div>
  );
}

function TaskPlansSection({ items }: { items: TaskPlanItem[] }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <SectionHeader title="Task Plans" count={items?.length ?? 0} />
      {items?.length ? (
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={`${item.repo}-TASK${item.taskNumber}`} className="text-sm text-zinc-900">
              <p className="font-semibold">
                <span className="text-zinc-500">{item.repo}</span> TASK{item.taskNumber}: {item.title}
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                Updated{" "}
                {item.updatedAt ? (
                  <span className="font-semibold text-zinc-700">
                    {formatRelativeTime(item.updatedAt)}
                    {!item.lastUpdated ? (
                      <span className="font-normal text-zinc-400"> · {formatAbsoluteDate(item.updatedAt)}</span>
                    ) : null}
                  </span>
                ) : (
                  <span className="italic">unknown</span>
                )}
                {item.lastUpdated ? <span className="text-zinc-400"> · {item.lastUpdated}</span> : null}
              </p>
              {item.statusSnapshot ? (
                <p className="mt-1 line-clamp-3 text-xs text-zinc-600">{item.statusSnapshot}</p>
              ) : (
                <p className="mt-1 text-xs text-zinc-500 italic">No status snapshot found.</p>
              )}
              <p className="mt-1 truncate font-mono text-[11px] text-zinc-400">{item.filePath}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-zinc-500 italic">No outstanding TASK plans found.</p>
      )}
    </div>
  );
}

function ClaudePlansSection({ items }: { items: ClaudePlanItem[] }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <SectionHeader title="Claude Plans" count={items?.length ?? 0} />
      {items?.length ? (
        <div className="max-h-80 overflow-auto pr-1">
          <ul className="space-y-3">
            {items.map((item) => (
              <li key={item.filename} className="text-sm text-zinc-900">
                <p className="font-semibold">{item.title}</p>
                <p className="mt-1 text-xs text-zinc-500">
                  Updated{" "}
                  {item.updatedAt ? (
                    <span className="font-semibold text-zinc-700">
                      {formatRelativeTime(item.updatedAt)}
                      <span className="font-normal text-zinc-400"> · {formatAbsoluteDate(item.updatedAt)}</span>
                    </span>
                  ) : (
                    <span className="italic">unknown</span>
                  )}
                </p>
                <p className="mt-1 truncate font-mono text-[11px] text-zinc-400">{item.filePath}</p>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-sm text-zinc-500 italic">No Claude plans found.</p>
      )}
    </div>
  );
}
