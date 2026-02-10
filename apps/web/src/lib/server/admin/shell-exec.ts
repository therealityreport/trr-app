import "server-only";

import { execFile } from "node:child_process";
import { resolve } from "node:path";

export interface SafeExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

const ALLOWED_COMMANDS = new Set(["git", "gh", "grep", "find"]);

const WORKSPACE_ROOT = "/Users/thomashulihan/Projects/TRR";
const TRR_BACKEND_DIR = "/Users/thomashulihan/Projects/TRR/TRR-Backend";
const TRR_APP_DIR = "/Users/thomashulihan/Projects/TRR/TRR-APP";
const SCREENALYTICS_DIR = "/Users/thomashulihan/Projects/TRR/screenalytics";

const ALLOWED_DIRS = new Set(
  [WORKSPACE_ROOT, TRR_BACKEND_DIR, TRR_APP_DIR, SCREENALYTICS_DIR].map((dir) => resolve(dir)),
);

export function getWorkspaceRoot() {
  return WORKSPACE_ROOT;
}

export function getAllowedRepoDirs() {
  return [TRR_BACKEND_DIR, TRR_APP_DIR, SCREENALYTICS_DIR];
}

function validateCommand(command: string) {
  if (!ALLOWED_COMMANDS.has(command)) {
    throw new Error(`[shell-exec] Command not allowed: ${command}`);
  }
}

function validateCwd(cwd: string) {
  const resolved = resolve(cwd);
  if (!ALLOWED_DIRS.has(resolved)) {
    throw new Error(`[shell-exec] CWD not allowed: ${cwd}`);
  }
  return resolved;
}

export async function safeExec(
  command: string,
  args: string[],
  cwd: string,
  timeoutMs = 15_000,
): Promise<SafeExecResult> {
  validateCommand(command);
  const resolvedCwd = validateCwd(cwd);

  return await new Promise<SafeExecResult>((resolvePromise) => {
    execFile(
      command,
      args,
      {
        cwd: resolvedCwd,
        timeout: timeoutMs,
        maxBuffer: 1_000_000,
        env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
      },
      (error, stdout, stderr) => {
        const out = typeof stdout === "string" ? stdout : String(stdout ?? "");
        const err = typeof stderr === "string" ? stderr : String(stderr ?? "");

        if (error) {
          const code = (error as unknown as { code?: unknown }).code;
          const exitCode = typeof code === "number" ? code : -1;
          const mergedStderr = err || (error instanceof Error ? error.message : String(error));
          resolvePromise({ stdout: out, stderr: mergedStderr, exitCode });
          return;
        }

        resolvePromise({ stdout: out, stderr: err, exitCode: 0 });
      },
    );
  });
}

