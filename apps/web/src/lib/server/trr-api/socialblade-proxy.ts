import "server-only";

import { NextResponse } from "next/server";
import { isTimeoutSafeFetchTimeoutError } from "@/lib/server/timeout-safe-fetch";

const backendMetadataKeys = ["code", "status", "retryable", "reason", "trace_id", "request_id"] as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const readString = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;

export const buildSocialBladeBackendErrorPayload = (
  data: Record<string, unknown>,
  fallback: string,
): Record<string, unknown> => {
  const detail = data.detail;
  const detailRecord = isRecord(detail) ? detail : null;
  const payload: Record<string, unknown> = {
    error:
      readString(data.error) ??
      readString(detail) ??
      readString(detailRecord?.message) ??
      readString(detailRecord?.error) ??
      fallback,
  };

  const detailText = readString(detail);
  if (detailText) {
    payload.detail = detailText;
  } else if (detailRecord) {
    payload.detail = detailRecord;
  }

  for (const key of backendMetadataKeys) {
    const value = data[key] ?? detailRecord?.[key];
    if (typeof value !== "undefined") {
      payload[key] = value;
    }
  }

  return payload;
};

export const buildSocialBladeTimeoutResponse = (
  error: unknown,
  fallbackTimeoutMs: number,
) => {
  const timeoutMs = isTimeoutSafeFetchTimeoutError(error) ? error.timeoutMs : fallbackTimeoutMs;
  return NextResponse.json(
    {
      error: "SocialBlade backend request timed out",
      code: "SOCIALBLADE_UPSTREAM_TIMEOUT",
      retryable: true,
      detail: {
        message: `Timed out waiting for SocialBlade backend response after ${Math.round(timeoutMs / 1000)}s.`,
        code: "SOCIALBLADE_UPSTREAM_TIMEOUT",
        timeout_ms: timeoutMs,
      },
    },
    { status: 504 },
  );
};
