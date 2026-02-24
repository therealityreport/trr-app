import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const {
  useParamsMock,
  useSearchParamsMock,
  useAdminGuardMock,
  redditSourcesManagerMock,
} = vi.hoisted(() => ({
  useParamsMock: vi.fn(),
  useSearchParamsMock: vi.fn(),
  useAdminGuardMock: vi.fn(),
  redditSourcesManagerMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useParams: useParamsMock,
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
    useSearchParamsMock.mockReset();
    useAdminGuardMock.mockReset();
    redditSourcesManagerMock.mockReset();
  });

  it("loads focused community and honors return_to back link", () => {
    useAdminGuardMock.mockReturnValue({ user: { uid: "admin-uid" }, checking: false, hasAccess: true });
    useParamsMock.mockReturnValue({ communityId: "community-1" });
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
      }),
    );
  });

  it("falls back to default back href without query params", () => {
    useAdminGuardMock.mockReturnValue({ user: { uid: "admin-uid" }, checking: false, hasAccess: true });
    useParamsMock.mockReturnValue({ communityId: "community-2" });
    useSearchParamsMock.mockReturnValue(new URLSearchParams());

    render(<RedditCommunityViewPage />);

    expect(redditSourcesManagerMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        mode: "global",
        initialCommunityId: "community-2",
        hideCommunityList: true,
        backHref: "/admin/social-media",
      }),
    );
  });
});
