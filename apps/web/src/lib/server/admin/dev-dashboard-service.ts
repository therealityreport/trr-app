import "server-only";

import { readdir, readFile, stat, open } from "node:fs/promises";
import type { Dirent } from "node:fs";
import { join } from "node:path";
import os from "node:os";
import { getPortlessStatus, type PortlessStatusSnapshot } from "@/lib/server/admin/portless-status";
import { safeExec } from "@/lib/server/admin/shell-exec";

export interface BranchInfo {
  name: string;
  isRemote: boolean;
  isCurrent: boolean;
  lastCommitDate: string | null;
}

export interface BranchSummaryCommit {
  hash: string;
  subject: string;
}

export type BranchRecommendation = "delete" | "pr" | "review" | "wip" | "unknown";

export interface BranchSummary {
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
  branchSummaries: BranchSummary[];
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

export interface VercelPreviewReadinessCheck {
  status: number | null;
  stdout: string;
  stderr: string;
  enabled: boolean | null;
}

export interface VercelPreviewReadiness {
  artifactPath: string;
  generatedAt: string | null;
  projectName: string | null;
  teamSlug: string | null;
  teamId: string | null;
  activeProjectDir: string | null;
  latestDeploymentUrl: string | null;
  webAnalyticsEnabled: boolean | null;
  speedInsightsEnabled: boolean | null;
  checks: {
    webAnalytics: VercelPreviewReadinessCheck | null;
    speedInsights: VercelPreviewReadinessCheck | null;
    deployments: VercelPreviewReadinessCheck | null;
  };
  errors: string[];
}

export interface VercelCleanupLink {
  ok: boolean;
  classification: string;
  projectDir: string;
  projectFile: string;
  projectName: string;
  projectId: string;
  teamId: string;
  cleanupPath: string;
  error?: string;
}

export interface VercelCleanupDoctor {
  ok: boolean;
  expectedName: string;
  expectedId: string;
  links: VercelCleanupLink[];
  errors: string[];
}

export interface DevDashboardData {
  repos: RepoStatus[];
  tasks: OutstandingTasks;
  portlessStatus: PortlessStatusSnapshot;
  vercelPreviewReadiness: VercelPreviewReadiness | null;
  vercelCleanupDoctor: VercelCleanupDoctor;
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
];

const WORKSPACE_ROOT = "/Users/thomashulihan/Projects/TRR";
const TRR_APP_ROOT = "/Users/thomashulihan/Projects/TRR/TRR-APP";
const VERCEL_PREVIEW_READY_RELATIVE_PATH = ".logs/workspace/vercel-preview-ready/latest.json";
const EXPECTED_VERCEL_PROJECT_NAME = "trr-app";
const EXPECTED_VERCEL_PROJECT_ID = "prj_MHpStkwr26rV5kjt0f80zqhwZpAs";
const KNOWN_STALE_VERCEL_PROJECTS = new Map([
  ["web|prj_0nWn8xpm9ikhcvhzE3ma4jUXTe1p", "stale-old-web-project"],
]);
const VERCEL_SCAN_PRUNED_DIRS = new Set([".git", "node_modules", ".next", "dist", "build", ".turbo", ".venv", "__pycache__"]);

function clipError(text: string, maxLen = 400) {
  const trimmed = text.trim();
  if (trimmed.length <= maxLen) return trimmed;
  return `${trimmed.slice(0, maxLen)}…`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readOptionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function readOptionalNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function parseEnabledFromCliOutput(output: string): boolean | null {
  const start = output.indexOf("{");
  const end = output.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(output.slice(start, end + 1));
    if (!isRecord(parsed)) return null;
    return typeof parsed.enabled === "boolean" ? parsed.enabled : null;
  } catch {
    return null;
  }
}

function parseVercelPreviewCheck(value: unknown): VercelPreviewReadinessCheck | null {
  if (!isRecord(value)) return null;
  const stdout = typeof value.stdout === "string" ? value.stdout : "";
  return {
    status: readOptionalNumber(value.status),
    stdout,
    stderr: typeof value.stderr === "string" ? value.stderr : "",
    enabled: parseEnabledFromCliOutput(stdout),
  };
}

function emptyVercelPreviewReadiness(artifactPath: string, errors: string[]): VercelPreviewReadiness {
  return {
    artifactPath,
    generatedAt: null,
    projectName: null,
    teamSlug: null,
    teamId: null,
    activeProjectDir: null,
    latestDeploymentUrl: null,
    webAnalyticsEnabled: null,
    speedInsightsEnabled: null,
    checks: {
      webAnalytics: null,
      speedInsights: null,
      deployments: null,
    },
    errors,
  };
}

export async function readVercelPreviewReadinessArtifact(
  workspaceRoot = WORKSPACE_ROOT,
): Promise<VercelPreviewReadiness | null> {
  const artifactPath = join(workspaceRoot, VERCEL_PREVIEW_READY_RELATIVE_PATH);

  let raw: string;
  try {
    raw = await readFile(artifactPath, "utf-8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    return emptyVercelPreviewReadiness(artifactPath, [
      `Failed to read preview readiness artifact: ${(error as Error).message}`,
    ]);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    return emptyVercelPreviewReadiness(artifactPath, [
      `Preview readiness artifact JSON parse failed: ${(error as Error).message}`,
    ]);
  }

  if (!isRecord(parsed)) {
    return emptyVercelPreviewReadiness(artifactPath, ["Preview readiness artifact is not a JSON object."]);
  }

  const checks = isRecord(parsed.checks) ? parsed.checks : {};
  const webAnalytics = parseVercelPreviewCheck(checks.webAnalytics);
  const speedInsights = parseVercelPreviewCheck(checks.speedInsights);
  const deployments = parseVercelPreviewCheck(checks.deployments);
  const errors: string[] = [];

  if (webAnalytics && webAnalytics.status !== null && webAnalytics.status !== 0) {
    errors.push(`Web Analytics check exited ${webAnalytics.status}: ${clipError(webAnalytics.stderr || webAnalytics.stdout)}`);
  }
  if (speedInsights && speedInsights.status !== null && speedInsights.status !== 0) {
    errors.push(`Speed Insights check exited ${speedInsights.status}: ${clipError(speedInsights.stderr || speedInsights.stdout)}`);
  }
  if (deployments && deployments.status !== null && deployments.status !== 0) {
    errors.push(`Deployments check exited ${deployments.status}: ${clipError(deployments.stderr || deployments.stdout)}`);
  }

  return {
    artifactPath,
    generatedAt: readOptionalString(parsed.generatedAt),
    projectName: readOptionalString(parsed.projectName),
    teamSlug: readOptionalString(parsed.teamSlug),
    teamId: readOptionalString(parsed.teamId),
    activeProjectDir: readOptionalString(parsed.activeProjectDir),
    latestDeploymentUrl: readOptionalString(parsed.latestDeploymentUrl),
    webAnalyticsEnabled: webAnalytics?.enabled ?? null,
    speedInsightsEnabled: speedInsights?.enabled ?? null,
    checks: {
      webAnalytics,
      speedInsights,
      deployments,
    },
    errors,
  };
}

function classifyVercelProjectLink(name: string, projectId: string) {
  if (name === EXPECTED_VERCEL_PROJECT_NAME && projectId === EXPECTED_VERCEL_PROJECT_ID) {
    return { ok: true, classification: "project-of-record" };
  }
  const knownStale = KNOWN_STALE_VERCEL_PROJECTS.get(`${name}|${projectId}`);
  if (knownStale) {
    return { ok: false, classification: knownStale };
  }
  if (name === EXPECTED_VERCEL_PROJECT_NAME) {
    return { ok: false, classification: "expected-name-wrong-id" };
  }
  if (name === "web") {
    return { ok: false, classification: "stale-web-project-name" };
  }
  return { ok: false, classification: "unknown-project-link" };
}

async function collectVercelProjectFiles(root: string, projectFiles: string[] = []): Promise<string[]> {
  let entries: Dirent<string>[];
  try {
    entries = await readdir(root, { withFileTypes: true });
  } catch {
    return projectFiles;
  }

  const hasProjectJson = entries.some((entry) => entry.isFile() && entry.name === "project.json");
  if (root.endsWith("/.vercel") && hasProjectJson) {
    projectFiles.push(join(root, "project.json"));
    return projectFiles;
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (VERCEL_SCAN_PRUNED_DIRS.has(entry.name)) continue;
    await collectVercelProjectFiles(join(root, entry.name), projectFiles);
  }
  return projectFiles;
}

export async function readVercelCleanupDoctor(scanRoot = TRR_APP_ROOT): Promise<VercelCleanupDoctor> {
  const links: VercelCleanupLink[] = [];
  const errors: string[] = [];
  const projectFiles = await collectVercelProjectFiles(scanRoot);

  for (const projectFile of projectFiles.sort()) {
    const projectDir = projectFile.replace(/\/\.vercel\/project\.json$/, "");
    const cleanupPath = join(projectDir, ".vercel");
    try {
      const parsed: unknown = JSON.parse(await readFile(projectFile, "utf-8"));
      if (!isRecord(parsed)) {
        links.push({
          ok: false,
          classification: "unreadable-project-link",
          projectDir,
          projectFile,
          projectName: "",
          projectId: "",
          teamId: "",
          cleanupPath,
          error: "project.json is not a JSON object",
        });
        continue;
      }

      const projectName = readOptionalString(parsed.projectName) ?? "";
      const projectId = readOptionalString(parsed.projectId) ?? "";
      const teamId = readOptionalString(parsed.orgId) ?? readOptionalString(parsed.teamId) ?? "";
      const classified = classifyVercelProjectLink(projectName, projectId);
      links.push({
        ok: classified.ok,
        classification: classified.classification,
        projectDir,
        projectFile,
        projectName,
        projectId,
        teamId,
        cleanupPath,
      });
    } catch (error) {
      links.push({
        ok: false,
        classification: "unreadable-project-link",
        projectDir,
        projectFile,
        projectName: "",
        projectId: "",
        teamId: "",
        cleanupPath,
        error: (error as Error).message,
      });
    }
  }

  if (links.length === 0) {
    errors.push(`No local Vercel project links found under ${scanRoot}.`);
  }

  return {
    ok: links.length > 0 && links.every((link) => link.ok),
    expectedName: EXPECTED_VERCEL_PROJECT_NAME,
    expectedId: EXPECTED_VERCEL_PROJECT_ID,
    links,
    errors,
  };
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

function parseLocalBranchDates(output: string): Array<{ name: string; lastCommitDate: string | null }> {
  const results: Array<{ name: string; lastCommitDate: string | null }> = [];

  for (const rawLine of output.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;

    const sepIndex = line.indexOf("|");
    if (sepIndex === -1) continue;
    const refname = line.slice(0, sepIndex).trim();
    const date = line.slice(sepIndex + 1).trim();

    if (!refname.startsWith("refs/heads/")) continue;
    const name = refname.slice("refs/heads/".length);
    if (!name || name === "HEAD") continue;
    results.push({ name, lastCommitDate: date || null });
  }

  return results;
}

function chooseBaseRef(
  forEachRefOutput: string,
  localBranches: Array<{ name: string }>,
  currentBranch: string,
) {
  // `git cherry` takes `<upstream>` and `<head>` revs. In some single-branch/worktree setups,
  // there is no local `main`, but `origin/main` exists. Prefer an available remote base ref
  // instead of hardcoding `main` and getting `fatal: unknown commit main`.
  const localNames = new Set(localBranches.map((b) => b.name));
  const remoteNames = new Set<string>(); // e.g. "origin/main"

  for (const rawLine of forEachRefOutput.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;
    const sepIndex = line.indexOf("|");
    const refname = (sepIndex === -1 ? line : line.slice(0, sepIndex)).trim();

    if (!refname.startsWith("refs/remotes/")) continue;
    const rest = refname.slice("refs/remotes/".length); // "<remote>/<branch>"
    const slashIndex = rest.indexOf("/");
    if (slashIndex === -1) continue;
    const remote = rest.slice(0, slashIndex);
    const branch = rest.slice(slashIndex + 1);

    if (!remote || !branch) continue;
    if (branch === "HEAD" || /\/HEAD$/.test(refname)) continue;
    remoteNames.add(`${remote}/${branch}`);
  }

  if (localNames.has("main")) return "main";
  if (localNames.has("master")) return "master";

  if (remoteNames.has("origin/main")) return "origin/main";
  if (remoteNames.has("origin/master")) return "origin/master";

  for (const candidate of remoteNames) {
    if (candidate.endsWith("/main")) return candidate;
  }
  for (const candidate of remoteNames) {
    if (candidate.endsWith("/master")) return candidate;
  }

  if (currentBranch && localNames.has(currentBranch)) return currentBranch;

  // Last-resort fallback: pick an existing ref name if possible (avoid hardcoding `main`).
  const anyLocal = Array.from(localNames).sort()[0];
  if (anyLocal) return anyLocal;
  const anyRemote = Array.from(remoteNames).sort()[0];
  if (anyRemote) return anyRemote;

  return currentBranch || "main";
}

function parseCherryOutput(output: string): {
  uniqueCommits: BranchSummaryCommit[];
  uniquePatches: number;
  appliedPatches: number;
} {
  const uniqueCommits: BranchSummaryCommit[] = [];
  let uniquePatches = 0;
  let appliedPatches = 0;

  for (const rawLine of output.split("\n")) {
    const line = rawLine.trimEnd();
    if (!line.trim()) continue;
    const match = line.match(/^([+-])\s+([0-9a-f]{7,40})\s+(.*)$/);
    if (!match?.[1] || !match[2]) continue;

    const sign = match[1];
    const hash = match[2];
    const subject = (match[3] || "").trim();

    if (sign === "+") {
      uniquePatches += 1;
      if (uniqueCommits.length < 5) uniqueCommits.push({ hash, subject: subject || "(no subject)" });
    } else {
      appliedPatches += 1;
    }
  }

  return { uniqueCommits, uniquePatches, appliedPatches };
}

function parseShortStat(shortStat: string | null): { files: number; insertions: number; deletions: number } | null {
  if (!shortStat) return null;
  const filesMatch = shortStat.match(/(\d+)\s+files?\s+changed/i);
  const insertionsMatch = shortStat.match(/(\d+)\s+insertions?\(\+\)/i);
  const deletionsMatch = shortStat.match(/(\d+)\s+deletions?\(-\)/i);

  const files = filesMatch?.[1] ? Number.parseInt(filesMatch[1], 10) : 0;
  const insertions = insertionsMatch?.[1] ? Number.parseInt(insertionsMatch[1], 10) : 0;
  const deletions = deletionsMatch?.[1] ? Number.parseInt(deletionsMatch[1], 10) : 0;

  if (![files, insertions, deletions].every((n) => Number.isFinite(n))) return null;
  return { files, insertions, deletions };
}

function recommendBranch(
  name: string,
  uniquePatches: number,
  shortStat: string | null,
): { rec: BranchRecommendation; reason: string } {
  if (uniquePatches <= 0) {
    return { rec: "delete", reason: "No unique patches vs base branch (already applied or empty)." };
  }

  if (/\bwip\b/i.test(name) || /-wip$/i.test(name)) {
    return { rec: "wip", reason: "Branch name suggests WIP; review before opening a PR." };
  }

  const stats = parseShortStat(shortStat);
  if (stats) {
    const { deletions, insertions } = stats;
    if (deletions > 1000 && deletions > insertions * 3) {
      return {
        rec: "review",
        reason: "Large net deletions vs base branch; likely stale/experimental. Review (and probably rebase) before PR.",
      };
    }
  }

  return { rec: "pr", reason: "Has unique patches vs base branch; open a PR if this work is still desired." };
}

async function collectBranchSummaries(
  repo: RepoConfig,
  baseBranch: string,
  localBranches: Array<{ name: string; lastCommitDate: string | null }>,
): Promise<BranchSummary[]> {
  // Keep this bounded; some dev machines have many local branches.
  const candidates = localBranches
    .filter((b) => b.name && b.name !== baseBranch)
    .sort((a, b) => {
      const aMs = a.lastCommitDate ? Date.parse(a.lastCommitDate) : Number.NEGATIVE_INFINITY;
      const bMs = b.lastCommitDate ? Date.parse(b.lastCommitDate) : Number.NEGATIVE_INFINITY;
      if (Number.isFinite(aMs) && Number.isFinite(bMs) && aMs !== bMs) return bMs - aMs;
      if (Number.isFinite(aMs) && !Number.isFinite(bMs)) return -1;
      if (!Number.isFinite(aMs) && Number.isFinite(bMs)) return 1;
      return a.name.localeCompare(b.name);
    })
    .slice(0, 25);

  const summaries: BranchSummary[] = [];

  // Small concurrency to keep API latency reasonable.
  const limit = 4;
  for (let i = 0; i < candidates.length; i += limit) {
    const chunk = candidates.slice(i, i + limit);
    const chunkResults = await Promise.all(
      chunk.map(async (branch) => {
        const summary: BranchSummary = {
          name: branch.name,
          baseBranch,
          lastCommitDate: branch.lastCommitDate,
          uniquePatches: 0,
          appliedPatches: 0,
          uniqueCommits: [],
          shortStat: null,
          recommendation: "unknown",
          recommendationReason: "",
          error: null,
        };

        const cherryRes = await safeExec("git", ["cherry", "-v", baseBranch, branch.name], repo.path);
        if (cherryRes.exitCode !== 0) {
          summary.error = `git cherry failed: ${clipError(cherryRes.stderr || cherryRes.stdout)}`;
          summary.recommendation = "unknown";
          summary.recommendationReason = "Unable to evaluate branch.";
          return summary;
        }

        const parsed = parseCherryOutput(cherryRes.stdout);
        summary.uniquePatches = parsed.uniquePatches;
        summary.appliedPatches = parsed.appliedPatches;
        summary.uniqueCommits = parsed.uniqueCommits;

        if (summary.uniquePatches > 0) {
          const diffRes = await safeExec("git", ["diff", "--shortstat", `${baseBranch}...${branch.name}`], repo.path);
          summary.shortStat = diffRes.exitCode === 0 ? diffRes.stdout.trim() || null : null;
        }

        const rec = recommendBranch(branch.name, summary.uniquePatches, summary.shortStat);
        summary.recommendation = rec.rec;
        summary.recommendationReason = rec.reason;
        return summary;
      }),
    );
    summaries.push(...chunkResults);
  }

  return summaries;
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
    branchSummaries: [],
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

  const localBranchDates = branchesRes.exitCode === 0 ? parseLocalBranchDates(branchesRes.stdout) : [];
  const baseBranch =
    branchesRes.exitCode === 0 ? chooseBaseRef(branchesRes.stdout, localBranchDates, empty.currentBranch) : "main";

  if (branchesRes.exitCode === 0) {
    empty.branches = parseBranchRefs(branchesRes.stdout, empty.currentBranch);
    // Best-effort: branch summaries (only for a bounded set of local branches).
    try {
      empty.branchSummaries = await collectBranchSummaries(repo, baseBranch, localBranchDates);
    } catch (exc) {
      errors.push(
        `branch summary failed: ${exc instanceof Error ? clipError(exc.message) : clipError(String(exc))}`,
      );
      empty.branchSummaries = [];
    }
  }
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
  const portlessStatusPromise = getPortlessStatus();
  const vercelPreviewReadinessPromise = readVercelPreviewReadinessArtifact();
  const vercelCleanupDoctorPromise = readVercelCleanupDoctor();

  const [repoStatusesSettled, taskPlansSettled, claudePlans, portlessStatus, vercelPreviewReadiness, vercelCleanupDoctor] =
    await Promise.all([
      repoStatusesPromise,
      taskPlansPromise,
      claudePlansPromise,
      portlessStatusPromise,
      vercelPreviewReadinessPromise,
      vercelCleanupDoctorPromise,
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
        branchSummaries: [],
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
    portlessStatus,
    vercelPreviewReadiness,
    vercelCleanupDoctor,
    generatedAt,
  };
}
