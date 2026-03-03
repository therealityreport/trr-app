// Debug utility for tracking auth flow issues
export class AuthDebugger {
  private static logs: Array<{ timestamp: string; message: string; data?: unknown }> = [];

  static log(message: string, data?: unknown) {
    const consoleEnabled = this.isConsoleLoggingEnabled();
    const remoteEnabled = this.isRemoteLoggingEnabled();
    if (!consoleEnabled && !remoteEnabled) return;

    const timestamp = new Date().toISOString();
    const sanitizedData = sanitizePayload(data);
    const logEntry = { timestamp, message, data: sanitizedData };

    if (consoleEnabled) {
      console.log(`[AuthDebug ${timestamp}] ${message}`, sanitizedData ?? "");
    }

    // Store in memory for later retrieval
    this.logs.push(logEntry);

    // Keep only last 50 entries to prevent memory issues
    if (this.logs.length > 50) {
      this.logs = this.logs.slice(-50);
    }

    if (remoteEnabled && typeof window !== "undefined" && !isLocalHostname(window.location.hostname)) {
      try {
        fetch("/api/debug-log", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(logEntry),
        }).catch(() => {
          // Silent fail in client flows
        });
      } catch {
        // Silent fail in client flows
      }
    }
  }

  static getLogs() {
    return [...this.logs];
  }

  static clearLogs() {
    this.logs = [];
  }

  static exportLogs() {
    return JSON.stringify(this.logs, null, 2);
  }

  private static isConsoleLoggingEnabled(): boolean {
    if (typeof window === "undefined") return false;
    const enabledFlag = process.env.NEXT_PUBLIC_ENABLE_AUTH_DEBUG_LOGS === "true";
    return enabledFlag || EnvUtils.isLocal();
  }

  private static isRemoteLoggingEnabled(): boolean {
    if (typeof window === "undefined") return false;
    return process.env.NEXT_PUBLIC_ENABLE_AUTH_DEBUG_REMOTE === "true";
  }
}

function isLocalHostname(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}

const REDACTED = "[REDACTED]";
const MAX_DEPTH = 6;
const MAX_STRING_LENGTH = 512;
const SENSITIVE_KEY_RE =
  /(token|secret|password|cookie|authorization|api[_-]?key|session|credential|jwt|bearer|email|uid|user[_-]?id)/i;

function sanitizePayload(value: unknown, depth = 0): unknown {
  if (depth > MAX_DEPTH) return "[TRUNCATED]";
  if (value === null || value === undefined) return value;
  if (typeof value === "string") {
    return value.length > MAX_STRING_LENGTH ? `${value.slice(0, MAX_STRING_LENGTH)}...` : value;
  }
  if (typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((item) => sanitizePayload(item, depth + 1));

  const out: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    out[key] = SENSITIVE_KEY_RE.test(key) ? REDACTED : sanitizePayload(nested, depth + 1);
  }
  return out;
}

// Environment detection utility
export const EnvUtils = {
  isProduction: () => typeof window !== "undefined" && !isLocalHostname(window.location.hostname),
  isLocal: () => typeof window !== "undefined" && isLocalHostname(window.location.hostname),
  getEnvironmentInfo: () => ({
    hostname: typeof window !== 'undefined' ? window.location.hostname : 'server',
    userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server',
    timestamp: new Date().toISOString(),
    url: typeof window !== 'undefined' ? window.location.href : 'server',
  }),
};
