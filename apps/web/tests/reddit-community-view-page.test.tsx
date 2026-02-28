import React from "react";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";

const {
  useParamsMock,
  usePathnameMock,
  useRouterMock,
  useSearchParamsMock,
  useAdminGuardMock,
  redditSourcesManagerMock,
} = vi.hoisted(() => ({
  useParamsMock: vi.fn(),
  usePathnameMock: vi.fn(),
  useRouterMock: vi.fn(),
  useSearchParamsMock: vi.fn(),
  useAdminGuardMock: vi.fn(),
  redditSourcesManagerMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useParams: useParamsMock,
  usePathname: usePathnameMock,
  useRouter: useRouterMock,
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

import RedditCommunityViewPage from "@/app/admin/social-media/reddit/[communitySlug]/page";

describe("reddit community view page", () => {
  beforeEach(() => {
    useParamsMock.mockReset();
    usePathnameMock.mockReset();
    useRouterMock.mockReset();
    useSearchParamsMock.mockReset();
    useAdminGuardMock.mockReset();
    redditSourcesManagerMock.mockReset();
    useRouterMock.mockReturnValue({ replace: vi.fn() });
  });

  it("keeps show/season community routes wired through canonical rewrites", () => {
    const nextConfigPath = resolve(process.cwd(), "next.config.ts");
    const nextConfigSource = readFileSync(nextConfigPath, "utf8");
    const showCommunityAliasPath = resolve(process.cwd(), "src/app/[showId]/social/reddit/[communitySlug]/page.tsx");
    const showCommunitySeasonAliasPath = resolve(
      process.cwd(),
      "src/app/[showId]/social/reddit/[communitySlug]/s[seasonNumber]/page.tsx",
    );

    expect(nextConfigSource).toContain(
      'source: "/:showId/s:seasonNumber(\\\\d+)/social/reddit/:communitySlug"',
    );
    expect(nextConfigSource).toContain(
      'destination: "/:showId/social/reddit/:communitySlug/s:seasonNumber"',
    );
    expect(nextConfigSource).toContain(
      'source: "/:showId/social/official/reddit/:communitySlug/s:seasonNumber(\\\\d+)"',
    );
    expect(nextConfigSource).toContain(
      'destination: "/:showId/social/reddit/:communitySlug/s:seasonNumber"',
    );
    expect(nextConfigSource).toContain(
      'source: "/:showId/social/official/reddit/:communitySlug"',
    );
    expect(nextConfigSource).toContain(
      'destination: "/:showId/social/reddit/:communitySlug"',
    );
    expect(
      existsSync(resolve(process.cwd(), "src/app/[showId]/s[seasonNumber]/[[...rest]]/page.tsx")),
    ).toBe(true);
    expect(
      existsSync(resolve(process.cwd(), "src/app/[showId]/s[seasonNumber]/social/reddit/[communitySlug]/page.tsx")),
    ).toBe(true);
    expect(readFileSync(showCommunityAliasPath, "utf8")).toContain(
      'export { default } from "@/app/admin/social-media/reddit/communities/[communityId]/page";',
    );
    expect(readFileSync(showCommunitySeasonAliasPath, "utf8")).toContain(
      'export { default } from "@/app/admin/social-media/reddit/communities/[communityId]/page";',
    );
  });

  it("loads focused community and honors return_to back link", () => {
    const replaceMock = vi.fn();
    useRouterMock.mockReturnValue({ replace: replaceMock });
    useAdminGuardMock.mockReturnValue({ user: { uid: "admin-uid" }, checking: false, hasAccess: true });
    useParamsMock.mockReturnValue({ communitySlug: "BravoRealHousewives" });
    usePathnameMock.mockReturnValue("/admin/social-media/reddit/BravoRealHousewives");
    useSearchParamsMock.mockReturnValue(
      new URLSearchParams({
        return_to: "/shows/the-real-housewives-of-salt-lake-city/social/reddit/BravoRealHousewives/s6",
      }),
    );

    render(<RedditCommunityViewPage />);

    expect(screen.getByTestId("reddit-sources-manager")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back" })).toHaveAttribute(
      "href",
      "/shows/the-real-housewives-of-salt-lake-city/social/reddit/BravoRealHousewives/s6",
    );

    expect(redditSourcesManagerMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        mode: "global",
        initialCommunityId: "BravoRealHousewives",
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
        communitySlug: "BravoRealHousewives",
        showLabel: "RHOSLC",
        showFullName: "The Real Housewives of Salt Lake City",
        showSlug: "the-real-housewives-of-salt-lake-city",
        seasonLabel: "S6",
        showId: "show-1",
        seasonId: "season-1",
        seasonNumber: 6,
      });
    });

    expect(
      screen.getByRole("heading", {
        name: "r/BravoRealHousewives",
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Admin" })).toHaveAttribute("href", "/admin");
    expect(screen.getByRole("link", { name: "Shows" })).toHaveAttribute("href", "/shows");
    expect(
      screen.getByRole("link", { name: "The Real Housewives of Salt Lake City" }),
    ).toHaveAttribute(
      "href",
      "/the-real-housewives-of-salt-lake-city",
    );
    expect(
      screen
        .getAllByRole("link", { name: "Social Media" })
        .some(
          (link) =>
            link.getAttribute("href") === "/the-real-housewives-of-salt-lake-city/s6/social/reddit",
        ),
    ).toBe(true);
    expect(screen.getByRole("link", { name: "Reddit Analytics" })).toHaveAttribute(
      "href",
      "/the-real-housewives-of-salt-lake-city/s6/social/reddit",
    );
    expect(screen.getByRole("link", { name: "Back" })).toHaveAttribute(
      "href",
      "/the-real-housewives-of-salt-lake-city",
    );
    expect(
      screen
        .getAllByRole("link", { name: "Social Media" })
        .some(
          (link) =>
            link.getAttribute("href") === "/the-real-housewives-of-salt-lake-city/s6/social",
        ),
    ).toBe(true);
    expect(screen.getByRole("link", { name: "REDDIT ANALYTICS" })).toHaveAttribute(
      "href",
      "/the-real-housewives-of-salt-lake-city/s6/social/reddit",
    );

    return waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith(
        "/the-real-housewives-of-salt-lake-city/social/reddit/BravoRealHousewives",
      );
    });
  });

  it("redirects show-scoped community URLs to corrected community slug without forcing season token", async () => {
    const replaceMock = vi.fn();
    useRouterMock.mockReturnValue({ replace: replaceMock });
    useAdminGuardMock.mockReturnValue({ user: { uid: "admin-uid" }, checking: false, hasAccess: true });
    useParamsMock.mockReturnValue({
      showId: "the-real-housewives-of-salt-lake-city",
      communitySlug: "bravorealhouseswives",
    });
    usePathnameMock.mockReturnValue("/the-real-housewives-of-salt-lake-city/social/reddit/bravorealhouseswives");
    useSearchParamsMock.mockReturnValue(new URLSearchParams());

    render(<RedditCommunityViewPage />);

    const managerProps = redditSourcesManagerMock.mock.calls.at(-1)?.[0] as
      | { onCommunityContextChange?: (value: unknown) => void }
      | undefined;
    act(() => {
      managerProps?.onCommunityContextChange?.({
        communityLabel: "r/BravoRealHousewives",
        communitySlug: "BravoRealHousewives",
        showLabel: "RHOSLC",
        showFullName: "The Real Housewives of Salt Lake City",
        showSlug: "the-real-housewives-of-salt-lake-city",
        seasonLabel: "S6",
        showId: "show-1",
        seasonId: "season-1",
        seasonNumber: 6,
      });
    });

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith(
        "/the-real-housewives-of-salt-lake-city/social/reddit/BravoRealHousewives",
      );
    });
  });

  it("accepts show-scoped no-season community URLs without season canonical injection", async () => {
    const replaceMock = vi.fn();
    useRouterMock.mockReturnValue({ replace: replaceMock });
    useAdminGuardMock.mockReturnValue({ user: { uid: "admin-uid" }, checking: false, hasAccess: true });
    useParamsMock.mockReturnValue({
      showId: "rhoslc",
      communitySlug: "bravorealhousewives",
    });
    usePathnameMock.mockReturnValue("/rhoslc/social/reddit/bravorealhousewives");
    useSearchParamsMock.mockReturnValue(new URLSearchParams());

    render(<RedditCommunityViewPage />);

    const managerProps = redditSourcesManagerMock.mock.calls.at(-1)?.[0] as
      | { onCommunityContextChange?: (value: unknown) => void }
      | undefined;
    act(() => {
      managerProps?.onCommunityContextChange?.({
        communityLabel: "r/BravoRealHousewives",
        communitySlug: "BravoRealHousewives",
        showLabel: "RHOSLC",
        showFullName: "The Real Housewives of Salt Lake City",
        showSlug: "rhoslc",
        seasonLabel: "S6",
        showId: "show-1",
        seasonId: "season-1",
        seasonNumber: 6,
      });
    });

    await waitFor(() => {
      expect(replaceMock).not.toHaveBeenCalled();
    });
  });

  it("keeps season-scoped canonical community URLs without additional redirect", async () => {
    const replaceMock = vi.fn();
    useRouterMock.mockReturnValue({ replace: replaceMock });
    useAdminGuardMock.mockReturnValue({ user: { uid: "admin-uid" }, checking: false, hasAccess: true });
    useParamsMock.mockReturnValue({
      showId: "the-real-housewives-of-salt-lake-city",
      seasonNumber: "6",
      communitySlug: "BravoRealHousewives",
    });
    usePathnameMock.mockReturnValue(
      "/the-real-housewives-of-salt-lake-city/social/reddit/BravoRealHousewives/s6",
    );
    useSearchParamsMock.mockReturnValue(new URLSearchParams());

    render(<RedditCommunityViewPage />);

    const managerProps = redditSourcesManagerMock.mock.calls.at(-1)?.[0] as
      | { onCommunityContextChange?: (value: unknown) => void }
      | undefined;
    act(() => {
      managerProps?.onCommunityContextChange?.({
        communityLabel: "r/BravoRealHousewives",
        communitySlug: "BravoRealHousewives",
        showLabel: "RHOSLC",
        showFullName: "The Real Housewives of Salt Lake City",
        showSlug: "the-real-housewives-of-salt-lake-city",
        seasonLabel: "S6",
        showId: "show-1",
        seasonId: "season-1",
        seasonNumber: 6,
      });
    });

    await waitFor(() => {
      expect(replaceMock).not.toHaveBeenCalled();
    });
  });

  it("falls back to default back href without query params", () => {
    useAdminGuardMock.mockReturnValue({ user: { uid: "admin-uid" }, checking: false, hasAccess: true });
    useParamsMock.mockReturnValue({ communitySlug: "RHOP" });
    usePathnameMock.mockReturnValue("/admin/social-media/reddit/RHOP");
    useSearchParamsMock.mockReturnValue(new URLSearchParams());

    render(<RedditCommunityViewPage />);

    expect(redditSourcesManagerMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        mode: "global",
        initialCommunityId: "RHOP",
        hideCommunityList: true,
        backHref: "/admin/social-media",
        episodeDiscussionsPlacement: "inline",
        enableEpisodeSync: true,
      }),
    );
  });

  it("rejects non-local return_to values and keeps default back href", () => {
    useAdminGuardMock.mockReturnValue({ user: { uid: "admin-uid" }, checking: false, hasAccess: true });
    useParamsMock.mockReturnValue({ communitySlug: "rhoslc" });
    usePathnameMock.mockReturnValue("/admin/social-media/reddit/rhoslc");
    useSearchParamsMock.mockReturnValue(
      new URLSearchParams({
        return_to: "https://example.com/not-allowed",
      }),
    );

    render(<RedditCommunityViewPage />);

    expect(screen.getByRole("link", { name: "Back" })).toHaveAttribute("href", "/admin/social-media");
    expect(redditSourcesManagerMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        backHref: "/admin/social-media",
      }),
    );
  });
});
