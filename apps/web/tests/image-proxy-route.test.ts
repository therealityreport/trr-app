import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { captureExpectedConsoleError } from "./helpers/expected-console";

const { requireAdminMock } = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
}));

vi.mock("@/lib/server/auth", () => ({
  requireAdmin: requireAdminMock,
}));

import { GET } from "@/app/api/admin/colors/image-proxy/route";

describe("image proxy route", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    requireAdminMock.mockResolvedValue({ uid: "admin-user" });
    vi.restoreAllMocks();
  });

  it("requires admin access", async () => {
    const expectedError = captureExpectedConsoleError(/^\[api\] Failed to proxy image .*unauthorized/);
    requireAdminMock.mockRejectedValue(new Error("unauthorized"));

    const response = await GET(
      new NextRequest("http://localhost/api/admin/colors/image-proxy?url=https://images.example.com/a.png"),
    );

    expect(response.status).toBe(401);
    expectedError.expectCalled();
  });

  it("rejects invalid URLs and disallowed hosts", async () => {
    const missing = await GET(new NextRequest("http://localhost/api/admin/colors/image-proxy"));
    expect(missing.status).toBe(400);

    const localhost = await GET(
      new NextRequest("http://localhost/api/admin/colors/image-proxy?url=http://127.0.0.1/test.jpg"),
    );
    expect(localhost.status).toBe(400);
  });

  it("rejects non-image upstream responses", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("not-image", {
        status: 200,
        headers: { "content-type": "text/plain" },
      }),
    );

    const response = await GET(
      new NextRequest("http://localhost/api/admin/colors/image-proxy?url=https://images.example.com/a.txt"),
    );

    expect(response.status).toBe(415);
  });

  it("rejects redirects to disallowed hosts", async () => {
    const expectedError = captureExpectedConsoleError(/^\[api\] Failed to proxy image .*Host is not allowed/);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(null, {
        status: 302,
        headers: { location: "http://127.0.0.1/private.png" },
      }),
    );

    const response = await GET(
      new NextRequest("http://localhost/api/admin/colors/image-proxy?url=https://images.example.com/a.png"),
    );

    expect(response.status).toBe(400);
    expectedError.expectCalled();
  });

  it("rejects oversized upstream responses before reading the body", async () => {
    const expectedError = captureExpectedConsoleError(/^\[api\] Failed to proxy image .*Image exceeds size limit/);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("too-large", {
        status: 200,
        headers: {
          "content-type": "image/png",
          "content-length": String(10 * 1024 * 1024 + 1),
        },
      }),
    );

    const response = await GET(
      new NextRequest("http://localhost/api/admin/colors/image-proxy?url=https://images.example.com/a.png"),
    );

    expect(response.status).toBe(413);
    expectedError.expectCalled();
  });

  it("proxies valid image responses", async () => {
    const bytes = new Uint8Array([1, 2, 3, 4]);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(bytes, {
        status: 200,
        headers: {
          "content-type": "image/png",
          "content-length": String(bytes.byteLength),
        },
      }),
    );

    const response = await GET(
      new NextRequest("http://localhost/api/admin/colors/image-proxy?url=https://images.example.com/a.png"),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
    expect(await response.arrayBuffer()).toBeInstanceOf(ArrayBuffer);
  });
});
