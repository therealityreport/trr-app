import { NextRequest } from "next/server";

import { GET } from "@/app/api/admin/design-docs/nyt-homepage-preview/route";

describe("NYT homepage preview route", () => {
  it("serves distinct Watch Today’s Videos and More News fragments", async () => {
    const watchRequest = new NextRequest(
      "http://localhost/api/admin/design-docs/nyt-homepage-preview?view=fragment&id=watch-todays-videos",
    );
    const moreNewsRequest = new NextRequest(
      "http://localhost/api/admin/design-docs/nyt-homepage-preview?view=fragment&id=more-news",
    );

    const watchResponse = await GET(watchRequest);
    const moreNewsResponse = await GET(moreNewsRequest);

    expect(watchResponse.status).toBe(200);
    expect(moreNewsResponse.status).toBe(200);

    const watchHtml = await watchResponse.text();
    const moreNewsHtml = await moreNewsResponse.text();

    expect(watchHtml).toContain("Watch Today’s Videos");
    expect(watchHtml).toContain("Video feed");
    expect(moreNewsHtml).toContain("More News");
    expect(moreNewsHtml).toContain("London Braces for Disruption From Tube Drivers’ Strike");
    expect(moreNewsHtml).not.toEqual(watchHtml);
  }, 15000);

  it("resolves the Wirecutter package without falling through to nav labels", async () => {
    const request = new NextRequest(
      "http://localhost/api/admin/design-docs/nyt-homepage-preview?view=fragment&id=wirecutter-package",
    );

    const response = await GET(request);

    expect(response.status).toBe(200);
    const html = await response.text();

    expect(html).toContain("Wirecutter");
    expect(html).toContain("The Very Best Toilet Paper");
    expect(html).not.toContain('{"error":"Could not resolve container');
  });

  it("resolves the Games package as its own homepage module", async () => {
    const request = new NextRequest(
      "http://localhost/api/admin/design-docs/nyt-homepage-preview?view=fragment&id=games-package",
    );

    const response = await GET(request);

    expect(response.status).toBe(200);
    const html = await response.text();

    expect(html).toContain("Games");
    expect(html).toContain("Daily puzzles");
    expect(html).toContain("Wordle");
  });
});
