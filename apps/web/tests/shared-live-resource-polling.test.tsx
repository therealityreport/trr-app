import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render } from "@testing-library/react";

import {
  __resetSharedLiveResourceRegistryForTests,
  useSharedManualResource,
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

type ManualSnapshot = ReturnType<typeof useSharedManualResource<{ value: string }>>;

class MockBroadcastChannel {
  static instances: MockBroadcastChannel[] = [];

  readonly name: string;
  onmessage: ((event: MessageEvent) => void) | null = null;
  readonly postMessage = vi.fn();
  readonly close = vi.fn();

  constructor(name: string) {
    this.name = name;
    MockBroadcastChannel.instances.push(this);
  }

  receive(data: unknown): void {
    this.onmessage?.({ data } as MessageEvent);
  }
}

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

function ManualHarness({
  resourceKey,
  shouldRun = false,
  onSnapshot,
}: {
  resourceKey: string;
  shouldRun?: boolean;
  onSnapshot: (snapshot: ManualSnapshot) => void;
}) {
  const resource = useSharedManualResource<{ value: string }>({
    key: resourceKey,
    shouldRun,
  });
  React.useEffect(() => {
    onSnapshot(resource);
  }, [onSnapshot, resource]);
  return null;
}

const snapshotStorageKey = (resourceKey: string): string =>
  `trr:shared-live:${resourceKey}:snapshot:v1`;

const createSnapshot = (value: string, lastEventAtMs: number) => ({
  data: { value },
  error: null,
  errorDetails: null,
  lastEventAtMs,
  lastSuccessAtMs: lastEventAtMs,
  connected: true,
});

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
    MockBroadcastChannel.instances = [];
    __resetSharedLiveResourceRegistryForTests();
  });

  afterEach(() => {
    __resetSharedLiveResourceRegistryForTests();
    window.localStorage.clear();
    MockBroadcastChannel.instances = [];
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

  it("evicts the shared coordinator and closes its channel after the final subscriber unmounts", async () => {
    vi.stubGlobal("BroadcastChannel", MockBroadcastChannel);
    const onSnapshot = vi.fn();

    const { rerender, unmount } = render(
      <>
        <ManualHarness resourceKey="shared-live-resource-eviction-test" onSnapshot={onSnapshot} />
        <ManualHarness resourceKey="shared-live-resource-eviction-test" onSnapshot={onSnapshot} />
      </>,
    );
    await flushReact();

    expect(MockBroadcastChannel.instances).toHaveLength(1);
    const firstChannel = MockBroadcastChannel.instances[0];

    rerender(<ManualHarness resourceKey="shared-live-resource-eviction-test" onSnapshot={onSnapshot} />);
    await flushReact();
    expect(firstChannel.close).not.toHaveBeenCalled();

    unmount();
    expect(firstChannel.close).toHaveBeenCalledTimes(1);

    render(<ManualHarness resourceKey="shared-live-resource-eviction-test" onSnapshot={onSnapshot} />);
    await flushReact();
    expect(MockBroadcastChannel.instances).toHaveLength(2);
  });

  it("applies newer BroadcastChannel snapshots and ignores stale channel payloads", async () => {
    vi.stubGlobal("BroadcastChannel", MockBroadcastChannel);
    const snapshots: ManualSnapshot[] = [];

    render(
      <ManualHarness
        resourceKey="shared-live-resource-channel-test"
        onSnapshot={(snapshot) => {
          snapshots.push(snapshot);
        }}
      />,
    );
    await flushReact();

    const channel = MockBroadcastChannel.instances[0];
    await act(async () => {
      channel.receive(createSnapshot("fresh", 2_000));
    });
    await flushReact();
    expect(snapshots.at(-1)?.data).toEqual({ value: "fresh" });
    expect(snapshots.at(-1)?.connected).toBe(true);

    await act(async () => {
      channel.receive(createSnapshot("stale", 1_000));
    });
    await flushReact();
    expect(snapshots.at(-1)?.data).toEqual({ value: "fresh" });
  });

  it("hydrates from storage and applies valid newer storage events", async () => {
    const resourceKey = "shared-live-resource-storage-test";
    const snapshots: ManualSnapshot[] = [];
    window.localStorage.setItem(snapshotStorageKey(resourceKey), JSON.stringify(createSnapshot("cached", 1_000)));

    render(
      <ManualHarness
        resourceKey={resourceKey}
        onSnapshot={(snapshot) => {
          snapshots.push(snapshot);
        }}
      />,
    );
    await flushReact();

    expect(snapshots.at(-1)?.data).toEqual({ value: "cached" });

    await act(async () => {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: snapshotStorageKey(resourceKey),
          newValue: "{malformed",
        }),
      );
    });
    await flushReact();
    expect(snapshots.at(-1)?.data).toEqual({ value: "cached" });

    await act(async () => {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: snapshotStorageKey(resourceKey),
          newValue: JSON.stringify(createSnapshot("updated", 2_000)),
        }),
      );
    });
    await flushReact();
    expect(snapshots.at(-1)?.data).toEqual({ value: "updated" });
  });
});
