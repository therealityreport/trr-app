import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

const {
  fetchAdminWithAuthMock,
  useAdminGuardMock,
  redditSourcesManagerMock,
} = vi.hoisted(() => ({
  fetchAdminWithAuthMock: vi.fn(),
  useAdminGuardMock: vi.fn(),
  redditSourcesManagerMock: vi.fn(),
}));

vi.mock("@/lib/admin/client-auth", () => ({
  fetchAdminWithAuth: (...args: unknown[]) =>
    (fetchAdminWithAuthMock as (...inner: unknown[]) => unknown)(...args),
}));

vi.mock("@/lib/admin/useAdminGuard", () => ({
  useAdminGuard: (...args: unknown[]) =>
    (useAdminGuardMock as (...inner: unknown[]) => unknown)(...args),
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

import RedditDashboardPage from "@/app/admin/social/reddit/page";

describe("reddit dashboard page", () => {
  beforeEach(() => {
    fetchAdminWithAuthMock.mockReset();
    useAdminGuardMock.mockReset();
    redditSourcesManagerMock.mockReset();

    useAdminGuardMock.mockReturnValue({
      user: { uid: "admin-uid" },
      checking: false,
      hasAccess: true,
    });

    fetchAdminWithAuthMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          network_sets: [],
          show_sets: [],
          people_profiles: [],
          shared_pipeline: {
            sources: [],
            runs: [],
            review_items: [],
          },
          reddit_dashboard: {
            active_community_count: 12,
            archived_community_count: 3,
            show_count: 9,
          },
        }),
        { status: 200 },
      ),
    );
  });

  it("renders reddit summary counts and mounts the global manager with the community list visible", async () => {
    render(<RedditDashboardPage />);

    await waitFor(() => {
      expect(fetchAdminWithAuthMock).toHaveBeenCalledWith(
        "/api/admin/social/landing",
        undefined,
        expect.objectContaining({
          allowDevAdminBypass: true,
          preferredUser: { uid: "admin-uid" },
        }),
      );
    });

    expect(await screen.findByRole("heading", { name: /reddit dashboard/i })).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("9")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /back to social/i })).toHaveAttribute(
      "href",
      "/admin/social",
    );
    expect(screen.getByTestId("reddit-sources-manager")).toBeInTheDocument();
    expect(redditSourcesManagerMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        mode: "global",
        hideCommunityList: false,
        episodeDiscussionsPlacement: "hidden",
        inventoryOnly: true,
      }),
    );
  });
});
