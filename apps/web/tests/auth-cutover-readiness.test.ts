import { afterEach, describe, expect, it } from "vitest";

import type { AuthDiagnosticsSnapshot } from "@/lib/server/auth";
import { evaluateAuthCutoverReadiness } from "@/lib/server/auth-cutover";

function snapshot(overrides?: Partial<AuthDiagnosticsSnapshot>): AuthDiagnosticsSnapshot {
  return {
    provider: "firebase",
    shadowMode: true,
    allowlistSizes: {
      emails: 1,
      uids: 1,
      displayNames: 1,
    },
    counters: {
      shadowChecks: 60,
      shadowFailures: 0,
      shadowMismatchEvents: 0,
      shadowMismatchFieldCounts: {
        uid: 0,
        email: 0,
        name: 0,
      },
      fallbackSuccesses: 0,
    },
    ...overrides,
  };
}

describe("evaluateAuthCutoverReadiness", () => {
  afterEach(() => {
    delete process.env.TRR_AUTH_CUTOVER_MIN_SHADOW_CHECKS;
    delete process.env.TRR_AUTH_CUTOVER_MAX_SHADOW_FAILURES;
    delete process.env.TRR_AUTH_CUTOVER_MAX_SHADOW_MISMATCH_EVENTS;
  });

  it("returns ready when shadow checks satisfy thresholds", () => {
    const result = evaluateAuthCutoverReadiness(snapshot());

    expect(result.ready).toBe(true);
    expect(result.reasons).toEqual([]);
  });

  it("returns not ready when shadow mode is disabled", () => {
    const result = evaluateAuthCutoverReadiness(snapshot({ shadowMode: false }));

    expect(result.ready).toBe(false);
    expect(result.reasons).toContain("Shadow mode is disabled");
  });

  it("honors configured threshold overrides", () => {
    process.env.TRR_AUTH_CUTOVER_MIN_SHADOW_CHECKS = "100";
    process.env.TRR_AUTH_CUTOVER_MAX_SHADOW_FAILURES = "1";
    process.env.TRR_AUTH_CUTOVER_MAX_SHADOW_MISMATCH_EVENTS = "2";

    const result = evaluateAuthCutoverReadiness(
      snapshot({
        counters: {
          shadowChecks: 100,
          shadowFailures: 2,
          shadowMismatchEvents: 3,
          shadowMismatchFieldCounts: { uid: 0, email: 0, name: 0 },
          fallbackSuccesses: 0,
        },
      }),
    );

    expect(result.ready).toBe(false);
    expect(result.thresholds).toEqual({
      minShadowChecks: 100,
      maxShadowFailures: 1,
      maxShadowMismatchEvents: 2,
    });
    expect(result.reasons).toContain("Shadow failures exceed threshold (2/1)");
    expect(result.reasons).toContain("Shadow mismatch events exceed threshold (3/2)");
  });
});
