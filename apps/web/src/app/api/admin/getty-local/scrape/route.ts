import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { execFile } from "node:child_process";
import { access } from "node:fs/promises";
import path from "node:path";

export const dynamic = "force-dynamic";
export const maxDuration = 800;

const DEFAULT_GETTY_LOCAL_URL = "http://127.0.0.1:3456";
const SCRAPE_TIMEOUT_MS = 600_000; // 10 minutes — Getty scrapes can be large
const SUBPROCESS_MAX_BUFFER = 100 * 1024 * 1024; // 100 MB — large catalogs

const getGettyLocalUrl = (): string =>
  (process.env.TRR_GETTY_LOCAL_URL ?? DEFAULT_GETTY_LOCAL_URL).replace(/\/+$/, "");

// ---------------------------------------------------------------------------
// Resolve the TRR-Backend directory.  Walks up from `process.cwd()` looking
// for a sibling `TRR-Backend/scripts/getty_scrape_json.py`.  Also checks the
// `TRR_BACKEND_DIR` env var as an explicit override.
// ---------------------------------------------------------------------------
const resolveBackendDir = async (): Promise<string | null> => {
  const explicit = process.env.TRR_BACKEND_DIR?.trim();
  if (explicit) {
    try {
      await access(path.join(explicit, "scripts/getty_scrape_json.py"));
      return explicit;
    } catch {
      /* fall through */
    }
  }

  // Walk up from cwd looking for TRR-Backend as a sibling
  let dir = process.cwd();
  for (let i = 0; i < 6; i++) {
    const candidate = path.join(dir, "TRR-Backend");
    try {
      await access(path.join(candidate, "scripts/getty_scrape_json.py"));
      return candidate;
    } catch {
      /* try parent */
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
};

// ---------------------------------------------------------------------------
// Find the Python interpreter — prefers the backend venv, falls back to PATH.
// ---------------------------------------------------------------------------
const resolvePython = async (backendDir: string): Promise<string> => {
  const venvPython = path.join(backendDir, ".venv/bin/python");
  try {
    await access(venvPython);
    return venvPython;
  } catch {
    return "python3";
  }
};

// ---------------------------------------------------------------------------
// Run the Getty scrape as a Python subprocess.
// ---------------------------------------------------------------------------
const runSubprocess = (
  python: string,
  scriptPath: string,
  personName: string
): Promise<{ stdout: string; stderr: string }> =>
  new Promise((resolve, reject) => {
    const child = execFile(
      python,
      [scriptPath, personName],
      {
        timeout: SCRAPE_TIMEOUT_MS,
        maxBuffer: SUBPROCESS_MAX_BUFFER,
        env: { ...process.env, PYTHONDONTWRITEBYTECODE: "1" },
      },
      (error, stdout, stderr) => {
        if (error) {
          reject(
            Object.assign(error, {
              stderr: typeof stderr === "string" ? stderr : "",
            })
          );
        } else {
          resolve({
            stdout: typeof stdout === "string" ? stdout : "",
            stderr: typeof stderr === "string" ? stderr : "",
          });
        }
      }
    );
    // Ensure child is cleaned up if this route handler is aborted
    child.unref();
  });

// ---------------------------------------------------------------------------
// Try the standalone local server (if running).
// ---------------------------------------------------------------------------
const tryLocalServer = async (
  personName: string
): Promise<Response | null> => {
  const gettyLocalUrl = getGettyLocalUrl();
  try {
    const healthResp = await fetch(`${gettyLocalUrl}/health`, {
      signal: AbortSignal.timeout(2_000),
    });
    if (!healthResp.ok) return null;
  } catch {
    return null;
  }

  const resp = await fetch(`${gettyLocalUrl}/scrape`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ person_name: personName }),
    signal: AbortSignal.timeout(SCRAPE_TIMEOUT_MS),
  });
  if (!resp.ok) {
    const errText = await resp.text().catch(() => "unknown");
    return Response.json(
      { error: "Getty local server scrape failed", detail: errText.slice(0, 500) },
      { status: 502 }
    );
  }
  return Response.json(await resp.json());
};

/**
 * POST /api/admin/getty-local/scrape
 *
 * Scrapes Getty images + events for a person via the local machine's
 * residential IP.  Getty blocks cloud IPs so this must run locally.
 *
 * Strategy:
 *   1. If the standalone Getty server is running (make getty-server) → use it
 *   2. Otherwise, spawn a Python subprocess directly (zero setup required)
 *
 * Request body: { person_name: string }
 * Response: { merged, merged_total, merged_events, merged_events_total, ... }
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const personName =
    typeof body.person_name === "string" ? body.person_name.trim() : "";
  if (!personName) {
    return Response.json(
      { error: "person_name is required" },
      { status: 400 }
    );
  }

  // ── Strategy 1: Try the standalone local server (fast path) ──────
  try {
    const serverResult = await tryLocalServer(personName);
    if (serverResult) return serverResult;
  } catch {
    // Server not available or errored — fall through to subprocess
  }

  // ── Strategy 2: Spawn Python subprocess directly ─────────────────
  const backendDir = await resolveBackendDir();
  if (!backendDir) {
    return Response.json(
      {
        error: "Cannot locate TRR-Backend directory",
        detail:
          "Looked for TRR-Backend/scripts/getty_scrape_json.py relative to the workspace root.",
        hint: "Set the TRR_BACKEND_DIR environment variable or start the Getty server with: make getty-server",
      },
      { status: 500 }
    );
  }

  const python = await resolvePython(backendDir);
  const scriptPath = path.join(backendDir, "scripts/getty_scrape_json.py");

  try {
    const { stdout, stderr } = await runSubprocess(python, scriptPath, personName);
    if (stderr) {
      // Progress messages go to stderr — log them for visibility
      console.log("[getty-local/scrape] subprocess stderr:\n", stderr.slice(-2000));
    }
    const trimmed = stdout.trim();
    if (!trimmed) {
      return Response.json(
        {
          error: "Getty scrape returned no output",
          detail: stderr.slice(-500),
        },
        { status: 500 }
      );
    }
    const data = JSON.parse(trimmed);
    return Response.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stderr =
      err && typeof err === "object" && "stderr" in err
        ? String((err as { stderr: unknown }).stderr).slice(-500)
        : "";
    const isTimeout = message.includes("TIMEOUT") || message.includes("timed out");
    return Response.json(
      {
        error: isTimeout
          ? "Getty scrape timed out (10 min limit)"
          : "Getty scrape subprocess failed",
        detail: stderr || message,
        hint: isTimeout
          ? "The person may have too many Getty images. Try using make getty-server for a persistent server."
          : `Python subprocess failed. Ensure ${python} works and TRR-Backend dependencies are installed.`,
      },
      { status: isTimeout ? 504 : 500 }
    );
  }
}
