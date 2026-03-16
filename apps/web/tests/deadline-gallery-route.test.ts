import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { requireAdminMock } = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
}));

vi.mock("@/lib/server/auth", () => ({
  requireAdmin: requireAdminMock,
}));

import { GET } from "@/app/api/admin/assets/deadline-gallery/route";

const SAMPLE_GALLERY_HTML = `
  <script>
    var pmcGalleryExports = {
      "gallery": [
        {
          "image": "https://deadline.com/wp-content/uploads/2025/08/NUP_204746_06735_Heather.jpg",
          "slug": "nup_204746_06735_heather",
          "caption": "<p><strong>Heather Gay<\\/strong> embraces her next chapter as an empty nester.<\\/p>",
          "position": 1,
          "url": "https://deadline.com/gallery/the-real-housewives-of-salt-lake-city-season-6-cast-photos-bravo/"
        }
      ]
    };
  </script>
`;

describe("deadline gallery resolver route", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    requireAdminMock.mockResolvedValue(undefined);
    vi.restoreAllMocks();
  });

  it("returns the direct gallery image URL for a matching caption", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(SAMPLE_GALLERY_HTML, {
          status: 200,
          headers: { "content-type": "text/html; charset=utf-8" },
        }),
      ),
    );

    const request = new NextRequest(
      "http://localhost/api/admin/assets/deadline-gallery?sourceUrl=https%3A%2F%2Fdeadline.com%2Fgallery%2Fthe-real-housewives-of-salt-lake-city-season-6-cast-photos-bravo&caption=Heather%20Gay%20embraces%20her%20next%20chapter%20as%20an%20empty%20nester."
    );
    const response = await GET(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.resolvedUrl).toBe(
      "https://deadline.com/wp-content/uploads/2025/08/NUP_204746_06735_Heather.jpg",
    );
  });

  it("rejects non-deadline gallery URLs", async () => {
    const request = new NextRequest(
      "http://localhost/api/admin/assets/deadline-gallery?sourceUrl=https%3A%2F%2Fexample.com%2Fgallery%2Fbad"
    );
    const response = await GET(request);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toBe("Only deadline.com gallery URLs are allowed");
  });

  it("returns 404 when no gallery item matches the supplied hints", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(SAMPLE_GALLERY_HTML, {
          status: 200,
          headers: { "content-type": "text/html; charset=utf-8" },
        }),
      ),
    );

    const request = new NextRequest(
      "http://localhost/api/admin/assets/deadline-gallery?sourceUrl=https%3A%2F%2Fdeadline.com%2Fgallery%2Fthe-real-housewives-of-salt-lake-city-season-6-cast-photos-bravo&caption=Get%20our%20Breaking%20News%20Alerts"
    );
    const response = await GET(request);
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(payload.error).toBe("No matching gallery image found");
  });
});
