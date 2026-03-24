import { afterEach, describe, expect, it, vi } from "vitest";
import {
  canonicalizeOperationStatus,
  isCanonicalTerminalStatus,
  monitorKickoffHandle,
  normalizeKickoffHandle,
  waitForOperationTerminalState,
} from "@/lib/admin/async-handles";
import {
  getAdminOperationSession,
  upsertAdminOperationSession,
} from "@/lib/admin/operation-session";

describe("admin async handles", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    window.sessionStorage.clear();
  });

  it("canonicalizes backend status variants", () => {
    expect(canonicalizeOperationStatus("pending")).toBe("queued");
    expect(canonicalizeOperationStatus("in_progress")).toBe("running");
    expect(canonicalizeOperationStatus("cancel_requested")).toBe("cancelling");
    expect(canonicalizeOperationStatus("canceled")).toBe("cancelled");
    expect(canonicalizeOperationStatus("timed_out")).toBe("failed");
    expect(canonicalizeOperationStatus("success")).toBe("completed");
    expect(canonicalizeOperationStatus("unknown_state", "running")).toBe("running");
    expect(isCanonicalTerminalStatus("completed")).toBe(true);
    expect(isCanonicalTerminalStatus("failed")).toBe(true);
    expect(isCanonicalTerminalStatus("cancelled")).toBe(true);
    expect(isCanonicalTerminalStatus("cancelling")).toBe(false);
  });

  it("normalizes kickoff handles with additive and legacy fields", () => {
    const handle = normalizeKickoffHandle({
      operation_id: "op-1",
      execution_owner: "worker",
      execution_mode_canonical: "remote",
      run: { run_id: "run-1", status: "started" },
      job_id: "job-1",
    });

    expect(handle).toEqual({
      operationId: "op-1",
      runId: "run-1",
      jobId: "job-1",
      executionOwner: "worker",
      executionModeCanonical: "remote",
      rawStatus: "started",
      canonicalStatus: "running",
    });
  });

  it("uses legacy fallback when operation id is absent", async () => {
    const waitForLegacyTerminal = vi.fn().mockResolvedValue("completed");

    const status = await monitorKickoffHandle({
      handle: {
        runId: "run-1",
        canonicalStatus: "queued",
      },
      operation: {
        flowScope: "POST:/api/admin/reddit/discover:0",
        flowKey: "flow-1",
        input: "/api/admin/reddit/discover",
        method: "POST",
      },
      waitForLegacyTerminal,
    });

    expect(status).toBe("completed");
    expect(waitForLegacyTerminal).toHaveBeenCalledTimes(1);
  });

  it("resumes operation stream using stored event_seq", async () => {
    upsertAdminOperationSession("POST:/api/admin/trr-api/operations:0", {
      flowKey: "flow-1",
      input: "/api/admin/trr-api/operations",
      method: "POST",
      status: "active",
      operationId: "op-1",
      lastEventSeq: 3,
    });

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(
          new TextEncoder().encode(
            'event: complete\ndata: {"operation_id":"op-1","event_seq":4,"status":"completed"}\n\n',
          ),
        );
        controller.close();
      },
    });
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(stream, {
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const state = await waitForOperationTerminalState({
      operationId: "op-1",
      flowScope: "POST:/api/admin/trr-api/operations:0",
      flowKey: "flow-1",
      input: "/api/admin/trr-api/operations",
      method: "POST",
      streamTimeoutMs: 1_000,
      statusTimeoutMs: 1_000,
    });

    expect(state.status).toBe("completed");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/api/admin/trr-api/operations/op-1/stream?after_seq=3");
    const session = getAdminOperationSession("POST:/api/admin/trr-api/operations:0");
    expect(session?.lastEventSeq).toBe(4);
    expect(session?.status).toBe("completed");
  });

  it("treats nested operation status payloads as terminal during poll fallback", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("stream disconnected"))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            operation: {
              id: "op-2",
              status: "completed",
              updated_at: "2026-03-21T06:15:00Z",
            },
            latest_event_seq: 9,
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    const state = await waitForOperationTerminalState({
      operationId: "op-2",
      flowScope: "POST:/api/admin/trr-api/operations:poll",
      flowKey: "flow-2",
      input: "/api/admin/trr-api/operations",
      method: "POST",
      streamTimeoutMs: 1_000,
      statusTimeoutMs: 1_000,
    });

    expect(state.status).toBe("completed");
    expect(state.eventSeq).toBe(9);
    const session = getAdminOperationSession("POST:/api/admin/trr-api/operations:poll");
    expect(session?.status).toBe("completed");
    expect(session?.lastEventSeq).toBe(9);
  });
});
