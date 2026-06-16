import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { captureExpectedConsoleError } from "./helpers/expected-console";

const {
  getSurveysWithAutoProgressMock,
  progressToNextEpisodeMock,
  createWeeklySurveyRunsMock,
  getCurrentWeekWindowMock,
} = vi.hoisted(() => ({
  getSurveysWithAutoProgressMock: vi.fn(),
  progressToNextEpisodeMock: vi.fn(),
  createWeeklySurveyRunsMock: vi.fn(),
  getCurrentWeekWindowMock: vi.fn(),
}));

vi.mock("@/lib/server/surveys/survey-config-repository", () => ({
  getSurveysWithAutoProgress: getSurveysWithAutoProgressMock,
}));

vi.mock("@/lib/server/surveys/survey-episodes-repository", () => ({
  progressToNextEpisode: progressToNextEpisodeMock,
}));

vi.mock("@/lib/server/surveys/survey-run-scheduler", () => ({
  createWeeklySurveyRuns: createWeeklySurveyRunsMock,
  getCurrentWeekWindow: getCurrentWeekWindowMock,
}));

function cronPost(path: string, headers?: Record<string, string>): NextRequest {
  return new NextRequest(`http://localhost${path}`, { method: "POST", headers });
}

async function withNodeEnv<T>(nodeEnv: string, run: () => Promise<T>): Promise<T> {
  const previousNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = nodeEnv;
  try {
    return await run();
  } finally {
    if (typeof previousNodeEnv === "undefined") {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = previousNodeEnv;
    }
  }
}

describe("cron route auth guards", () => {
  beforeEach(() => {
    vi.resetModules();
    getSurveysWithAutoProgressMock.mockReset().mockResolvedValue([]);
    progressToNextEpisodeMock.mockReset();
    createWeeklySurveyRunsMock.mockReset().mockResolvedValue([]);
    getCurrentWeekWindowMock.mockReset().mockReturnValue({
      runKey: "2026-W24",
      startsAt: "2026-06-07T00:00:00.000Z",
      endsAt: "2026-06-14T00:00:00.000Z",
    });
    delete process.env.CRON_SECRET;
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("episode-progression", () => {
    it("fails closed in production when CRON_SECRET is unset", async () => {
      const expectedError = captureExpectedConsoleError(/CRON_SECRET not configured/);
      await withNodeEnv("production", async () => {
        const { POST } = await import("@/app/api/cron/episode-progression/route");
        const response = await POST(cronPost("/api/cron/episode-progression"));

        expect(response.status).toBe(500);
        await expect(response.json()).resolves.toEqual({ error: "Server misconfiguration" });
        expect(getSurveysWithAutoProgressMock).not.toHaveBeenCalled();
      });
      expectedError.expectCalled();
    });

    it("rejects a wrong bearer token in production", async () => {
      const expectedError = captureExpectedConsoleError(/Unauthorized episode progression attempt/);
      process.env.CRON_SECRET = "cron-secret";
      await withNodeEnv("production", async () => {
        const { POST } = await import("@/app/api/cron/episode-progression/route");
        const response = await POST(
          cronPost("/api/cron/episode-progression", { authorization: "Bearer wrong" }),
        );

        expect(response.status).toBe(401);
        await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
        expect(getSurveysWithAutoProgressMock).not.toHaveBeenCalled();
      });
      expectedError.expectCalled();
    });

    it("accepts the configured bearer token in production", async () => {
      process.env.CRON_SECRET = "cron-secret";
      await withNodeEnv("production", async () => {
        const { POST } = await import("@/app/api/cron/episode-progression/route");
        const response = await POST(
          cronPost("/api/cron/episode-progression", { authorization: "Bearer cron-secret" }),
        );

        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toMatchObject({ success: true, processed: 0 });
        expect(getSurveysWithAutoProgressMock).toHaveBeenCalledTimes(1);
      });
    });

    it("allows unauthenticated runs outside production for local testing", async () => {
      const { POST } = await import("@/app/api/cron/episode-progression/route");
      const response = await POST(cronPost("/api/cron/episode-progression"));

      expect(response.status).toBe(200);
      expect(getSurveysWithAutoProgressMock).toHaveBeenCalledTimes(1);
    });
  });

  describe("create-survey-runs", () => {
    it("fails closed in production when CRON_SECRET is unset", async () => {
      const expectedError = captureExpectedConsoleError(/CRON_SECRET not configured/);
      await withNodeEnv("production", async () => {
        const { POST } = await import("@/app/api/cron/create-survey-runs/route");
        const response = await POST(cronPost("/api/cron/create-survey-runs"));

        expect(response.status).toBe(500);
        await expect(response.json()).resolves.toEqual({ error: "Server misconfiguration" });
        expect(createWeeklySurveyRunsMock).not.toHaveBeenCalled();
      });
      expectedError.expectCalled();
    });

    it("rejects a wrong bearer token in production", async () => {
      const expectedError = captureExpectedConsoleError(/Unauthorized survey run creation attempt/);
      process.env.CRON_SECRET = "cron-secret";
      await withNodeEnv("production", async () => {
        const { POST } = await import("@/app/api/cron/create-survey-runs/route");
        const response = await POST(
          cronPost("/api/cron/create-survey-runs", { authorization: "Bearer wrong" }),
        );

        expect(response.status).toBe(401);
        await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
        expect(createWeeklySurveyRunsMock).not.toHaveBeenCalled();
      });
      expectedError.expectCalled();
    });

    it("accepts the configured bearer token in production", async () => {
      process.env.CRON_SECRET = "cron-secret";
      await withNodeEnv("production", async () => {
        const { POST } = await import("@/app/api/cron/create-survey-runs/route");
        const response = await POST(
          cronPost("/api/cron/create-survey-runs", { authorization: "Bearer cron-secret" }),
        );

        expect(response.status).toBe(200);
        expect(createWeeklySurveyRunsMock).toHaveBeenCalledTimes(1);
      });
    });
  });
});
