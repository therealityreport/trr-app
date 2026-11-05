import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  user: { uid: "owner", getIdToken: vi.fn(async () => "firebase-id-token") },
  firestore: {}, getDoc: vi.fn(), setDoc: vi.fn(), deleteDoc: vi.fn(), runTransaction: vi.fn(), onSnapshot: vi.fn(),
  requireUser: vi.fn(),
}));
vi.mock("@/lib/firebase", () => ({ auth: { currentUser: mocks.user } }));
vi.mock("@/lib/firebase-db", () => ({ getDb: () => mocks.firestore }));
vi.mock("@/lib/server/auth", () => ({ requireUser: mocks.requireUser }));
vi.mock("firebase/firestore", () => ({
  Timestamp: { fromDate: (date: Date) => date }, serverTimestamp: () => "server-time",
  doc: (_db: unknown, ...parts: string[]) => parts.join("/"),
  getDoc: mocks.getDoc, setDoc: mocks.setDoc, deleteDoc: mocks.deleteDoc, runTransaction: mocks.runTransaction, onSnapshot: mocks.onSnapshot,
}));

import { getSurveyXState, saveSurveyXResponses } from "@/lib/db/surveys";
import { useSurveyManager } from "@/lib/surveys/manager";
import { POST as postX } from "@/app/api/surveys/x/route";

const responses = {
  view_live_tv_household: "yes", view_platforms_subscriptions: ["peacock"], primaryPlatform: "peacock",
  watchFrequency: "weekly", watchMode: "live", view_reality_cowatch: "alone",
  view_live_chats_social: "no", view_devices_reality: ["tv"],
};
const ids = { showId: "tt12623782", seasonId: "S06", episodeId: "E01" };
const ranking = [{ id: "one", label: "One", img: "image" }];
const fetchMock = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", fetchMock);
  mocks.getDoc.mockResolvedValue({ exists: () => false });
  mocks.setDoc.mockResolvedValue(undefined);
  mocks.deleteDoc.mockResolvedValue(undefined);
  mocks.runTransaction.mockResolvedValue(undefined);
  mocks.onSnapshot.mockReturnValue(vi.fn());
});

describe("PostgreSQL survey authority", () => {
  it("submits Survey X once, with no Firestore completion write", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ ok: true })));
    await saveSurveyXResponses(mocks.user as never, responses);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/surveys/x");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ responses });
    expect(mocks.setDoc).not.toHaveBeenCalled();
  });

  it("reads Survey X completion from the authenticated endpoint", async () => {
    fetchMock.mockResolvedValue(Response.json({ state: { completed: true, responses, completedAt: "2026-10-31T00:00:00Z" } }));
    expect((await getSurveyXState("owner"))?.completed).toBe(true);
    expect(mocks.getDoc).not.toHaveBeenCalled();
  });

  it("fails a rejected Survey X submission without claiming saved completion", async () => {
    fetchMock.mockResolvedValue(new Response("failed", { status: 500 }));
    await expect(saveSurveyXResponses(mocks.user as never, responses)).rejects.toThrow("not submitted");
    expect(mocks.setDoc).not.toHaveBeenCalled();
  });

  it("stores incomplete responses only in explicit drafts without completed flags", async () => {
    const result = await useSurveyManager().saveResponse(ids, "owner", { ranking, completed: false, completionPct: 50 });
    expect(result.completed).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(mocks.setDoc.mock.calls[0][0]).toContain("/drafts/owner");
    expect(mocks.setDoc.mock.calls[0][1]).not.toHaveProperty("completed");
  });

  it("retains the draft on a failed submitted save", async () => {
    fetchMock.mockResolvedValue(new Response("failed", { status: 500 }));
    await expect(useSurveyManager().saveResponse(ids, "owner", { ranking, completed: true, completionPct: 100 })).rejects.toThrow();
    expect(mocks.setDoc).toHaveBeenCalledTimes(1);
    expect(mocks.deleteDoc).not.toHaveBeenCalled();
  });

  it("preserves a newer draft from another tab after a submitted save", async () => {
    fetchMock.mockResolvedValue(Response.json({ ok: true }));
    mocks.runTransaction.mockImplementation(async (_db, callback) => callback({
      get: async () => ({ exists: () => true, data: () => ({ ranking: [{ id: "newer" }], completionPct: 50 }) }),
      delete: mocks.deleteDoc,
    }));
    await useSurveyManager().saveResponse(ids, "owner", { ranking, completed: true, completionPct: 100 });
    expect(mocks.deleteDoc).not.toHaveBeenCalled();
  });

  it("recovers legacy answers as an incomplete editable draft", async () => {
    mocks.getDoc.mockResolvedValue({ exists: () => true, data: () => ({ ...ids, ranking, completed: true }) });
    fetchMock.mockResolvedValue(Response.json({ response: null }));
    const changes = vi.fn();
    const unsubscribe = useSurveyManager().subscribeToResponse(ids, "owner", changes, { mode: "editable" });
    await vi.waitFor(() => expect(changes).toHaveBeenCalledWith(expect.objectContaining({ ranking, completed: false })));
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(changes.mock.calls.every(([response]) => !response?.completed)).toBe(true);
    unsubscribe();
  });

  it("emits submitted completion only after the PostgreSQL read", async () => {
    fetchMock.mockResolvedValue(Response.json({ response: { ranking, completed: true, completion_pct: 100,
      created_at: "2026-10-31T00:00:00Z", updated_at: "2026-10-31T00:00:00Z" } }));
    const changes = vi.fn();
    const unsubscribe = useSurveyManager().subscribeToResponse(ids, "owner", changes);
    await vi.waitFor(() => expect(changes).toHaveBeenCalledWith(expect.objectContaining({ completed: true, syncState: "synced" })));
    unsubscribe();
  });

  it("keeps submitted results A separate from editable draft B after a failed resubmission", async () => {
    const draftRanking = [{ id: "draft-b", label: "Draft B", img: "draft-image" }];
    const row = { ranking, completed: true, completion_pct: 100,
      created_at: "2026-10-31T00:00:00Z", updated_at: "2026-10-31T00:00:00Z" };
    fetchMock.mockImplementation(async (_url, options) => options?.method === "POST"
      ? new Response("submission failed", { status: 500 }) : Response.json({ response: row }));
    mocks.onSnapshot.mockImplementation((_ref, callback) => {
      callback({ exists: () => true, data: () => ({ ...ids, uid: "owner", ranking: draftRanking, completionPct: 50 }) });
      return vi.fn();
    });
    const manager = useSurveyManager();
    const resultChanges = vi.fn();
    const editorChanges = vi.fn();
    const unsubscribeResults = manager.subscribeToResponse(ids, "owner", resultChanges);
    const unsubscribeEditor = manager.subscribeToResponse(ids, "owner", editorChanges, { mode: "editable" });
    await vi.waitFor(() => expect(resultChanges).toHaveBeenLastCalledWith(expect.objectContaining({ ranking, completed: true })));
    await vi.waitFor(() => expect(editorChanges).toHaveBeenLastCalledWith(expect.objectContaining({ ranking: draftRanking, completed: false })));
    expect(mocks.onSnapshot).toHaveBeenCalledTimes(1);
    expect(manager.resolveCta(resultChanges.mock.lastCall?.[0])).toBe("results");
    expect(manager.resolveCta(editorChanges.mock.lastCall?.[0])).toBe("continue");
    await expect(manager.saveResponse(ids, "owner", { ranking: draftRanking, completed: true, completionPct: 100 })).rejects.toThrow();
    expect(JSON.parse(fetchMock.mock.lastCall?.[1].body).responses.ranking).toEqual(draftRanking);
    expect(mocks.deleteDoc).not.toHaveBeenCalled();
    expect(resultChanges.mock.lastCall?.[0]).toMatchObject({ ranking, completed: true });
    expect(editorChanges.mock.lastCall?.[0]).toMatchObject({ ranking: draftRanking, completed: false });
    unsubscribeResults();
    unsubscribeEditor();
  });

  it("does not fall back to Firestore when a submitted-only read fails", async () => {
    fetchMock.mockResolvedValue(new Response("failed", { status: 500 }));
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.getDoc.mockResolvedValue({ exists: () => true, data: () => ({ ranking, completed: true }) });
    const changes = vi.fn();
    const unsubscribe = useSurveyManager().subscribeToResponse(ids, "owner", changes);
    await vi.waitFor(() => expect(changes).toHaveBeenCalledWith(null));
    expect(mocks.getDoc).not.toHaveBeenCalled();
    expect(mocks.onSnapshot).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalled();
    unsubscribe();
  });

  it("thin app route signs only the server-verified Firebase owner", async () => {
    vi.stubEnv("TRR_API_URL", "http://api.trr.localhost");
    vi.stubEnv("TRR_INTERNAL_ADMIN_SHARED_SECRET", "test-only-survey-secret");
    mocks.requireUser.mockResolvedValue({ uid: "verified-owner", email: "verified@example.test", provider: "firebase" });
    fetchMock.mockResolvedValue(Response.json({ ok: true }));
    const result = await postX(new NextRequest("http://trr.localhost/api/surveys/x", { method: "POST", body: JSON.stringify({ uid: "attacker", responses }) }));
    expect(result.status).toBe(200);
    const token = fetchMock.mock.calls[0][1].headers.authorization.slice(7);
    const claims = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString());
    expect(claims).toMatchObject({ sub: "verified-owner", provider: "firebase", scope: "survey:own", aud: "trr-backend-survey-submissions" });
    expect(claims.exp - claims.iat).toBe(60);
  });
});
