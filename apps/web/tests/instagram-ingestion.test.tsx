import React from "react";
import { act, fireEvent, render, renderHook, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { INGESTION_BASE, ingestionFetchClient, IngestionRequestError, ingestionProxyPath, ingestionLaunchFromCatalog, type IngestionProgress, type IngestionDiagnostics } from "@/lib/social/ingestion-client";
import { ingestionPollInterval, IngestionRequestIdentities, useInstagramIngestion } from "@/lib/social/ingestion-hooks";
import { StageProgress } from "@/components/admin/social/ingestion/StageProgress";
import { RecoveryControls } from "@/components/admin/social/ingestion/RecoveryControls";
import { Diagnostics } from "@/components/admin/social/ingestion/Diagnostics";
import { InstagramIngestionPanel } from "@/components/admin/social/ingestion/InstagramIngestionPanel";
import { RunLauncher } from "@/components/admin/social/ingestion/RunLauncher";
import { INSTAGRAM_V2_PUBLIC_DEFAULT_SELECTED_TASKS, describeInstagramCatalogCapacity } from "@/components/admin/social-account-profile/catalog-operations";
const mocks = vi.hoisted(() => ({ fetch: vi.fn(), devBypass: vi.fn(() => false) }));
vi.mock("@/lib/admin/client-auth", () => ({ fetchAdminWithAuth: (...args: unknown[]) => mocks.fetch(...args) }));
vi.mock("@/lib/admin/dev-admin-bypass", () => ({ isDevAdminBypassEnabledClient: mocks.devBypass }));
const runId = "11111111-1111-4111-8111-111111111111";
const oldId = "22222222-2222-4222-8222-222222222222";
const evidenceId = "33333333-3333-4333-8333-333333333333";
const intent: IngestionProgress["intent"] = { platform: "instagram", account: "bravotv", action: "backfill", source_scope: "network", date_start: null, date_end: null, selected_tasks: ["post_details"], scope: "full_history", metadata_ttl_days: 30, metrics_ttl_hours: 24, force: false, policy_version: 1, comments_enable_media_followups: true, comments_max_attempts: 12, enable_cap4_canary: false, listing_max_attempts: 12, media_max_attempts: 3 };
const progress = (overrides: Partial<IngestionProgress> = {}): IngestionProgress => ({ run_id: runId, account: "bravotv", intent, intent_hash: "hash", engine: "dbos", execution_placement: "modal", workflow_version: "instagram-v1", state: "running", generation: 1, last_committed_at: "2026-10-16T10:00:00Z", created_at: "2026-10-16T09:00:00Z", updated_at: "2026-10-16T10:00:00Z", pinned_evidence_count: 1, complete: false, allowed_actions: ["cancel", "replay", "retry_targets"], stages: [{ stage: "post_details", discovery_complete: false, sealed_at: null, total: 10, committed: 4, cached_satisfied: 2, source_unavailable: 1, unresolved: 3, attempts: 30, requests: 100, retry_at: null, blocked_reasons: [], last_committed_at: "2026-10-16T10:00:00Z", complete: false }], ...overrides });
const diagnostics: IngestionDiagnostics = { run_id: runId, account: "bravotv", targets: [{ stage: "post_details", target_key: "p1", outcome: "unresolved", attempts: 2, requests: 3, max_attempts: 12, retry_at: null, blocked_reason: "cooldown" }], evidence: [{ evidence_id: evidenceId, stage: "post_details", target_key: "p1", source_identity: "post:1", captured_at: "2026-10-16T09:00:00Z", content_hash: "sha256", available: true, expires_at: "2099-01-01T00:00:00Z", pinned: true, parser_version: "parser-v1", schema_version: 1 }], targets_truncated: false, evidence_truncated: false };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const capability = (enabled = true) => ({ enabled, account: "bravotv", engine: "dbos", workflow_version: "v1", supported_actions: ["backfill", "sync_recent", "sync_newer"], replay_apply_enabled: false });
beforeEach(() => { mocks.fetch.mockReset(); mocks.devBypass.mockReset().mockReturnValue(false); });

describe("typed ingestion lifecycle", () => {
  it.each([false, true])("uses the existing local bypass decision (%s) without changing GET retry policy", async allowed => {
    mocks.devBypass.mockReturnValue(allowed);
    mocks.fetch.mockImplementation(async () => json(capability()));
    await ingestionFetchClient.GET(`${INGESTION_BASE}/capabilities`, { params: { path: { handle: "bravotv" } } });
    expect(mocks.devBypass).toHaveBeenCalled();
    expect(mocks.fetch.mock.calls[0][2]).toEqual({ allowDevAdminBypass: allowed, retryOnAuthError: true });
  });
  it("preserves launcher scope, selected tasks, date boundaries, workers, and confirmation without legacy-only fields", () => {
    const result = ingestionLaunchFromCatalog("backfill", { source_scope: "creator", backfill_scope: "bounded_window", date_start: "2026-01-01T00:00:00Z", date_end: "2026-02-01T00:00:00Z", selected_tasks: ["comments"], detail_worker_count: 2, comments_worker_count: 4, comments_enable_media_followups: false, operator_confirmation: "APPLY REVIEWED", allow_inline_dev_fallback: true, execution_preference: "prefer_local_inline" }, "network");
    expect(result).toMatchObject({ action: "backfill", source_scope: "creator", backfill_scope: "bounded_window", date_start: "2026-01-01T00:00:00Z", date_end: "2026-02-01T00:00:00Z", selected_tasks: ["comments"], detail_worker_count: 2, comments_worker_count: 4, comments_enable_media_followups: false, operator_confirmation: "APPLY REVIEWED" });
    expect(result).not.toHaveProperty("allow_inline_dev_fallback"); expect(result).not.toHaveProperty("execution_preference");
    expect(ingestionLaunchFromCatalog("sync_recent", { lookback_days: 3 }, "news")).toMatchObject({ action: "sync_recent", lookback_days: 3, source_scope: "news" });
  });
  it("keeps identities stable after uncertain delivery and separates commands", () => {
    const identities = new IngestionRequestIdentities(); const body = { selected_tasks: ["comments"] };
    const first = identities.get("launch:account", body);
    expect(identities.get("launch:account", body)).toBe(first);
    expect(identities.get("cancel:run", body)).not.toBe(first);
    identities.committed("launch:account", body);
    expect(identities.get("launch:account", body)).not.toBe(first);
    expect(ingestionProxyPath(`https://admin.trr.localhost/api/v2/admin/social/profiles/instagram/bravotv/ingestion/runs/${runId}`)).toBe(`/api/admin/instagram-ingestion/bravotv/runs/${runId}`);
    expect(() => ingestionProxyPath("https://host/api/v1/other")).toThrow();
  });
  it("polls visible active work at 3s, backs off, honors retry timing, and stops terminal work", () => {
    expect(ingestionPollInterval({ visible: true, progress: progress() })).toBe(3000);
    expect(ingestionPollInterval({ visible: false, progress: progress() })).toBe(false);
    expect(ingestionPollInterval({ visible: true, progress: progress({ state: "completed" }) })).toBe(false);
    expect(ingestionPollInterval({ visible: true, progress: progress({ state: "blocked" }) })).toBe(false);
    const error = new IngestionRequestError({ code: "BUSY", message: "Busy", status: 503, retryable: true, retry_after_ms: 25000 });
    expect(ingestionPollInterval({ visible: true, progress: progress(), error, failures: 2 })).toBe(25000);
    const run = progress(); run.stages[0].retry_at = new Date(40000).toISOString();
    expect(ingestionPollInterval({ visible: true, progress: run, now: 10000 })).toBe(30000);
  });
  it("uses live visibility and focus events for active polling and stops after terminal progress", async () => {
    vi.useFakeTimers();
    let visibility: DocumentVisibilityState = "visible"; let state: IngestionProgress["state"] = "running";
    vi.spyOn(document, "visibilityState", "get").mockImplementation(() => visibility);
    mocks.fetch.mockImplementation(async (url: string) => {
      if (url.endsWith("/capabilities")) return json(capability());
      if (url.includes("/runs/recent")) return json({ runs: [{ ...progress(), intent }] });
      if (url.includes("/diagnostics")) return json(diagnostics);
      return json(progress({ state }));
    });
    const { result } = renderHook(() => useInstagramIngestion({ account: "bravotv", sourceScope: "network" }, true));
    await act(async () => { await vi.advanceTimersByTimeAsync(20); });
    expect(result.current.progress.data?.state).toBe("running");
    const count = () => mocks.fetch.mock.calls.filter(([url]) => String(url).endsWith(`/runs/${runId}`)).length;
    const initial = count();
    await act(async () => { await vi.advanceTimersByTimeAsync(3000); }); expect(count()).toBe(initial + 1);
    visibility = "hidden";
    await act(async () => { document.dispatchEvent(new Event("visibilitychange", { bubbles: true })); await vi.advanceTimersByTimeAsync(10); });
    const hiddenCount = count(); await act(async () => { await vi.advanceTimersByTimeAsync(10000); }); expect(count()).toBe(hiddenCount);
    state = "completed"; visibility = "visible";
    await act(async () => { document.dispatchEvent(new Event("visibilitychange", { bubbles: true })); await vi.advanceTimersByTimeAsync(20); });
    expect(count()).toBeGreaterThan(hiddenCount); expect(result.current.progress.data?.state).toBe("completed");
    const terminalCount = count(); await act(async () => { await vi.advanceTimersByTimeAsync(10000); }); expect(count()).toBe(terminalCount);
  });
  it("preserves all four outcomes and discovery incomplete despite high request counts", () => {
    render(<StageProgress progress={progress()} />);
    expect(screen.getByText("Discovery incomplete · total can grow")).toBeInTheDocument();
    for (const label of ["Committed", "Cached satisfied", "Source unavailable", "Unresolved"]) expect(screen.getByText(label)).toBeInTheDocument();
    expect(screen.getByText(/Requests 100/)).toBeInTheDocument();
    expect(screen.getByText(/Work remains/)).toBeInTheDocument();
  });
  it("requires cancellation confirmation and retries only selected unresolved targets", () => {
    const control = vi.fn(); const retry = vi.fn();
    render(<RecoveryControls progress={progress()} diagnostics={diagnostics} pending={false} onControl={control} onRetry={retry} />);
    fireEvent.click(screen.getByRole("button", { name: "Cancel Run" })); expect(control).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Confirm cancel" })); expect(control).toHaveBeenCalledWith("cancel");
    fireEvent.click(screen.getByText("Retry selected unresolved targets"));
    fireEvent.click(screen.getByRole("checkbox")); fireEvent.click(screen.getByRole("button", { name: "Retry 1 targets" })); expect(retry).toHaveBeenCalledWith("post_details", ["p1"]);
  });
  it.each([undefined, "modal"] as const)("keeps API recovery available for Modal placement (%s)", executionPlacement => {
    const control = vi.fn();
    render(<RecoveryControls progress={progress({ execution_placement: executionPlacement, allowed_actions: ["resume", "retry_targets"] })} diagnostics={diagnostics} pending={false} onControl={control} onRetry={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Resume Run" }));
    expect(control).toHaveBeenCalledWith("resume");
    expect(screen.getByText("Retry selected unresolved targets")).toBeInTheDocument();
    expect(screen.queryByText(/use the local driver/)).not.toBeInTheDocument();
  });
  it("keeps local cancellation usable while directing resume and retries to the local driver", () => {
    const control = vi.fn(); const retry = vi.fn();
    render(<RecoveryControls progress={progress({ execution_placement: "local", allowed_actions: ["cancel", "resume", "retry_targets"] })} diagnostics={diagnostics} pending={false} onControl={control} onRetry={retry} />);
    expect(screen.getByText("Local run: use the local driver to resume or retry.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Resume Run" })).not.toBeInTheDocument();
    expect(screen.queryByText("Retry selected unresolved targets")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cancel Run" }));
    expect(control).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Confirm cancel" }));
    expect(control).toHaveBeenCalledOnce();
    expect(control).toHaveBeenCalledWith("cancel");
    expect(retry).not.toHaveBeenCalled();
  });
  it("defaults replay to dry run, gates apply on reviewed output, and blocks expired evidence", async () => {
    const onReplay = vi.fn().mockResolvedValue({ mode: "dry_run", evidence_id: evidenceId, parser_version: "parser-v1", comparison: { changed: true }, writes: 0, source_requests: 0 });
    const { rerender } = render(<Diagnostics diagnostics={diagnostics} canReplay canApply pending={false} onReplay={onReplay} />);
    fireEvent.click(screen.getByText("Diagnostics and evidence replay"));
    fireEvent.change(screen.getByLabelText("Replay evidence"), { target: { value: evidenceId } });
    expect(screen.getByRole("button", { name: "Apply Reviewed Replay" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Dry Run Replay" }));
    await waitFor(() => expect(onReplay).toHaveBeenCalledWith({ evidence_id: evidenceId, parser_version: "parser-v1", apply: false }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Apply Reviewed Replay" })).toBeEnabled());
    fireEvent.change(screen.getByLabelText("Replay parser version"), { target: { value: "parser-v2" } });
    expect(screen.getByRole("button", { name: "Apply Reviewed Replay" })).toBeDisabled();
    rerender(<Diagnostics diagnostics={{ ...diagnostics, evidence: [{ ...diagnostics.evidence[0], available: false }] }} canReplay canApply={false} pending={false} onReplay={onReplay} />);
    expect(screen.getByRole("button", { name: "Dry Run Replay" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Apply Reviewed Replay" })).not.toBeInTheDocument();
  });
  it("keeps capability and history reads usable through React Strict Mode remounts", async () => {
    mocks.fetch.mockImplementation(async (url: string) => json(url.endsWith("/capabilities") ? capability(false) : { runs: [] }));
    const { result } = renderHook(() => useInstagramIngestion({ account: "bravotv", sourceScope: "network" }, true), { wrapper: ({ children }) => <React.StrictMode>{children}</React.StrictMode> });
    await waitFor(() => expect(result.current.recent.isSuccess).toBe(true));
    expect(result.current.enabled).toBe(false);
  });
  it("leaves the legacy surface unchanged when disabled without saved runs", async () => {
    mocks.fetch.mockImplementation(async (url: string) => json(url.endsWith("/capabilities") ? capability(false) : { runs: [] }));
    const { result } = renderHook(() => useInstagramIngestion({ account: "bravotv", sourceScope: "network" }, true));
    await waitFor(() => expect(result.current.recent.isSuccess).toBe(true));
    render(<InstagramIngestionPanel controller={result.current} />);
    expect(screen.queryByRole("region", { name: "Durable Instagram ingestion" })).not.toBeInTheDocument();
    expect(result.current.enabled).toBe(false);
  });
  it("keeps rollback history readable and active recovery separate from inspected history", async () => {
    mocks.fetch.mockImplementation(async (url: string) => {
      if (url.endsWith("/capabilities")) return json(capability(false));
      if (url.includes("/runs/recent")) return json({ runs: [{ ...progress(), intent, run_id: runId }, { ...progress({ state: "failed" }), intent, run_id: oldId }] });
      if (url.includes("/diagnostics")) return json(diagnostics);
      return json(progress({ run_id: url.endsWith(oldId) ? oldId : runId }));
    });
    const { result } = renderHook(() => useInstagramIngestion({ account: "bravotv", sourceScope: "network", dateStart: "2026-01", dateEnd: "2026-12" }, true));
    await waitFor(() => expect(result.current.activeRunId).toBe(runId));
    act(() => result.current.inspect(oldId));
    await waitFor(() => expect(result.current.progress.data?.run_id).toBe(oldId));
    expect(result.current.activeRunId).toBe(runId); expect(result.current.enabled).toBe(false); expect(result.current.showPanel).toBe(true);
    await expect(result.current.launch(ingestionLaunchFromCatalog("backfill", { backfill_scope: "full_history" }, "network"))).rejects.toThrow("disabled");
    await waitFor(() => expect(result.current.active?.run_id).toBe(runId));
    render(<InstagramIngestionPanel controller={result.current} />);
    const activeControls = within(screen.getByLabelText("Active ingestion run controls"));
    fireEvent.click(activeControls.getByRole("button", { name: "Cancel Run" }));
    fireEvent.click(activeControls.getByRole("button", { name: "Confirm cancel" }));
    await waitFor(() => expect(mocks.fetch.mock.calls.some(([url, init]) => String(url).endsWith(`/runs/${runId}/cancel`) && init?.method === "POST")).toBe(true));
    expect(mocks.fetch.mock.calls.some(([url]) => String(url).endsWith(`/runs/${oldId}/cancel`))).toBe(false);
  });
  it("retains committed progress after transient failure and reuses a launch key on explicit retry without automatic retries", async () => {
    let failProgress = false; let launches = 0;
    mocks.fetch.mockImplementation(async (url: string, init?: RequestInit) => {
      if (url.endsWith("/capabilities")) return json(capability());
      if (url.includes("/runs/recent")) return json({ runs: [] });
      if (init?.method === "POST") { launches++; if (launches === 1) throw new TypeError("Network interrupted"); return json({ run_id: runId, state: "running", engine: "dbos", workflow_version: "v1", generation: 1 }, 202); }
      if (url.includes("/diagnostics")) return json(diagnostics);
      return failProgress ? json({ detail: { code: "BUSY", message: "Please retry later.", retryable: true, retry_after_ms: 60000 } }, 503) : json(progress());
    });
    const { result } = renderHook(() => useInstagramIngestion({ account: "bravotv", sourceScope: "network" }, true));
    await waitFor(() => expect(result.current.enabled).toBe(true));
    const body = ingestionLaunchFromCatalog("backfill", { backfill_scope: "full_history", selected_tasks: ["comments"], comments_worker_count: 4 }, "network");
    await act(async () => { await expect(result.current.launch(body)).rejects.toThrow(); }); expect(launches).toBe(1);
    await act(async () => { await result.current.launch(body); });
    const requests = mocks.fetch.mock.calls.filter(([, init]) => init?.method === "POST");
    expect(new Headers(requests[0][1].headers).get("Idempotency-Key")).toBe(new Headers(requests[1][1].headers).get("Idempotency-Key"));
    expect(requests[0][2]).toEqual({ allowDevAdminBypass: false, retryOnAuthError: false });
    await waitFor(() => expect(result.current.progress.data?.stages[0].committed).toBe(4));
    failProgress = true;
    await act(async () => { await result.current.progress.refetch(); });
    expect(result.current.progress.data?.stages[0].committed).toBe(4); await waitFor(() => expect(result.current.progress.error).toBeInstanceOf(IngestionRequestError));
  });
});

describe("logged-out launches and the Mac worker", () => {
  it("sends Modal by default and This Mac only when chosen", () => {
    expect(ingestionLaunchFromCatalog("sync_recent", { lookback_days: 1 }, "network")).toMatchObject({ execution_placement: "modal" });
    expect(ingestionLaunchFromCatalog("backfill", { backfill_scope: "full_history" }, "network", "local")).toMatchObject({ action: "backfill", execution_placement: "local" });
  });

  const launcherProps = (overrides: Partial<React.ComponentProps<typeof RunLauncher>> = {}): React.ComponentProps<typeof RunLauncher> => ({
    handle: "bravotv", instagramBackfillSelectedTasks: [...INSTAGRAM_V2_PUBLIC_DEFAULT_SELECTED_TASKS], instagramBackfillMonthStart: "01-2026", instagramBackfillMonthEnd: "10-2026",
    instagramBackfillDetailWorkerCount: 1, instagramBackfillCommentsWorkerCount: 1, instagramBackfillDisplayedDetailWorkers: 1, instagramBackfillDisplayedCommentsWorkers: 1,
    instagramBackfillCommentMediaEnabled: true, instagramBackfillIncludesMedia: true, instagramBackfillCapacityLoading: false,
    instagramBackfillCapacityPresentation: describeInstagramCatalogCapacity(null), instagramBackfillEstimatedWallSeconds: 0, instagramBackfillEstimatedWorkerMinutes: 0,
    instagramBackfillEstimatedPostTargets: 0, instagramBackfillEstimatedCommentTargets: 0, instagramBackfillPreflightItems: [], catalogLaunchActionsBlocked: false,
    catalogLaunchGuardMessage: null, runningCatalogAction: null, setInstagramBackfillDialogOpen: vi.fn(), setInstagramBackfillMonthStart: vi.fn(),
    setInstagramBackfillMonthEnd: vi.fn(), setInstagramBackfillDetailWorkerCount: vi.fn(), setInstagramBackfillCommentsWorkerCount: vi.fn(),
    setInstagramBackfillCommentMediaFollowups: vi.fn(), toggleInstagramBackfillTask: vi.fn(), applyBravoTvFastBackfillPreset: vi.fn(),
    submitInstagramBackfillDialog: vi.fn(async () => undefined), formatDurationEstimate: () => null, refreshCapacity: vi.fn(),
    INSTAGRAM_BACKFILL_DETAIL_WORKER_OPTIONS: [1], INSTAGRAM_BACKFILL_COMMENTS_WORKER_OPTIONS: [1], NYT_DASHBOARD_BUTTON_CLASS: "", NYT_DASHBOARD_PRIMARY_BUTTON_CLASS: "",
    ...overrides,
  });

  it("defaults logged-out runs to comments and media", () => {
    expect(INSTAGRAM_V2_PUBLIC_DEFAULT_SELECTED_TASKS).toEqual(["comments", "media"]);
  });

  it("hides the Run on choice on the legacy path", () => {
    render(<RunLauncher {...launcherProps()} />);
    expect(screen.queryByText("Run on")).toBeNull();
  });

  it("disables This Mac while the Mac worker is offline", () => {
    const setRunPlacement = vi.fn();
    render(<RunLauncher {...launcherProps({ runPlacement: "modal", setRunPlacement, localWorkerOnline: false })} />);
    const mac = screen.getByRole("radio", { name: /This Mac/ });
    expect(mac).toBeDisabled();
    expect(screen.getByText("Mac worker offline")).toBeTruthy();
    fireEvent.click(mac);
    expect(setRunPlacement).not.toHaveBeenCalled();
  });

  it("lets the operator choose This Mac while the worker is online", () => {
    const setRunPlacement = vi.fn();
    render(<RunLauncher {...launcherProps({ runPlacement: "modal", setRunPlacement, localWorkerOnline: true })} />);
    fireEvent.click(screen.getByRole("radio", { name: /This Mac/ }));
    expect(setRunPlacement).toHaveBeenCalledWith("local");
  });
});
