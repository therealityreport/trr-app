import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  requireAdminMock,
  listFlashbackQuizzesMock,
  createFlashbackQuizMock,
  setFlashbackQuizPublishedMock,
  listFlashbackEventsMock,
  createFlashbackEventMock,
  deleteFlashbackEventMock,
} = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  listFlashbackQuizzesMock: vi.fn(),
  createFlashbackQuizMock: vi.fn(),
  setFlashbackQuizPublishedMock: vi.fn(),
  listFlashbackEventsMock: vi.fn(),
  createFlashbackEventMock: vi.fn(),
  deleteFlashbackEventMock: vi.fn(),
}));

vi.mock("@/lib/server/auth", () => ({
  requireAdmin: requireAdminMock,
}));

vi.mock("@/lib/server/admin/flashback-admin-repository", () => ({
  listFlashbackQuizzes: listFlashbackQuizzesMock,
  createFlashbackQuiz: createFlashbackQuizMock,
  setFlashbackQuizPublished: setFlashbackQuizPublishedMock,
  listFlashbackEvents: listFlashbackEventsMock,
  createFlashbackEvent: createFlashbackEventMock,
  deleteFlashbackEvent: deleteFlashbackEventMock,
}));

import { GET as getQuizzes, POST as postQuiz } from "@/app/api/admin/flashback/quizzes/route";
import { PATCH as patchQuiz } from "@/app/api/admin/flashback/quizzes/[quizId]/route";
import {
  GET as getEvents,
  POST as postEvent,
} from "@/app/api/admin/flashback/quizzes/[quizId]/events/route";
import { DELETE as deleteEvent } from "@/app/api/admin/flashback/events/[eventId]/route";

describe("flashback admin routes", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    listFlashbackQuizzesMock.mockReset();
    createFlashbackQuizMock.mockReset();
    setFlashbackQuizPublishedMock.mockReset();
    listFlashbackEventsMock.mockReset();
    createFlashbackEventMock.mockReset();
    deleteFlashbackEventMock.mockReset();
    requireAdminMock.mockResolvedValue({ uid: "firebase-admin-1" });
  });

  it("lists quizzes through the server repository", async () => {
    listFlashbackQuizzesMock.mockResolvedValue([
      {
        id: "quiz-1",
        title: "Bravo Beginnings",
        publish_date: "2026-03-30",
        description: null,
        is_published: false,
        created_at: "2026-03-30T00:00:00.000Z",
        updated_at: "2026-03-30T00:00:00.000Z",
      },
    ]);

    const response = await getQuizzes(new NextRequest("http://localhost/api/admin/flashback/quizzes"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.quizzes).toHaveLength(1);
    expect(listFlashbackQuizzesMock).toHaveBeenCalledTimes(1);
  });

  it("creates quizzes through the server repository", async () => {
    createFlashbackQuizMock.mockResolvedValue({
      id: "quiz-2",
      title: "Bravo Origins",
      publish_date: "2026-04-01",
      description: "Debut season flashbacks",
      is_published: false,
      created_at: "2026-03-30T00:00:00.000Z",
      updated_at: "2026-03-30T00:00:00.000Z",
    });

    const response = await postQuiz(
      new NextRequest("http://localhost/api/admin/flashback/quizzes", {
        method: "POST",
        body: JSON.stringify({
          title: "Bravo Origins",
          publish_date: "2026-04-01",
          description: "Debut season flashbacks",
        }),
        headers: { "content-type": "application/json" },
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(payload.quiz.id).toBe("quiz-2");
    expect(createFlashbackQuizMock).toHaveBeenCalledWith({
      title: "Bravo Origins",
      publishDate: "2026-04-01",
      description: "Debut season flashbacks",
    });
  });

  it("updates quiz publish state through the server repository", async () => {
    setFlashbackQuizPublishedMock.mockResolvedValue({
      id: "quiz-1",
      title: "Bravo Beginnings",
      publish_date: "2026-03-30",
      description: null,
      is_published: true,
      created_at: "2026-03-30T00:00:00.000Z",
      updated_at: "2026-03-30T01:00:00.000Z",
    });

    const response = await patchQuiz(
      new NextRequest("http://localhost/api/admin/flashback/quizzes/quiz-1", {
        method: "PATCH",
        body: JSON.stringify({ is_published: true }),
        headers: { "content-type": "application/json" },
      }),
      { params: Promise.resolve({ quizId: "quiz-1" }) },
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.quiz.is_published).toBe(true);
    expect(setFlashbackQuizPublishedMock).toHaveBeenCalledWith("quiz-1", true);
  });

  it("lists events for a quiz through the server repository", async () => {
    listFlashbackEventsMock.mockResolvedValue([
      {
        id: "event-1",
        quiz_id: "quiz-1",
        description: "Kim returns to Atlanta",
        image_url: null,
        year: 2019,
        sort_order: 1,
        point_value: 3,
      },
    ]);

    const response = await getEvents(
      new NextRequest("http://localhost/api/admin/flashback/quizzes/quiz-1/events"),
      { params: Promise.resolve({ quizId: "quiz-1" }) },
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.events).toHaveLength(1);
    expect(listFlashbackEventsMock).toHaveBeenCalledWith("quiz-1");
  });

  it("creates events through the server repository", async () => {
    createFlashbackEventMock.mockResolvedValue({
      id: "event-2",
      quiz_id: "quiz-1",
      description: "The table flip",
      image_url: null,
      year: 2009,
      sort_order: 4,
      point_value: 5,
    });

    const response = await postEvent(
      new NextRequest("http://localhost/api/admin/flashback/quizzes/quiz-1/events", {
        method: "POST",
        body: JSON.stringify({
          description: "The table flip",
          year: 2009,
          image_url: null,
          point_value: 5,
        }),
        headers: { "content-type": "application/json" },
      }),
      { params: Promise.resolve({ quizId: "quiz-1" }) },
    );
    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(payload.event.sort_order).toBe(4);
    expect(createFlashbackEventMock).toHaveBeenCalledWith({
      quizId: "quiz-1",
      description: "The table flip",
      year: 2009,
      imageUrl: null,
      pointValue: 5,
    });
  });

  it("deletes events through the server repository", async () => {
    deleteFlashbackEventMock.mockResolvedValue(true);

    const response = await deleteEvent(
      new NextRequest("http://localhost/api/admin/flashback/events/event-1", {
        method: "DELETE",
      }),
      { params: Promise.resolve({ eventId: "event-1" }) },
    );

    expect(response.status).toBe(204);
    expect(deleteFlashbackEventMock).toHaveBeenCalledWith("event-1");
  });
});
