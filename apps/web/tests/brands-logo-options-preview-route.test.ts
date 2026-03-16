import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { requireAdminMock } = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
}));

vi.mock("@/lib/server/auth", () => ({
  requireAdmin: requireAdminMock,
}));

import { GET } from "@/app/api/admin/trr-api/brands/logos/options/preview/route";

describe("brand logo preview route", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    requireAdminMock.mockResolvedValue({ uid: "admin-user" });
    vi.restoreAllMocks();
  });

  it("rejects missing, invalid, and disallowed URLs", async () => {
    const missing = await GET(new NextRequest("http://localhost/api/admin/trr-api/brands/logos/options/preview"));
    expect(missing.status).toBe(400);

    const invalid = await GET(
      new NextRequest("http://localhost/api/admin/trr-api/brands/logos/options/preview?url=not-a-url"),
    );
    expect(invalid.status).toBe(400);

    const localhost = await GET(
      new NextRequest(
        "http://localhost/api/admin/trr-api/brands/logos/options/preview?url=http://127.0.0.1/test.jpg",
      ),
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
      new NextRequest(
        "http://localhost/api/admin/trr-api/brands/logos/options/preview?url=https://static.wikia.nocookie.net/logopedia/images/a/a1/test.txt",
      ),
    );

    expect(response.status).toBe(415);
  });

  it("proxies valid Wikia image responses without adding a browser referer", async () => {
    const bytes = new Uint8Array([1, 2, 3, 4]);
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(bytes, {
        status: 200,
        headers: {
          "content-type": "image/svg+xml",
          "content-length": String(bytes.byteLength),
        },
      }),
    );

    const response = await GET(
      new NextRequest(
        "http://localhost/api/admin/trr-api/brands/logos/options/preview?url=https://static.wikia.nocookie.net/logopedia/images/0/00/Bravo.svg/revision/latest?cb=1",
      ),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/svg+xml");
    expect(await response.arrayBuffer()).toBeInstanceOf(ArrayBuffer);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://static.wikia.nocookie.net/logopedia/images/0/00/Bravo.svg/revision/latest?cb=1",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        }),
      }),
    );
    const fetchOptions = fetchMock.mock.calls[0]?.[1];
    expect(fetchOptions).toBeDefined();
    expect((fetchOptions as RequestInit | undefined)?.headers).not.toEqual(
      expect.objectContaining({ referer: expect.any(String) }),
    );
  });
});
