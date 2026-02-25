import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import ShowNewsTab from "@/components/admin/show-tabs/ShowNewsTab";

describe("ShowNewsTab runtime", () => {
  it("renders controls and dispatches callbacks", () => {
    const onSetNewsSort = vi.fn();
    const onRefreshNews = vi.fn();
    const onSetNewsSourceFilter = vi.fn();
    const onSetNewsPersonFilter = vi.fn();
    const onSetNewsTopicFilter = vi.fn();
    const onSetNewsSeasonFilter = vi.fn();
    const onClearFilters = vi.fn();
    const onLoadMore = vi.fn();

    render(
      <ShowNewsTab
        showName="RHOSLC"
        newsSort="trending"
        onSetNewsSort={onSetNewsSort}
        onRefreshNews={onRefreshNews}
        newsLoading={false}
        newsSyncing={false}
        newsSourceFilter=""
        onSetNewsSourceFilter={onSetNewsSourceFilter}
        newsPersonFilter=""
        onSetNewsPersonFilter={onSetNewsPersonFilter}
        newsTopicFilter=""
        onSetNewsTopicFilter={onSetNewsTopicFilter}
        newsSeasonFilter=""
        onSetNewsSeasonFilter={onSetNewsSeasonFilter}
        onClearFilters={onClearFilters}
        newsSourceOptions={[{ token: "google_news", label: "Google News", count: 3 }]}
        newsPeopleOptions={[{ id: "p1", name: "Heather", count: 2 }]}
        newsTopicOptions={[{ topic: "Reunion", count: 2 }]}
        newsSeasonOptions={[{ seasonNumber: 6, count: 4 }]}
        newsPageCount={1}
        newsTotalCount={7}
        newsError={null}
        newsNotice={null}
        newsGoogleUrlMissing={false}
        unifiedNews={[
          {
            article_url: "https://example.com/story",
            headline: "Test Story",
            source_id: "google_news",
            feed_rank: 0,
            season_matches: [{ season_number: 6, match_types: ["explicit"] }],
            topic_tags: ["Reunion"],
            person_tags: [{ person_name: "Heather", person_id: "p1" }],
            published_at: "2026-02-24T00:00:00Z",
          },
        ]}
        formatPublishedDate={() => "Feb 24, 2026"}
        newsNextCursor="cursor-1"
        onLoadMore={onLoadMore}
        renderNewsImage={({ alt }) => <div role="img" aria-label={alt} />}
      />
    );

    expect(screen.getByRole("tabpanel")).toBeInTheDocument();
    expect(screen.getByText("Unified News Feed")).toBeInTheDocument();
    expect(screen.getByText("Test Story")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Latest" }));
    expect(onSetNewsSort).toHaveBeenCalledWith("latest");

    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
    expect(onRefreshNews).toHaveBeenCalledTimes(1);

    fireEvent.change(screen.getByLabelText("Source"), {
      target: { value: "google_news" },
    });
    expect(onSetNewsSourceFilter).toHaveBeenCalledWith("google_news");

    fireEvent.click(screen.getByRole("button", { name: "Clear Filters" }));
    expect(onClearFilters).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Load More" }));
    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });
});
