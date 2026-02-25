import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";

const {
  useParamsMock,
  usePathnameMock,
  useSearchParamsMock,
  useAdminGuardMock,
  redditSourcesManagerMock,
} = vi.hoisted(() => ({
  useParamsMock: vi.fn(),
  usePathnameMock: vi.fn(),
  useSearchParamsMock: vi.fn(),
  useAdminGuardMock: vi.fn(),
  redditSourcesManagerMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useParams: useParamsMock,
  usePathname: usePathnameMock,
  useSearchParams: useSearchParamsMock,
}));

vi.mock("@/lib/admin/useAdminGuard", () => ({
  useAdminGuard: useAdminGuardMock,
}));

vi.mock("@/components/ClientOnly", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/admin/reddit-sources-manager", () => ({
  default: (props: unknown) => {
    redditSourcesManagerMock(props);
    return <div data-testid="reddit-sources-manager" />;
  },
}));

import RedditCommunityViewPage from "@/app/admin/social-media/reddit/communities/[communityId]/page";

describe("reddit community view page", () => {
  beforeEach(() => {
    useParamsMock.mockReset();
    usePathnameMock.mockReset();
    useSearchParamsMock.mockReset();
    useAdminGuardMock.mockReset();
    redditSourcesManagerMock.mockReset();
  });

  it("loads focused community and honors return_to back link", () => {
    useAdminGuardMock.mockReturnValue({ user: { uid: "admin-uid" }, checking: false, hasAccess: true });
    useParamsMock.mockReturnValue({ communityId: "community-1" });
    usePathnameMock.mockReturnValue("/admin/social-media/reddit/communities/community-1");
    useSearchParamsMock.mockReturnValue(
      new URLSearchParams({
        return_to: "/admin/trr-shows/the-real-housewives-of-salt-lake-city/seasons/6?tab=social&social_platform=reddit",
      }),
    );

    render(<RedditCommunityViewPage />);

    expect(screen.getByTestId("reddit-sources-manager")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back" })).toHaveAttribute(
      "href",
      "/admin/trr-shows/the-real-housewives-of-salt-lake-city/seasons/6?tab=social&social_platform=reddit",
    );

    expect(redditSourcesManagerMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        mode: "global",
        initialCommunityId: "community-1",
        hideCommunityList: true,
        episodeDiscussionsPlacement: "inline",
        enableEpisodeSync: true,
      }),
    );

    const managerProps = redditSourcesManagerMock.mock.calls.at(-1)?.[0] as
      | { onCommunityContextChange?: (value: unknown) => void }
      | undefined;
    act(() => {
      managerProps?.onCommunityContextChange?.({
        communityLabel: "r/BravoRealHousewives",
        showLabel: "RHOSLC",
        showSlug: "the-real-housewives-of-salt-lake-city",
        seasonLabel: "S6",
        showId: "show-1",
        seasonId: "season-1",
        seasonNumber: 6,
      });
    });

    expect(screen.getByRole("heading", { name: "r/BravoRealHousewives" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Admin" })).toHaveAttribute("href", "/admin");
    expect(screen.getByRole("link", { name: "RHOSLC" })).toHaveAttribute(
      "href",
      "/admin/trr-shows/the-real-housewives-of-salt-lake-city",
    );
    expect(screen.getByRole("link", { name: "S6" })).toHaveAttribute(
      "href",
      "/admin/trr-shows/the-real-housewives-of-salt-lake-city/seasons/6",
    );
    expect(screen.getByRole("link", { name: "Social Analytics" })).toHaveAttribute(
      "href",
      "/admin/trr-shows/the-real-housewives-of-salt-lake-city/seasons/6?tab=social",
    );
    expect(screen.getByRole("link", { name: "Reddit" })).toHaveAttribute(
      "href",
      "/admin/trr-shows/the-real-housewives-of-salt-lake-city/seasons/6?tab=social&social_platform=reddit",
    );
    expect(screen.getByRole("link", { name: "r/BravoRealHousewives" })).toHaveAttribute(
      "href",
      "/admin/social-media/reddit/communities/community-1?return_to=%2Fadmin%2Ftrr-shows%2Fthe-real-housewives-of-salt-lake-city%2Fseasons%2F6%3Ftab%3Dsocial%26social_platform%3Dreddit",
    );
  });

  it("falls back to default back href without query params", () => {
    useAdminGuardMock.mockReturnValue({ user: { uid: "admin-uid" }, checking: false, hasAccess: true });
    useParamsMock.mockReturnValue({ communityId: "community-2" });
    usePathnameMock.mockReturnValue("/admin/social-media/reddit/communities/community-2");
    useSearchParamsMock.mockReturnValue(new URLSearchParams());

    render(<RedditCommunityViewPage />);

    expect(redditSourcesManagerMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        mode: "global",
        initialCommunityId: "community-2",
        hideCommunityList: true,
        backHref: "/admin/social-media",
        episodeDiscussionsPlacement: "inline",
        enableEpisodeSync: true,
      }),
    );
  });
});
