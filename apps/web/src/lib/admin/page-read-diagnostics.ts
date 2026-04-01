export type AdminPageRequestRole = "primary" | "secondary" | "polling";

export type AdminPageReadDiagnostic = {
  pageFamily: string;
  resource: string;
  requestRole: AdminPageRequestRole;
  phase: "start" | "success" | "error";
  dedupeHit?: boolean;
  cacheHit?: boolean;
  backoffState?: string;
  payloadBytes?: number;
  queryCount?: number;
  checkoutWaitMs?: number;
  queryMs?: number;
  serializeMs?: number;
  durationMs?: number;
  message?: string;
};

export const measurePayloadBytes = (payload: unknown): number | undefined => {
  if (payload == null) return undefined;
  try {
    return new TextEncoder().encode(JSON.stringify(payload)).length;
  } catch {
    return undefined;
  }
};

export const logAdminPageReadDiagnostic = (entry: AdminPageReadDiagnostic): void => {
  if (process.env.NODE_ENV === "test") {
    return;
  }
  const logger = entry.phase === "error" ? console.warn : console.info;
  logger("[admin_page_request]", entry);
};
