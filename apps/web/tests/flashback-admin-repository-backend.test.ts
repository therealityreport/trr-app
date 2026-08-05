import fs from "node:fs";
import path from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";

const { fetchAdminBackendJsonMock, MockAdminReadProxyError } = vi.hoisted(() => {
  class TestAdminReadProxyError extends Error {
    status: number;
    code?: string;
    retryable?: boolean;

    constructor(
      message: string,
      status: number,
      options?: { code?: string; retryable?: boolean },
    ) {
      super(message);
      this.status = status;
      this.code = options?.code;
      this.retryable = options?.retryable;
    }
  }
  return {
    fetchAdminBackendJsonMock: vi.fn(),
    MockAdminReadProxyError: TestAdminReadProxyError,
  };
});

vi.mock("@/lib/server/trr-api/admin-read-proxy", () => ({
  AdminReadProxyError: MockAdminReadProxyError,
  fetchAdminBackendJson: fetchAdminBackendJsonMock,
  buildAdminBackendStatusError: ({
    fallbackMessage,
    status,
  }: {
    fallbackMessage: string;
    status: number;
  }) => new MockAdminReadProxyError(fallbackMessage, status),
}));

import {
  createFlashbackEvent,
  createFlashbackQuiz,
  deleteFlashbackEvent,
  listFlashbackEvents,
  listFlashbackQuizzes,
  setFlashbackQuizPublished,
} from "@/lib/server/admin/flashback-admin-repository";

const ADMIN_CONTEXT = {
  uid: "firebase-admin-1",
  email: "admin@example.com",
  verifiedAt: 1_700_000_000_000,
};
const QUIZ_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const EVENT_ID = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const quiz = {
  id: QUIZ_ID,
  title: "Bravo Beginnings",
  publish_date: "2026-03-30",
  description: null,
  is_published: false,
  created_at: "2026-03-30T12:00:00Z",
  updated_at: "2026-03-30T12:00:00Z",
};
const event = {
  id: EVENT_ID,
  quiz_id: QUIZ_ID,
  description: "The table flip",
  image_url: null,
  year: 2009,
  sort_order: 1,
  point_value: 5,
};

describe("Flashback admin backend repository boundary", () => {
  beforeEach(() => {
    fetchAdminBackendJsonMock.mockReset();
  });

  it("lists and creates quizzes through authenticated v2 requests", async () => {
    fetchAdminBackendJsonMock
      .mockResolvedValueOnce({ status: 200, data: { quizzes: [quiz] }, durationMs: 2 })
      .mockResolvedValueOnce({ status: 201, data: { quiz }, durationMs: 3 });

    await expect(listFlashbackQuizzes(ADMIN_CONTEXT)).resolves.toEqual([quiz]);
    await expect(
      createFlashbackQuiz(ADMIN_CONTEXT, {
        title: quiz.title,
        publishDate: quiz.publish_date,
        description: null,
      }),
    ).resolves.toEqual(quiz);

    expect(fetchAdminBackendJsonMock).toHaveBeenNthCalledWith(
      1,
      "/admin/flashback/quizzes",
      expect.objectContaining({ apiVersion: "v2", adminContext: ADMIN_CONTEXT }),
    );
    expect(fetchAdminBackendJsonMock).toHaveBeenNthCalledWith(
      2,
      "/admin/flashback/quizzes",
      expect.objectContaining({
        apiVersion: "v2",
        adminContext: ADMIN_CONTEXT,
        method: "POST",
      }),
    );
    expect(JSON.parse(fetchAdminBackendJsonMock.mock.calls[1]?.[1]?.body as string)).toEqual({
      title: quiz.title,
      publish_date: quiz.publish_date,
      description: null,
    });
  });

  it("lists, creates, and deletes events through the v2 contract", async () => {
    fetchAdminBackendJsonMock
      .mockResolvedValueOnce({ status: 200, data: { events: [event] }, durationMs: 2 })
      .mockResolvedValueOnce({ status: 201, data: { event }, durationMs: 3 })
      .mockResolvedValueOnce({ status: 204, data: {}, durationMs: 1 });

    await expect(listFlashbackEvents(ADMIN_CONTEXT, QUIZ_ID)).resolves.toEqual([event]);
    await expect(
      createFlashbackEvent(ADMIN_CONTEXT, {
        quizId: QUIZ_ID,
        description: event.description,
        year: event.year,
        imageUrl: null,
        pointValue: event.point_value,
      }),
    ).resolves.toEqual(event);
    await expect(deleteFlashbackEvent(ADMIN_CONTEXT, EVENT_ID)).resolves.toBe(true);

    expect(fetchAdminBackendJsonMock.mock.calls.map((call) => [call[0], call[1]?.method])).toEqual([
      [`/admin/flashback/quizzes/${QUIZ_ID}/events`, undefined],
      [`/admin/flashback/quizzes/${QUIZ_ID}/events`, "POST"],
      [`/admin/flashback/events/${EVENT_ID}`, "DELETE"],
    ]);
  });

  it("preserves nullable not-found results used by the Next route contract", async () => {
    fetchAdminBackendJsonMock.mockResolvedValue({ status: 404, data: {}, durationMs: 1 });

    await expect(setFlashbackQuizPublished(ADMIN_CONTEXT, QUIZ_ID, true)).resolves.toBeNull();
    await expect(
      createFlashbackEvent(ADMIN_CONTEXT, {
        quizId: QUIZ_ID,
        description: event.description,
        year: event.year,
        pointValue: event.point_value,
      }),
    ).resolves.toBeNull();
    await expect(deleteFlashbackEvent(ADMIN_CONTEXT, EVENT_ID)).resolves.toBe(false);
  });

  it("rejects backend payload drift", async () => {
    fetchAdminBackendJsonMock.mockResolvedValue({
      status: 200,
      data: { quizzes: [{ ...quiz, unexpected: true }] },
      durationMs: 1,
    });

    await expect(listFlashbackQuizzes(ADMIN_CONTEXT)).rejects.toMatchObject({
      status: 502,
      code: "INVALID_BACKEND_RESPONSE",
    });
  });

  it("contains no app-local Postgres fallback", () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, "../src/lib/server/admin/flashback-admin-repository.ts"),
      "utf8",
    );

    expect(source).not.toContain("@/lib/server/postgres");
    expect(source).not.toMatch(/\bquery\s*(?:<|\()/);
    expect(source).not.toContain("withTransaction");
    expect(source).not.toContain("public.flashback_");
  });
});
