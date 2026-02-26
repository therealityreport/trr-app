import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

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
