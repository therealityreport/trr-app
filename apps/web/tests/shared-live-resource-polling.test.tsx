import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render } from "@testing-library/react";

import {
  __resetSharedLiveResourceRegistryForTests,
  useSharedPollingResource,
} from "@/lib/admin/shared-live-resource";

let visibilityState: DocumentVisibilityState = "visible";

const setVisibilityState = (nextState: DocumentVisibilityState): void => {
  visibilityState = nextState;
  document.dispatchEvent(new Event("visibilitychange"));
};

const flushTimers = async (ms: number): Promise<void> => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
};

const flushReact = async (): Promise<void> => {
  await act(async () => {
    await Promise.resolve();
  });
};

const runPendingTimers = async (): Promise<void> => {
  await act(async () => {
    await vi.runOnlyPendingTimersAsync();
  });
};

function PollingHarness({
  fetcher,
  shouldRun,
}: {
  fetcher: (signal: AbortSignal) => Promise<{ ok: boolean }>;
  shouldRun: boolean;
}) {
  useSharedPollingResource({
    key: "shared-live-resource-hidden-tab-test",
    fetchData: fetcher,
    intervalMs: 1_000,
    shouldRun,
    leaseDurationMs: 2_000,
    followerCheckIntervalMs: 1_000,
    startupJitterMs: [0, 0],
  });
  return null;
}

describe("useSharedPollingResource visibility budget", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-26T12:00:00.000Z"));
    visibilityState = "visible";
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => visibilityState,
    });
    window.localStorage.clear();
    __resetSharedLiveResourceRegistryForTests();
  });

  afterEach(() => {
    __resetSharedLiveResourceRegistryForTests();
    window.localStorage.clear();
    vi.useRealTimers();
  });

  it("pauses polling while hidden and resumes only when visible with active interest", async () => {
    const fetcher = vi.fn(async () => ({ ok: true }));
    const { rerender } = render(<PollingHarness fetcher={fetcher} shouldRun />);

    await flushReact();
    await runPendingTimers();
    expect(fetcher).toHaveBeenCalledTimes(1);

    setVisibilityState("hidden");
    await flushTimers(10_000);
    expect(fetcher).toHaveBeenCalledTimes(1);

    rerender(<PollingHarness fetcher={fetcher} shouldRun={false} />);
    setVisibilityState("visible");
    await flushTimers(5_000);
    expect(fetcher).toHaveBeenCalledTimes(1);

    rerender(<PollingHarness fetcher={fetcher} shouldRun />);
    await flushReact();
    await flushTimers(1_000);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
