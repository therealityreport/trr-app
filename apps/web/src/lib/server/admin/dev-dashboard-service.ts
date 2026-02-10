import "server-only";

import { readdir, readFile, stat, open } from "node:fs/promises";
import { join } from "node:path";
import os from "node:os";
import { safeExec } from "@/lib/server/admin/shell-exec";

export interface BranchInfo {
  name: string;
  isRemote: boolean;
  isCurrent: boolean;
  lastCommitDate: string | null;
}

export interface CommitInfo {
  hash: string;
  message: string;
  author: string;
  date: string;
}

export interface FileChange {
  status: string;
  file: string;
}

export interface PullRequest {
  number: number;
  title: string;
  url: string;
  state: string;
  headRefName: string;
  author: string | null;
}

export interface Worktree {
  path: string;
  branch: string | null;
  bare: boolean;
  headHash: string | null;
  headCommitDate: string | null;
}

export interface RepoStatus {
  name: string;
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

export interface TaskPlanItem {
  repo: string;
  taskNumber: number;
  title: string;
  statusSnapshot: string;
  filePath: string;
  lastUpdated: string | null;
  updatedAt: string | null;
}

export interface ClaudePlanItem {
  filename: string;
  title: string;
  filePath: string;
  updatedAt: string | null;
}

export interface OutstandingTasks {
  taskPlans: TaskPlanItem[];
  claudePlans: ClaudePlanItem[];
}

export interface DevDashboardData {
  repos: RepoStatus[];
  tasks: OutstandingTasks;
  generatedAt: string;
}

interface RepoConfig {
  name: RepoStatus["name"];
  path: string;
  githubRemote: string;
}

const REPOS: RepoConfig[] = [
  {
    name: "TRR-Backend",
    path: "/Users/thomashulihan/Projects/TRR/TRR-Backend",
    githubRemote: "therealityreport/trr-backend",
  },
  {
    name: "TRR-APP",
    path: "/Users/thomashulihan/Projects/TRR/TRR-APP",
    githubRemote: "therealityreport/trr-app",
  },
  {
    name: "screenalytics",
    path: "/Users/thomashulihan/Projects/TRR/screenalytics",
    githubRemote: "therealityreport/screenalytics",
  },
];

function clipError(text: string, maxLen = 400) {
  const trimmed = text.trim();
  if (trimmed.length <= maxLen) return trimmed;
  return `${trimmed.slice(0, maxLen)}…`;
}

function parseBranchRefs(output: string, currentBranch: string): BranchInfo[] {
  const results: BranchInfo[] = [];

  for (const rawLine of output.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;

    const sepIndex = line.indexOf("|");
    if (sepIndex === -1) continue;
    const refname = line.slice(0, sepIndex).trim();
    const date = line.slice(sepIndex + 1).trim();

    let isRemote = false;
    let name = "";

    if (refname.startsWith("refs/heads/")) {
      name = refname.slice("refs/heads/".length);
    } else if (refname.startsWith("refs/remotes/")) {
      const match = refname.match(/^refs\/remotes\/[^/]+\/(.+)$/);
      if (!match?.[1]) continue;
      name = match[1];
      isRemote = true;
    } else {
      continue;
    }

    if (!name || name === "HEAD" || /\/HEAD$/.test(refname)) continue;

    results.push({
      name,
      isRemote,
      isCurrent: !isRemote && name === currentBranch,
      lastCommitDate: date || null,
    });
  }

  return results;
}

function parseCommits(output: string): CommitInfo[] {
  const commits: CommitInfo[] = [];

  for (const rawLine of output.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;
    const parts = line.split("|");
    if (parts.length < 4) continue;

    const hash = parts.shift() ?? "";
    const date = parts.pop() ?? "";
    const author = parts.pop() ?? "";
    const message = parts.join("|");

    if (!hash) continue;
    commits.push({ hash, message, author, date });
  }

  return commits;
}

function parseChanges(output: string): FileChange[] {
  const changes: FileChange[] = [];

  for (const rawLine of output.split("\n")) {
    const line = rawLine.trimEnd();
    if (!line.trim()) continue;

    const code = line.slice(0, 2);
    const file = line.slice(3).trim();

    let status = code.trim();
    if (code === "??") status = "untracked";
    else if (code.includes("M")) status = "modified";
    else if (code.includes("A")) status = "added";
    else if (code.includes("D")) status = "deleted";

    changes.push({ status, file });
  }

  return changes;
}

function stripRefsHeads(ref: string) {
  return ref.replace(/^refs\/heads\//, "");
}

function parseWorktrees(output: string): Worktree[] {
  const worktrees: Worktree[] = [];

  let current: Worktree | null = null;
  const flush = () => {
    if (current?.path) worktrees.push(current);
    current = null;
  };

  for (const rawLine of output.split("\n")) {
    const line = rawLine.trimEnd();
    if (!line.trim()) {
      flush();
      continue;
    }

    if (line.startsWith("worktree ")) {
      flush();
      current = {
        path: line.slice("worktree ".length).trim(),
        branch: null,
        bare: false,
        headHash: null,
        headCommitDate: null,
      };
      continue;
    }

    if (!current) continue;

    if (line.startsWith("HEAD ")) {
      const hash = line.slice("HEAD ".length).trim();
      // Some worktrees can report an all-zero hash; treat that as "unknown".
      current.headHash = /^0+$/.test(hash) ? null : hash || null;
      continue;
    }

    if (line.startsWith("branch ")) {
      current.branch = stripRefsHeads(line.slice("branch ".length).trim());
      continue;
    }

    if (line === "bare") {
      current.bare = true;
      continue;
    }

    if (line === "detached") {
      current.branch = null;
      continue;
    }
  }

  flush();
  return worktrees;
}

async function isDir(path: string) {
  try {
    return (await stat(path)).isDirectory();
  } catch {
    return false;
  }
}

async function readFileHeader(filePath: string, maxBytes = 4096): Promise<string> {
  const fh = await open(filePath, "r");
  try {
    const buffer = Buffer.alloc(maxBytes);
    const { bytesRead } = await fh.read(buffer, 0, maxBytes, 0);
    return buffer.subarray(0, bytesRead).toString("utf8");
  } finally {
    await fh.close();
  }
}

function extractMarkdownTitle(text: string) {
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    const match = line.match(/^\s*#\s+(.+?)\s*$/);
    if (match?.[1]) return match[1].trim();
  }
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed) return trimmed;
  }
  return "(untitled)";
}

function extractStatusSnapshot(text: string) {
  const lines = text.split(/\r?\n/);
  const startIdx = lines.findIndex((line) => /^\s*(#{1,6}\s*)?Status Snapshot\b/i.test(line));
  if (startIdx === -1) return "";

  const stopPattern =
    /^\s*(#{1,6}\s+)?(Status Matrix|Scope|Locked Contracts|Acceptance Criteria|Execution Evidence|Remaining Steps|Completion Metadata|Open Blockers|Blockers|Notes|Validation Evidence|Validation|Out of Scope)\b/i;

  const collected: string[] = [];
  for (let i = startIdx + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (/^\s*#{1,6}\s+/.test(line)) break;
    if (stopPattern.test(line)) break;
    collected.push(line);
  }

  return collected.join("\n").trim();
}

function extractLastUpdatedLabel(text: string) {
  const lines = text.split(/\r?\n/);
  for (const line of lines.slice(0, 50)) {
    const match = line.match(/^\s*Last updated:\s*(.+?)\s*$/i);
    if (match?.[1]) return match[1].trim();
  }
  return null;
}

function tryParseDateToIso(label: string) {
  const ms = Date.parse(label);
  if (!Number.isFinite(ms)) return null;
  return new Date(ms).toISOString();
}

function statusSnapshotLooksComplete(statusSnapshot: string) {
  const lines = statusSnapshot.split(/\r?\n/);
  return lines.some((line) => /^\s*(complete|completed)\b/i.test(line.trim()));
}

async function collectTaskPlans(repo: RepoConfig): Promise<TaskPlanItem[]> {
  const root = join(repo.path, "docs", "cross-collab");
  if (!(await isDir(root))) return [];

  const entries = await readdir(root, { withFileTypes: true });
  const tasks: TaskPlanItem[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (!/^TASK\d+$/.test(entry.name)) continue;

    const taskNumber = Number(entry.name.replace(/^TASK/, ""));
    const planPath = join(root, entry.name, "PLAN.md");
    try {
      const content = await readFile(planPath, "utf8");
      const title = extractMarkdownTitle(content);
      const statusSnapshot = extractStatusSnapshot(content);
      if (statusSnapshot && statusSnapshotLooksComplete(statusSnapshot)) continue;
      const lastUpdated = extractLastUpdatedLabel(content);
      const updatedAtFromLabel = lastUpdated ? tryParseDateToIso(lastUpdated) : null;
      let updatedAt = updatedAtFromLabel;
      if (!updatedAt) {
        try {
          updatedAt = (await stat(planPath)).mtime.toISOString();
        } catch {
          updatedAt = null;
        }
      }

      tasks.push({
        repo: repo.name,
        taskNumber,
        title,
        statusSnapshot,
        filePath: planPath,
        lastUpdated,
        updatedAt,
      });
    } catch {
      // Ignore missing/invalid files
    }
  }

  tasks.sort((a, b) => a.taskNumber - b.taskNumber);
  return tasks;
}

async function collectClaudePlans(): Promise<ClaudePlanItem[]> {
  const plansDir = join(os.homedir(), ".claude", "plans");
  if (!(await isDir(plansDir))) return [];

  const cutoffMs = Date.now() - 10 * 24 * 60 * 60 * 1000;
  const entries = await readdir(plansDir, { withFileTypes: true });
  const plans: ClaudePlanItem[] = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (entry.name === "completed") continue;
      continue;
    }
    if (!entry.isFile()) continue;
    if (!entry.name.endsWith(".md")) continue;

    const filePath = join(plansDir, entry.name);
    try {
      const fileStats = await stat(filePath);
      const updatedAt = fileStats.mtime.toISOString();
      const updatedAtMs = Date.parse(updatedAt);
      if (Number.isFinite(updatedAtMs) && updatedAtMs < cutoffMs) continue;

      const header = await readFileHeader(filePath, 4096);
      plans.push({
        filename: entry.name,
        title: extractMarkdownTitle(header),
        filePath,
        updatedAt,
      });
    } catch {
      // ignore
    }
  }

  plans.sort((a, b) => Date.parse(b.updatedAt ?? "") - Date.parse(a.updatedAt ?? ""));
  return plans;
}

async function collectRepoStatus(repo: RepoConfig): Promise<RepoStatus> {
  const errors: string[] = [];

  const empty: RepoStatus = {
    name: repo.name,
    path: repo.path,
    githubRemote: repo.githubRemote,
    currentBranch: "",
    branches: [],
    commits: [],
    changes: [],
    pullRequests: [],
    worktrees: [],
    errors,
  };

  if (!(await isDir(repo.path))) {
    errors.push(`Repo directory not found: ${repo.path}`);
    return empty;
  }

  const [
    currentBranchRes,
    branchesRes,
    commitsRes,
    changesRes,
    worktreesRes,
    prsRes,
  ] = await Promise.all([
    safeExec("git", ["rev-parse", "--abbrev-ref", "HEAD"], repo.path),
    safeExec(
      "git",
      ["for-each-ref", "--format=%(refname)|%(committerdate:iso-strict)", "refs/heads", "refs/remotes"],
      repo.path,
    ),
    safeExec("git", ["log", "--format=%H|%s|%an|%aI", "-20"], repo.path),
    safeExec("git", ["status", "--porcelain"], repo.path),
    safeExec("git", ["worktree", "list", "--porcelain"], repo.path),
    safeExec(
      "gh",
      [
        "pr",
        "list",
        "--repo",
        repo.githubRemote,
        "--json",
        "number,title,url,state,headRefName,author",
        "--limit",
        "20",
      ],
      repo.path,
    ),
  ]);

  if (currentBranchRes.exitCode === 0) empty.currentBranch = currentBranchRes.stdout.trim();
  else errors.push(`git rev-parse failed: ${clipError(currentBranchRes.stderr || currentBranchRes.stdout)}`);

  if (branchesRes.exitCode === 0) empty.branches = parseBranchRefs(branchesRes.stdout, empty.currentBranch);
  else errors.push(`git branch failed: ${clipError(branchesRes.stderr || branchesRes.stdout)}`);

  if (commitsRes.exitCode === 0) empty.commits = parseCommits(commitsRes.stdout);
  else errors.push(`git log failed: ${clipError(commitsRes.stderr || commitsRes.stdout)}`);

  if (changesRes.exitCode === 0) empty.changes = parseChanges(changesRes.stdout);
  else errors.push(`git status failed: ${clipError(changesRes.stderr || changesRes.stdout)}`);

  if (worktreesRes.exitCode === 0) empty.worktrees = parseWorktrees(worktreesRes.stdout);
  else errors.push(`git worktree failed: ${clipError(worktreesRes.stderr || worktreesRes.stdout)}`);

  if (empty.worktrees.length > 0) {
    await Promise.all(
      empty.worktrees.map(async (wt) => {
        let resolvedHash = wt.headHash;
        if (!resolvedHash && wt.branch) {
          const revCandidates = [wt.branch, `origin/${wt.branch}`];
          for (const candidate of revCandidates) {
            const revRes = await safeExec("git", ["rev-parse", candidate], repo.path);
            if (revRes.exitCode !== 0) continue;

            const hash = revRes.stdout.trim();
            if (!hash || /^0+$/.test(hash)) continue;

            resolvedHash = hash;
            wt.headHash = hash;
            break;
          }
        }

        if (!resolvedHash) return;

        const res = await safeExec("git", ["show", "-s", "--format=%cI", resolvedHash], repo.path);
        wt.headCommitDate = res.exitCode === 0 ? res.stdout.trim() || null : null;
      }),
    );
  }

  if (prsRes.exitCode === 0) {
    try {
      const parsed = JSON.parse(prsRes.stdout) as Array<{
        number: number;
        title: string;
        url: string;
        state: string;
        headRefName: string;
        author?: { login?: string | null } | null;
      }>;
      empty.pullRequests = parsed.map((pr) => ({
        number: pr.number,
        title: pr.title,
        url: pr.url,
        state: pr.state,
        headRefName: pr.headRefName,
        author: pr.author?.login ?? null,
      }));
    } catch (e) {
      errors.push(`gh pr list JSON parse failed: ${(e as Error).message}`);
      empty.pullRequests = [];
    }
  } else {
    errors.push(`gh pr list failed: ${clipError(prsRes.stderr || prsRes.stdout)}`);
    empty.pullRequests = [];
  }

  return empty;
}

export async function getDevDashboardData(): Promise<DevDashboardData> {
  const generatedAt = new Date().toISOString();
  const cutoffMs = Date.now() - 10 * 24 * 60 * 60 * 1000;

  const repoStatusesPromise = Promise.allSettled(REPOS.map((repo) => collectRepoStatus(repo)));
  const taskPlansPromise = Promise.allSettled(REPOS.map((repo) => collectTaskPlans(repo)));
  const claudePlansPromise = collectClaudePlans();

  const [repoStatusesSettled, taskPlansSettled, claudePlans] = await Promise.all([
    repoStatusesPromise,
    taskPlansPromise,
    claudePlansPromise,
  ]);

  const repos: RepoStatus[] = [];
  for (let i = 0; i < REPOS.length; i += 1) {
    const repoConfig = REPOS[i];
    const settled = repoStatusesSettled[i];
    if (settled.status === "fulfilled") {
      repos.push(settled.value);
    } else {
      repos.push({
        name: repoConfig.name,
        path: repoConfig.path,
        githubRemote: repoConfig.githubRemote,
        currentBranch: "",
        branches: [],
        commits: [],
        changes: [],
        pullRequests: [],
        worktrees: [],
        errors: [`Failed to collect repo status: ${settled.reason instanceof Error ? settled.reason.message : String(settled.reason)}`],
      });
    }
  }

  const taskPlans: TaskPlanItem[] = [];
  for (let i = 0; i < REPOS.length; i += 1) {
    const settled = taskPlansSettled[i];
    if (settled.status === "fulfilled") {
      taskPlans.push(...settled.value);
    }
  }
  const filteredTaskPlans = taskPlans
    .filter((plan) => {
      const ms = plan.updatedAt ? Date.parse(plan.updatedAt) : NaN;
      if (!Number.isFinite(ms)) return true;
      return ms >= cutoffMs;
    })
    .sort((a, b) => Date.parse(b.updatedAt ?? "") - Date.parse(a.updatedAt ?? ""));

  return {
    repos,
    tasks: {
      taskPlans: filteredTaskPlans,
      claudePlans,
    },
    generatedAt,
  };
}
