"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type AdminLiveResourceKey = string;

export type SharedLiveSnapshot<T> = {
  data: T | null;
  error: string | null;
  lastEventAtMs: number | null;
  lastSuccessAtMs: number | null;
  connected: boolean;
};

type SharedLiveSubscriber<T> = {
  shouldRun: boolean;
  onUpdate: (snapshot: SharedLiveSnapshot<T>) => void;
};

type SharedExecutorContext<T> = {
  signal: AbortSignal;
  publish: (update: Partial<SharedLiveSnapshot<T>>) => void;
};

type SharedPollRequest = {
  forceRefresh?: boolean;
  cause?: "interval" | "manual" | "mutation" | "visibility";
};

type SharedPollConfig<T> = {
  key: AdminLiveResourceKey;
  fetchData: (signal: AbortSignal, request?: SharedPollRequest) => Promise<T>;
  intervalMs: number;
  shouldRun: boolean;
  leaseDurationMs?: number;
  followerCheckIntervalMs?: number;
  startupJitterMs?: [number, number];
};

type SharedSseConfig<T> = {
  key: AdminLiveResourceKey;
  connect: (ctx: SharedExecutorContext<T>) => Promise<void>;
  reconnectIntervalMs: number;
  shouldRun: boolean;
  leaseDurationMs?: number;
  followerCheckIntervalMs?: number;
  startupJitterMs?: [number, number];
};

type SharedManualConfig = {
  key: AdminLiveResourceKey;
  shouldRun: boolean;
  leaseDurationMs?: number;
  followerCheckIntervalMs?: number;
  startupJitterMs?: [number, number];
};

type SharedResourceConfig<T> =
  | ({ mode: "poll" } & SharedPollConfig<T>)
  | ({ mode: "sse" } & SharedSseConfig<T>)
  | ({ mode: "manualRefetch" } & SharedManualConfig);

const DEFAULT_LEASE_DURATION_MS = 45_000;
const DEFAULT_FOLLOWER_CHECK_INTERVAL_MS = 5_000;
// Startup jitter spreads polling across tabs that open simultaneously. Vitest runs
// real timers with short waitFor windows, so we zero the jitter under test to keep
// initial poll latency deterministic instead of flapping [150ms, 1.2s].
const IS_TEST_ENVIRONMENT =
  typeof process !== "undefined" &&
  (process.env?.NODE_ENV === "test" || Boolean(process.env?.VITEST));
const DEFAULT_STARTUP_JITTER: [number, number] = IS_TEST_ENVIRONMENT ? [0, 0] : [150, 1_200];
const SNAPSHOT_VERSION = "v1";

type LeaderLease = {
  tabId: string;
  expiresAt: number;
};

const createTabId = (): string => {
  const randomPart = Math.random().toString(36).slice(2, 10);
  return `tab-${Date.now()}-${randomPart}`;
};

const normalizeFetchErrorMessage = (error: unknown, fallback = "Fetch failed"): string => {
  if (error instanceof DOMException && error.name === "AbortError") {
    return error.message || "Request timed out";
  }
  if (error instanceof Error) {
    return error.message || fallback;
  }
  return fallback;
};

class SharedLiveResourceCoordinator<T> {
  private readonly subscribers = new Map<string, SharedLiveSubscriber<T>>();
  private snapshot: SharedLiveSnapshot<T> = {
    data: null,
    error: null,
    lastEventAtMs: null,
    lastSuccessAtMs: null,
    connected: false,
  };
  private timer: ReturnType<typeof setTimeout> | null = null;
  private executorAbort: AbortController | null = null;
  private inFlight = false;
  private leader = false;
  private readonly tabId = createTabId();
  private readonly key: string;
  private readonly leaseKey: string;
  private readonly snapshotKey: string;
  private readonly channelName: string;
  private readonly channel: BroadcastChannel | null;
  private config: SharedResourceConfig<T>;
  private pendingPollRequest: SharedPollRequest | null = null;

  constructor(config: SharedResourceConfig<T>) {
    this.config = config;
    this.key = config.key;
    this.leaseKey = `trr:shared-live:${this.key}:lease:${SNAPSHOT_VERSION}`;
    this.snapshotKey = `trr:shared-live:${this.key}:snapshot:${SNAPSHOT_VERSION}`;
    this.channelName = `trr-shared-live-${this.key}`;

    if (typeof window === "undefined") {
      this.channel = null;
      return;
    }

    this.channel =
      typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(this.channelName) : null;
    if (this.channel) {
      this.channel.onmessage = (event) => {
        this.handleIncomingSnapshot(event.data);
      };
    }
    const cached = this.readSnapshotFromStorage();
    if (cached) {
      this.snapshot = cached;
    }
    window.addEventListener("storage", this.handleStorageEvent);
    document.addEventListener("visibilitychange", this.handleVisibilityChange);
  }

  updateConfig(config: SharedResourceConfig<T>): void {
    this.config = config;
    this.reconcile();
  }

  subscribe(id: string, onUpdate: SharedLiveSubscriber<T>["onUpdate"]): void {
    this.subscribers.set(id, { shouldRun: false, onUpdate });
    onUpdate(this.snapshot);
    this.reconcile();
  }

  unsubscribe(id: string): void {
    this.subscribers.delete(id);
    this.reconcile();
  }

  setInterest(id: string, shouldRun: boolean): void {
    const existing = this.subscribers.get(id);
    if (!existing || existing.shouldRun === shouldRun) return;
    this.subscribers.set(id, { ...existing, shouldRun });
    this.reconcile();
  }

  requestImmediateRefresh(request?: SharedPollRequest): void {
    if (!this.shouldRunInThisTab()) return;
    this.pendingPollRequest = request ?? { cause: "manual" };
    this.clearTimer();
    if (this.config.mode === "sse") {
      this.stopExecutor();
    }
    this.scheduleTick(0);
  }

  /**
   * Test-only teardown: cancels pending timers, aborts any in-flight executor, and drops
   * subscribers. Called via `__resetSharedLiveResourceRegistryForTests` in test hooks to
   * avoid leaking coordinator state between cases.
   */
  dispose(): void {
    this.clearTimer();
    this.stopExecutor();
    this.subscribers.clear();
    this.releaseLeaderLease();
    if (this.channel) {
      try {
        this.channel.close();
      } catch {
        // best-effort
      }
    }
  }

  private hasActiveInterest(): boolean {
    for (const subscriber of this.subscribers.values()) {
      if (subscriber.shouldRun) return true;
    }
    return false;
  }

  private shouldRunInThisTab(): boolean {
    if (typeof document === "undefined") return false;
    if (document.visibilityState !== "visible") return false;
    return this.hasActiveInterest();
  }

  private publish = (update: Partial<SharedLiveSnapshot<T>>, options?: { broadcast?: boolean }): void => {
    const nextSnapshot: SharedLiveSnapshot<T> = {
      data: update.data === undefined ? this.snapshot.data : update.data,
      error: update.error === undefined ? this.snapshot.error : update.error,
      lastEventAtMs: update.lastEventAtMs === undefined ? this.snapshot.lastEventAtMs : update.lastEventAtMs,
      lastSuccessAtMs:
        update.lastSuccessAtMs === undefined ? this.snapshot.lastSuccessAtMs : update.lastSuccessAtMs,
      connected: update.connected === undefined ? this.snapshot.connected : update.connected,
    };
    this.snapshot = nextSnapshot;
    for (const subscriber of this.subscribers.values()) {
      subscriber.onUpdate(nextSnapshot);
    }
    if (!options?.broadcast || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(this.snapshotKey, JSON.stringify(nextSnapshot));
    } catch {
      // Ignore storage write failures.
    }
    try {
      this.channel?.postMessage(nextSnapshot);
    } catch {
      // Ignore BroadcastChannel failures.
    }
  };

  private reconcile = (): void => {
    if (!this.shouldRunInThisTab()) {
      this.clearTimer();
      this.stopExecutor();
      this.releaseLeaderLease();
      return;
    }
    if (this.timer || this.inFlight) return;
    const hasRunBefore = this.snapshot.lastEventAtMs !== null || this.snapshot.lastSuccessAtMs !== null;
    this.scheduleTick(hasRunBefore ? this.followerCheckIntervalMs() : this.randomStartupDelay());
  };

  private handleVisibilityChange = (): void => {
    if (typeof document === "undefined") return;
    if (document.visibilityState === "visible" && this.hasActiveInterest()) {
      this.requestImmediateRefresh();
      return;
    }
    this.reconcile();
  };

  private scheduleTick(delayMs: number): void {
    if (this.timer) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.tick();
    }, delayMs);
  }

  private clearTimer(): void {
    if (!this.timer) return;
    clearTimeout(this.timer);
    this.timer = null;
  }

  private async tick(): Promise<void> {
    if (!this.shouldRunInThisTab()) {
      this.releaseLeaderLease();
      return;
    }
    const leaderNow = this.tryAcquireLeaderLease();
    this.leader = leaderNow;
    if (!leaderNow) {
      this.scheduleTick(this.followerCheckIntervalMs());
      return;
    }

    this.inFlight = true;
    try {
      if (this.config.mode === "poll") {
        await this.runPoll();
        if (this.shouldRunInThisTab()) {
          this.scheduleTick(this.config.intervalMs);
        }
        return;
      }
      if (this.config.mode === "sse") {
        await this.runSse();
        if (this.shouldRunInThisTab()) {
          this.scheduleTick(this.config.reconnectIntervalMs);
        }
        return;
      }
    } finally {
      this.inFlight = false;
    }

    this.scheduleTick(this.followerCheckIntervalMs());
  }

  private async runPoll(): Promise<void> {
    const config = this.config;
    if (config.mode !== "poll") return;
    const controller = new AbortController();
    this.executorAbort = controller;
    const request = this.pendingPollRequest ?? { cause: "interval" };
    this.pendingPollRequest = null;
    try {
      this.writeLease(Date.now() + this.leaseDurationMs());
      const data = await config.fetchData(controller.signal, request);
      const now = Date.now();
      this.publish(
        {
          data,
          error: null,
          lastEventAtMs: now,
          lastSuccessAtMs: now,
          connected: true,
        },
        { broadcast: true },
      );
    } catch (error) {
      if (controller.signal.aborted) {
        this.publish({ connected: false }, { broadcast: true });
      } else {
        this.publish(
          {
            error: normalizeFetchErrorMessage(error),
            lastEventAtMs: Date.now(),
            connected: false,
          },
          { broadcast: true },
        );
      }
    } finally {
      if (this.executorAbort === controller) {
        this.executorAbort = null;
      }
    }
  }

  private async runSse(): Promise<void> {
    const config = this.config;
    if (config.mode !== "sse") return;
    const controller = new AbortController();
    this.executorAbort = controller;
    const publish = (update: Partial<SharedLiveSnapshot<T>>): void => {
      this.writeLease(Date.now() + this.leaseDurationMs());
      this.publish(
        {
          ...update,
          lastEventAtMs: update.lastEventAtMs ?? Date.now(),
        },
        { broadcast: true },
      );
    };
    try {
      publish({ connected: true, error: null });
      await config.connect({ signal: controller.signal, publish });
      if (!controller.signal.aborted) {
        publish({ connected: false });
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        publish({ connected: false, error: normalizeFetchErrorMessage(error) });
      }
    } finally {
      if (this.executorAbort === controller) {
        this.executorAbort = null;
      }
    }
  }

  private stopExecutor(): void {
    if (!this.executorAbort) return;
    this.executorAbort.abort();
    this.executorAbort = null;
  }

  private leaseDurationMs(): number {
    return this.config.leaseDurationMs ?? DEFAULT_LEASE_DURATION_MS;
  }

  private followerCheckIntervalMs(): number {
    return this.config.followerCheckIntervalMs ?? DEFAULT_FOLLOWER_CHECK_INTERVAL_MS;
  }

  private randomStartupDelay(): number {
    const [minDelay, maxDelay] = this.config.startupJitterMs ?? DEFAULT_STARTUP_JITTER;
    const span = Math.max(0, maxDelay - minDelay);
    return minDelay + Math.floor(Math.random() * (span + 1));
  }

  private readLease(): LeaderLease | null {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem(this.leaseKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Partial<LeaderLease>;
      if (typeof parsed.tabId !== "string" || typeof parsed.expiresAt !== "number") return null;
      return { tabId: parsed.tabId, expiresAt: parsed.expiresAt };
    } catch {
      return null;
    }
  }

  private writeLease(expiresAt: number): void {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(this.leaseKey, JSON.stringify({ tabId: this.tabId, expiresAt }));
    } catch {
      // Ignore storage write failures.
    }
  }

  private tryAcquireLeaderLease(): boolean {
    if (typeof window === "undefined") return true;
    const now = Date.now();
    const lease = this.readLease();
    if (!lease || lease.expiresAt <= now || lease.tabId === this.tabId) {
      this.writeLease(now + this.leaseDurationMs());
      const confirmed = this.readLease();
      return confirmed?.tabId === this.tabId;
    }
    return false;
  }

  private releaseLeaderLease(): void {
    if (!this.leader || typeof window === "undefined") {
      this.leader = false;
      return;
    }
    try {
      const lease = this.readLease();
      if (lease?.tabId === this.tabId) {
        window.localStorage.removeItem(this.leaseKey);
      }
    } catch {
      // Ignore storage failures.
    } finally {
      this.leader = false;
    }
  }

  private readSnapshotFromStorage(): SharedLiveSnapshot<T> | null {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem(this.snapshotKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Partial<SharedLiveSnapshot<T>>;
      if (
        (parsed.data === null || parsed.data === undefined || typeof parsed.data === "object") &&
        (parsed.error === null || parsed.error === undefined || typeof parsed.error === "string") &&
        (parsed.lastEventAtMs === null || parsed.lastEventAtMs === undefined || typeof parsed.lastEventAtMs === "number") &&
        (parsed.lastSuccessAtMs === null || parsed.lastSuccessAtMs === undefined || typeof parsed.lastSuccessAtMs === "number") &&
        typeof parsed.connected === "boolean"
      ) {
        return {
          data: (parsed.data as T | null | undefined) ?? null,
          error: parsed.error ?? null,
          lastEventAtMs: parsed.lastEventAtMs ?? null,
          lastSuccessAtMs: parsed.lastSuccessAtMs ?? null,
          connected: parsed.connected,
        };
      }
      return null;
    } catch {
      return null;
    }
  }

  private handleIncomingSnapshot(payload: unknown): void {
    if (!payload || typeof payload !== "object") return;
    const incoming = payload as Partial<SharedLiveSnapshot<T>>;
    const incomingTs = typeof incoming.lastEventAtMs === "number" ? incoming.lastEventAtMs : null;
    const currentTs = this.snapshot.lastEventAtMs;
    if (incomingTs !== null && currentTs !== null && incomingTs <= currentTs) return;
    this.publish({
      data: (incoming.data as T | null | undefined) ?? null,
      error: incoming.error ?? null,
      lastEventAtMs: incomingTs,
      lastSuccessAtMs:
        typeof incoming.lastSuccessAtMs === "number" ? incoming.lastSuccessAtMs : this.snapshot.lastSuccessAtMs,
      connected: typeof incoming.connected === "boolean" ? incoming.connected : this.snapshot.connected,
    });
  }

  private handleStorageEvent = (event: StorageEvent): void => {
    if (event.key !== this.snapshotKey || !event.newValue) return;
    try {
      this.handleIncomingSnapshot(JSON.parse(event.newValue));
    } catch {
      // Ignore malformed payloads.
    }
  };
}

type SharedLiveRegistry = Record<string, SharedLiveResourceCoordinator<unknown>>;

const getRegistry = (): SharedLiveRegistry | null => {
  if (typeof window === "undefined") return null;
  const key = "__trr_shared_live_resource_registry__" as const;
  const withRegistry = window as Window & { [key]?: SharedLiveRegistry };
  if (!withRegistry[key]) {
    withRegistry[key] = {};
  }
  return withRegistry[key] ?? null;
};

const getCoordinator = <T,>(config: SharedResourceConfig<T>): SharedLiveResourceCoordinator<T> | null => {
  const registry = getRegistry();
  if (!registry) return null;
  const existing = registry[config.key] as SharedLiveResourceCoordinator<T> | undefined;
  if (existing) {
    existing.updateConfig(config);
    return existing;
  }
  const coordinator = new SharedLiveResourceCoordinator<T>(config);
  registry[config.key] = coordinator as SharedLiveResourceCoordinator<unknown>;
  return coordinator;
};

const useSharedLiveResource = <T,>(config: SharedResourceConfig<T>) => {
  const [snapshot, setSnapshot] = useState<SharedLiveSnapshot<T>>({
    data: null,
    error: null,
    lastEventAtMs: null,
    lastSuccessAtMs: null,
    connected: false,
  });
  const subscriberIdRef = useRef<string>(createTabId());
  const coordinator = useMemo(() => getCoordinator(config), [config]);

  useEffect(() => {
    if (!coordinator) return;
    const id = subscriberIdRef.current;
    coordinator.subscribe(id, setSnapshot);
    return () => {
      coordinator.unsubscribe(id);
    };
  }, [coordinator]);

  useEffect(() => {
    if (!coordinator) return;
    coordinator.setInterest(subscriberIdRef.current, config.shouldRun);
  }, [config.shouldRun, coordinator]);

  const refetch = useCallback((request?: SharedPollRequest) => {
    coordinator?.requestImmediateRefresh(request);
  }, [coordinator]);

  return {
    ...snapshot,
    lastEventAt: snapshot.lastEventAtMs ? new Date(snapshot.lastEventAtMs) : null,
    lastSuccessAt: snapshot.lastSuccessAtMs ? new Date(snapshot.lastSuccessAtMs) : null,
    refetch,
  };
};

export const useSharedPollingResource = <T,>(config: SharedPollConfig<T>) => {
  return useSharedLiveResource<T>({ ...config, mode: "poll" });
};

export const useSharedSseResource = <T,>(config: SharedSseConfig<T>) => {
  return useSharedLiveResource<T>({ ...config, mode: "sse" });
};

export const useSharedManualResource = <T,>(config: SharedManualConfig) => {
  return useSharedLiveResource<T>({ ...config, mode: "manualRefetch" });
};

/**
 * Test-only helper to clear the shared coordinator registry between tests. Without this,
 * JSDOM's persistent `window` causes coordinator instances (with their pending timers,
 * subscribers, and cached snapshots) to leak across test cases and interfere with one
 * another. This is only wired into test `beforeEach` hooks — production code should not
 * call it.
 */
export const __resetSharedLiveResourceRegistryForTests = (): void => {
  if (typeof window === "undefined") return;
  const key = "__trr_shared_live_resource_registry__" as const;
  const withRegistry = window as Window & { [key]?: SharedLiveRegistry };
  const registry = withRegistry[key];
  if (registry) {
    for (const coordinator of Object.values(registry)) {
      try {
        (coordinator as unknown as { dispose?: () => void })?.dispose?.();
      } catch {
        // best-effort cleanup
      }
    }
  }
  delete withRegistry[key];
};
