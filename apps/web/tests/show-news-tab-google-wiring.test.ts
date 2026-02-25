import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("show news tab google wiring", () => {
  it("wires google-news sync + unified news endpoints in the show page", () => {
    const filePath = path.resolve(__dirname, "../src/app/admin/trr-shows/[showId]/page.tsx");
    const contents = fs.readFileSync(filePath, "utf8");

    expect(contents).toMatch(/\/api\/admin\/trr-api\/shows\/\$\{(?:showId|requestShowId)\}\/google-news\/sync/);
    expect(contents).toMatch(/\/api\/admin\/trr-api\/shows\/\$\{(?:showId|requestShowId)\}\/google-news\/sync\/\$\{encodeURIComponent\(jobId\)\}/);
    expect(contents).toMatch(/\/api\/admin\/trr-api\/shows\/\$\{(?:showId|requestShowId)\}\/news\?/);
    expect(contents).toMatch(/setNewsSort\("trending"\)/);
    expect(contents).toMatch(/onSetNewsSort=\{setNewsSort\}/);
    expect(contents).toMatch(/setNewsSourceFilter/);
    expect(contents).toMatch(/setNewsPersonFilter/);
    expect(contents).toMatch(/setNewsTopicFilter/);
    expect(contents).toMatch(/setNewsSeasonFilter/);
    expect(contents).toMatch(/syncGoogleNews\(/);
    expect(contents).toMatch(/const loadUnifiedNews = useCallback/);
    expect(contents).toMatch(/sort: newsSort/);
    expect(contents).toMatch(/newsRequestSeqRef/);
    expect(contents).toMatch(/newsInFlightQueryKeyRef/);
    expect(contents).toMatch(/pendingNewsReloadRef/);
    expect(contents).toMatch(/pendingNewsReloadArgsRef/);
    expect(contents).toMatch(/newsCursorQueryKeyRef/);
    expect(contents).toMatch(/shouldAppend && \(!newsNextCursor \|\| newsCursorQueryKeyRef\.current !== queryKey\)/);
    expect(contents).toMatch(/setNewsNextCursor\(null\);\s*newsCursorQueryKeyRef\.current = null;/);
    expect(contents).toMatch(/Failed to load more news:/);
    expect(contents).toMatch(/setNewsFacets/);
    expect(contents).not.toMatch(/filteredUnifiedNews/);
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
