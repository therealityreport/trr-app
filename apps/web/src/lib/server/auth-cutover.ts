import "server-only";

import type { AuthDiagnosticsSnapshot } from "@/lib/server/auth";

export interface AuthCutoverReadiness {
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

function parseNonNegativeInt(name: string, defaultValue: number): number {
  const raw = (process.env[name] ?? "").trim();
  if (!raw) return defaultValue;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return defaultValue;
  return parsed;
}

export function evaluateAuthCutoverReadiness(snapshot: AuthDiagnosticsSnapshot): AuthCutoverReadiness {
  const thresholds = {
    minShadowChecks: parseNonNegativeInt("TRR_AUTH_CUTOVER_MIN_SHADOW_CHECKS", 50),
    maxShadowFailures: parseNonNegativeInt("TRR_AUTH_CUTOVER_MAX_SHADOW_FAILURES", 0),
    maxShadowMismatchEvents: parseNonNegativeInt("TRR_AUTH_CUTOVER_MAX_SHADOW_MISMATCH_EVENTS", 0),
  };

  const observed = {
    shadowChecks: snapshot.counters.shadowChecks,
    shadowFailures: snapshot.counters.shadowFailures,
    shadowMismatchEvents: snapshot.counters.shadowMismatchEvents,
  };

  const reasons: string[] = [];
  if (!snapshot.shadowMode) {
    reasons.push("Shadow mode is disabled");
  }
  if (observed.shadowChecks < thresholds.minShadowChecks) {
    reasons.push(
      `Shadow checks below threshold (${observed.shadowChecks}/${thresholds.minShadowChecks})`,
    );
  }
  if (observed.shadowFailures > thresholds.maxShadowFailures) {
    reasons.push(
      `Shadow failures exceed threshold (${observed.shadowFailures}/${thresholds.maxShadowFailures})`,
    );
  }
  if (observed.shadowMismatchEvents > thresholds.maxShadowMismatchEvents) {
    reasons.push(
      `Shadow mismatch events exceed threshold (${observed.shadowMismatchEvents}/${thresholds.maxShadowMismatchEvents})`,
    );
  }

  return {
    ready: reasons.length === 0,
    reasons,
    thresholds,
    observed,
  };
}
