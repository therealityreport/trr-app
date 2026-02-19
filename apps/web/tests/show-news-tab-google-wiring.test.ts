import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("show news tab google wiring", () => {
  it("wires google-news sync + unified news endpoints in the show page", () => {
    const filePath = path.resolve(__dirname, "../src/app/admin/trr-shows/[showId]/page.tsx");
    const contents = fs.readFileSync(filePath, "utf8");

    expect(contents).toMatch(/\/api\/admin\/trr-api\/shows\/\$\{showId\}\/google-news\/sync/);
    expect(contents).toMatch(/\/api\/admin\/trr-api\/shows\/\$\{showId\}\/news\?/);
    expect(contents).toMatch(/setNewsSort\("trending"\)/);
    expect(contents).toMatch(/setNewsSort\("latest"\)/);
    expect(contents).toMatch(/setNewsSourceFilter/);
    expect(contents).toMatch(/setNewsPersonFilter/);
    expect(contents).toMatch(/setNewsTopicFilter/);
    expect(contents).toMatch(/setNewsSeasonFilter/);
  });

  it("wires Google News URL settings persistence via entity links", () => {
    const filePath = path.resolve(__dirname, "../src/app/admin/trr-shows/[showId]/page.tsx");
    const contents = fs.readFileSync(filePath, "utf8");

    expect(contents).toMatch(/link_kind:\s*"google_news_url"/);
    expect(contents).toMatch(/label:\s*"Google News URL"/);
    expect(contents).toMatch(/entity_type:\s*"show"/);
    expect(contents).toMatch(/season_number:\s*0/);
  });
});

