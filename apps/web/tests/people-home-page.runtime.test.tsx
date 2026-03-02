import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import PeopleHomePage from "@/app/people/page";

const mocks = vi.hoisted(() => ({
  usePathnameMock: vi.fn(),
  fetchAdminWithAuthMock: vi.fn(),
  useAdminGuardMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: mocks.usePathnameMock,
}));

vi.mock("next/image", () => ({
  __esModule: true,
  default: ({ alt = "" }: { alt?: string }) => <span aria-label={alt} />,
}));

vi.mock("@/components/ClientOnly", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/lib/admin/client-auth", () => ({
  fetchAdminWithAuth: (...args: unknown[]) =>
    (mocks.fetchAdminWithAuthMock as (...inner: unknown[]) => unknown)(...args),
}));

vi.mock("@/lib/admin/useAdminGuard", () => ({
  useAdminGuard: () => mocks.useAdminGuardMock(),
}));

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

describe("people home page runtime", () => {
  beforeEach(() => {
    mocks.usePathnameMock.mockReset();
    mocks.fetchAdminWithAuthMock.mockReset();
    mocks.useAdminGuardMock.mockReset();

    mocks.usePathnameMock.mockReturnValue("/people");
    mocks.useAdminGuardMock.mockReturnValue({
      user: { email: "admin@example.com" },
      checking: false,
      hasAccess: true,
    });

    mocks.fetchAdminWithAuthMock.mockImplementation(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : String(input);
      if (url.includes("/api/admin/trr-api/people/home")) {
        return jsonResponse({
          sections: {
            recentlyViewed: { items: [], error: null },
            mostPopular: {
              items: [
                {
                  person_id: "11111111-2222-3333-4444-555555555555",
                  person_slug: "alan-cumming--11111111",
                  full_name: "Alan Cumming",
                  known_for: "Host",
                  photo_url: null,
                  show_context: "the-traitors-us",
                  metric_label: "News Score",
                  metric_value: 15,
                  latest_at: "2026-03-01T00:00:00Z",
                },
              ],
              error: null,
            },
            mostShows: { items: [], error: null },
            topEpisodes: { items: [], error: null },
            recentlyAdded: { items: [], error: null },
          },
        });
      }

      if (url.includes("/api/admin/trr-api/search")) {
        return jsonResponse({
          people: [
            {
              id: "11111111-2222-3333-4444-555555555555",
              full_name: "Alan Cumming",
              known_for: "Host",
              person_slug: "alan-cumming--11111111",
              show_context: "the-traitors-us",
            },
          ],
        });
      }

      return jsonResponse({ error: "not mocked" }, 404);
    });
  });

  it("renders five configured rows and empty states", async () => {
    render(<PeopleHomePage />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Recently Viewed" })).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "Most Popular" })).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "Most Shows" })).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "Top Episodes" })).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "Recently Added" })).toBeInTheDocument();
    });

    expect(screen.getByRole("link", { name: /Alan Cumming/ })).toHaveAttribute(
      "href",
      "/people/alan-cumming--11111111?showId=the-traitors-us",
    );
    expect(screen.getByText("No recent people yet.")).toBeInTheDocument();
  });

  it("shows dropdown search results in Find People section", async () => {
    mocks.fetchAdminWithAuthMock.mockImplementation(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : String(input);
      if (url.includes("/api/admin/trr-api/people/home")) {
        return jsonResponse({
          sections: {
            recentlyViewed: { items: [], error: null },
            mostPopular: { items: [], error: null },
            mostShows: { items: [], error: null },
            topEpisodes: { items: [], error: null },
            recentlyAdded: { items: [], error: null },
          },
        });
      }
      if (url.includes("/api/admin/trr-api/search")) {
        return jsonResponse({
          people: [
            {
              id: "11111111-2222-3333-4444-555555555555",
              full_name: "Alan Cumming",
              known_for: "Host",
              person_slug: "alan-cumming--11111111",
              show_context: "the-traitors-us",
            },
          ],
        });
      }
      return jsonResponse({ error: "not mocked" }, 404);
    });

    render(<PeopleHomePage />);

    const input = screen.getByRole("searchbox", { name: "Find people" });
    fireEvent.change(input, { target: { value: "al" } });

    await waitFor(() => {
      expect(
        mocks.fetchAdminWithAuthMock.mock.calls.some(([url]) =>
          String(url).includes("/api/admin/trr-api/search?q=al&limit=8"),
        ),
      ).toBe(true);
      expect(screen.getByRole("link", { name: /Alan Cumming/ })).toBeInTheDocument();
    });
  });
});
