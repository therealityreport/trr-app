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

const createDeferred = <T,>(): { promise: Promise<T>; resolve: (value: T) => void } => {
  let resolve: (value: T) => void = () => {};
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve;
  });
  return { promise, resolve };
};

type PollRefresh = (request?: {
  forceRefresh?: boolean;
  cause?: "interval" | "manual" | "mutation" | "visibility";
}) => void;

function PollingHarness({
  fetcher,
  shouldRun,
  onRefetch,
}: {
  fetcher: (signal: AbortSignal) => Promise<{ ok: boolean }>;
  shouldRun: boolean;
  onRefetch?: (refetch: PollRefresh) => void;
}) {
  const resource = useSharedPollingResource({
    key: "shared-live-resource-hidden-tab-test",
    fetchData: fetcher,
    intervalMs: 1_000,
    shouldRun,
    leaseDurationMs: 2_000,
    followerCheckIntervalMs: 1_000,
    startupJitterMs: [0, 0],
  });
  React.useEffect(() => {
    onRefetch?.(resource.refetch);
  }, [onRefetch, resource.refetch]);
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

  it("does not start a duplicate poll when shared subscribers refresh during an in-flight request", async () => {
    const firstRequest = createDeferred<{ ok: boolean }>();
    const queuedRequest = createDeferred<{ ok: boolean }>();
    const fetcher = vi
      .fn<(signal: AbortSignal) => Promise<{ ok: boolean }>>()
      .mockImplementationOnce(() => firstRequest.promise)
      .mockImplementationOnce(() => queuedRequest.promise);
    let firstRefetch: PollRefresh | null = null;
    let secondRefetch: PollRefresh | null = null;

    render(
      <>
        <PollingHarness
          fetcher={fetcher}
          shouldRun
          onRefetch={(refetch) => {
            firstRefetch = refetch;
          }}
        />
        <PollingHarness
          fetcher={fetcher}
          shouldRun
          onRefetch={(refetch) => {
            secondRefetch = refetch;
          }}
        />
      </>,
    );

    await flushReact();
    await runPendingTimers();
    expect(fetcher).toHaveBeenCalledTimes(1);

    firstRefetch?.({ forceRefresh: true, cause: "manual" });
    secondRefetch?.({ forceRefresh: true, cause: "manual" });
    await runPendingTimers();
    expect(fetcher).toHaveBeenCalledTimes(1);

    await act(async () => {
      firstRequest.resolve({ ok: true });
      await firstRequest.promise;
    });
    await runPendingTimers();
    expect(fetcher).toHaveBeenCalledTimes(2);

    await act(async () => {
      queuedRequest.resolve({ ok: true });
      await queuedRequest.promise;
    });
  });
});
