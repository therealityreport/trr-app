import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { captureExpectedConsoleError } from "./helpers/expected-console";

const { requireAdminMock } = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
}));

vi.mock("@/lib/server/auth", () => ({
  requireAdmin: requireAdminMock,
}));

const generateRequest = (body: unknown) =>
  new NextRequest("http://localhost/api/design-docs/generate-image", {
    method: "POST",
    body: JSON.stringify(body),
  });

const analyzeRequest = (body: unknown) =>
  new NextRequest("http://localhost/api/design-docs/analyze-image", {
    method: "POST",
    body: JSON.stringify(body),
  });

describe("design-docs AI security routes", () => {
  beforeEach(() => {
    vi.resetModules();
    requireAdminMock.mockReset();
    requireAdminMock.mockResolvedValue({ uid: "admin-user" });
    process.env.OPENAI_API_KEY = "test-openai-key";
    process.env.GEMINI_API_KEY = "test-gemini-key";
  });

  it("rejects anonymous image generation before calling an AI provider", async () => {
    const expectedError = captureExpectedConsoleError(/^\[design-docs\/generate-image\] unauthorized/);
    requireAdminMock.mockRejectedValue(new Error("unauthorized"));
    const fetchMock = vi.spyOn(globalThis, "fetch");
    const { POST } = await import("@/app/api/design-docs/generate-image/route");

    const response = await POST(generateRequest({ prompt: "icon", model: "gpt-image" }));
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload).toEqual({ error: "unauthorized" });
    expect(fetchMock).not.toHaveBeenCalled();
    expectedError.expectCalled();
  });

  it("allows admin image generation", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ data: [{ b64_json: "aW1hZ2U=" }] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    const { POST } = await import("@/app/api/design-docs/generate-image/route");

    const response = await POST(generateRequest({ prompt: "icon", model: "gpt-image" }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.imageUrl).toBe("data:image/png;base64,aW1hZ2U=");
    expect(requireAdminMock).toHaveBeenCalledTimes(1);
  });

  it("rejects private image analysis targets before fetching", async () => {
    const expectedError = captureExpectedConsoleError(/^\[design-docs\/analyze-image\] Image host is not allowed/);
    const fetchMock = vi.spyOn(globalThis, "fetch");
    const { POST } = await import("@/app/api/design-docs/analyze-image/route");

    const response = await POST(analyzeRequest({ imageUrl: "http://127.0.0.1/private.png" }));
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toEqual({ error: "Image host is not allowed" });
    expect(fetchMock).not.toHaveBeenCalled();
    expectedError.expectCalled();
  });

  it("rejects image analysis redirects to private targets", async () => {
    const expectedError = captureExpectedConsoleError(/^\[design-docs\/analyze-image\] Image host is not allowed/);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(null, {
        status: 302,
        headers: { location: "http://127.0.0.1/private.png" },
      }),
    );
    const { POST } = await import("@/app/api/design-docs/analyze-image/route");

    const response = await POST(analyzeRequest({ imageUrl: "https://images.example.com/a.png" }));
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toEqual({ error: "Image host is not allowed" });
    expectedError.expectCalled();
  });
});
