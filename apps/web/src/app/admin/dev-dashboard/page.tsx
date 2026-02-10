"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ClientOnly from "@/components/ClientOnly";
import { useAdminGuard } from "@/lib/admin/useAdminGuard";
import { auth } from "@/lib/firebase";

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

// ============================================================================
// Page
// ============================================================================

export default function DevDashboardPage() {
  const { user, checking, hasAccess } = useAdminGuard();

  const [data, setData] = useState<DevDashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeRepo, setActiveRepo] = useState<RepoName>("TRR-Backend");

  const getAuthHeaders = useCallback(async () => {
    const token = await auth.currentUser?.getIdToken();
    if (!token) throw new Error("Not authenticated");
    return { Authorization: `Bearer ${token}` };
  }, []);

  const load = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);

      const headers = await getAuthHeaders();
      const res = await fetch("/api/admin/dev-dashboard", { headers });
      const payload = await res.json().catch(() => null);

      if (!res.ok) {
        const message =
          typeof payload?.error === "string" ? payload.error : `Request failed (${res.status})`;
        throw new Error(message);
      }

      setData(payload as DevDashboardData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    if (checking) return;
    if (!user || !hasAccess) return;
    void load();
  }, [checking, user, hasAccess, load]);

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
        <header className="border-b border-zinc-200 bg-white px-6 py-6">
          <div className="mx-auto flex max-w-7xl flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">Admin Tool</p>
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
        </header>

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

                  <BranchesSection branches={activeRepoData.branches} />
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

function BranchesSection({ branches }: { branches: BranchInfo[] }) {
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

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [branches]);

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <SectionHeader title="Branches" count={grouped.length} />
      {grouped.length === 0 ? (
        <p className="text-sm text-zinc-500 italic">No branches found.</p>
      ) : (
        <ul className="space-y-2">
          {grouped.map((branch) => (
            <li key={branch.name} className="flex items-center justify-between gap-3">
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
              </div>
            </li>
          ))}
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
