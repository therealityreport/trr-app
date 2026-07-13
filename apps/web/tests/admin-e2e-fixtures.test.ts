import { describe, expect, it } from "vitest";
import { buildMockGettyLocalScrapeResponse } from "./e2e/admin-fixtures";

describe("admin e2e Getty fixture", () => {
  it("models the asynchronous POST kickoff contract", () => {
    const response = buildMockGettyLocalScrapeResponse("POST", null);

    expect(response.status).toBe(202);
    expect(response.body).toMatchObject({
      prefetch_token: "mock-getty-prefetch-token",
      status: "running",
      poll_after_ms: 1000,
      status_url:
        "/api/admin/getty-local/scrape?prefetch_token=mock-getty-prefetch-token",
    });
  });

  it("echoes the requested token from GET polling", () => {
    const response = buildMockGettyLocalScrapeResponse(
      "GET",
      "11111111-1111-4111-8111-111111111111",
    );

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      prefetch_token: "11111111-1111-4111-8111-111111111111",
      status: "completed",
      poll_after_ms: 0,
      status_url:
        "/api/admin/getty-local/scrape?prefetch_token=11111111-1111-4111-8111-111111111111",
    });
  });
});
