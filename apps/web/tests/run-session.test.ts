import { afterEach, describe, expect, it } from "vitest";
import {
  getAdminRunSession,
  getAutoResumableAdminRunSession,
  listTabOwnedActiveAdminRunSessions,
  markAdminRunSessionStatus,
  pruneStaleAdminRunSessions,
  upsertAdminRunSession,
} from "@/lib/admin/run-session";

const TAB_SESSION_STORAGE_KEY = "trr.admin.tab_session_id.v1";
const RUN_SESSIONS_STORAGE_KEY = "trr.admin.run-sessions.v1";

describe("admin run-session", () => {
  afterEach(() => {
    window.sessionStorage.clear();
  });

  it("returns tab-owned active runs as auto-resumable", () => {
    const flowScope = "social-week:show-1:s1:w1";
    upsertAdminRunSession(flowScope, {
      runId: "run-active",
      flowKey: "flow-1",
      status: "active",
    });

    const session = getAutoResumableAdminRunSession(flowScope);
    expect(session?.runId).toBe("run-active");
    expect(session?.status).toBe("active");
  });

  it("does not auto-resume completed runs", () => {
    const flowScope = "social-week:show-1:s1:w1";
    upsertAdminRunSession(flowScope, {
      runId: "run-complete",
      flowKey: "flow-1",
      status: "active",
    });
    markAdminRunSessionStatus(flowScope, "completed");

    expect(getAutoResumableAdminRunSession(flowScope)).toBeNull();
  });

  it("excludes runs owned by another tab from tab-owned active list", () => {
    const flowScope = "social-week:show-1:s1:w1";
    const currentTab = "tab-current";
    window.sessionStorage.setItem(TAB_SESSION_STORAGE_KEY, currentTab);
    upsertAdminRunSession(flowScope, {
      runId: "run-other-tab",
      flowKey: "flow-1",
      status: "active",
    });

    const stored = getAdminRunSession(flowScope);
    expect(stored).not.toBeNull();
    window.sessionStorage.setItem(
      RUN_SESSIONS_STORAGE_KEY,
      JSON.stringify({
        [flowScope]: {
          ...stored,
          tabSessionId: "tab-other",
          ownershipKey: "tab-other::flow-1",
          status: "active",
        },
      }),
    );

    const active = listTabOwnedActiveAdminRunSessions();
    expect(active).toHaveLength(0);
  });

  it("prunes stale run sessions", () => {
    const flowScope = "social-week:show-1:s1:w1";
    const now = Date.now();
    window.sessionStorage.setItem(
      RUN_SESSIONS_STORAGE_KEY,
      JSON.stringify({
        [flowScope]: {
          flowScope,
          flowKey: "flow-1",
          ownershipKey: "tab-1::flow-1",
          runId: "run-stale",
          tabSessionId: "tab-1",
          status: "active",
          startedAtMs: now - 1000,
          updatedAtMs: now - 7 * 60 * 60 * 1000,
        },
      }),
    );

    pruneStaleAdminRunSessions();
    expect(getAdminRunSession(flowScope)).toBeNull();
  });
});
