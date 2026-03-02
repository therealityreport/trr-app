import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import AdminGlobalHeader from "@/components/admin/AdminGlobalHeader";
import { ADMIN_RECENT_SHOWS_STORAGE_KEY } from "@/lib/admin/admin-recent-shows";

const { usePathnameMock } = vi.hoisted(() => ({
  usePathnameMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: usePathnameMock,
}));

describe("AdminGlobalHeader", () => {
  beforeEach(() => {
    usePathnameMock.mockReset();
    usePathnameMock.mockReturnValue("/admin");
    localStorage.clear();
    document.body.className = "";
    vi.unstubAllGlobals();
  });

  it("renders the TRR logo and page header body content", () => {
    render(
      <AdminGlobalHeader>
        <div>Header body content</div>
      </AdminGlobalHeader>,
    );

    expect(screen.getByRole("img", { name: "The Reality Report" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go to admin dashboard" })).toHaveAttribute("href", "/admin");
    expect(screen.getByText("Header body content")).toBeInTheDocument();
  });

  it("shows expected menu items and empty recent-shows state", async () => {
    render(<AdminGlobalHeader />);

    fireEvent.click(screen.getByRole("button", { name: "Open admin navigation menu" }));

    await waitFor(() => {
      expect(screen.getByRole("navigation", { name: "Admin navigation" })).toBeInTheDocument();
    });

    for (const label of [
      "Dev Dashboard",
      "Shows",
      "People",
      "Games",
      "Survey Editor",
      "Social Media",
      "Brands",
      "Users",
      "Groups",
      "UI Design System",
      "Settings",
    ]) {
      expect(screen.getByRole("link", { name: label })).toBeInTheDocument();
    }

    expect(screen.getByRole("button", { name: "Toggle shows submenu" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("No recent shows yet.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View All Shows" })).toHaveAttribute("href", "/shows");
  });

  it("renders recent shows from storage and limits to five", async () => {
    localStorage.setItem(
      ADMIN_RECENT_SHOWS_STORAGE_KEY,
      JSON.stringify(
        Array.from({ length: 6 }, (_, index) => ({
          slug: `show-${index + 1}`,
          label: `Show ${index + 1}`,
          href: `/shows/show-${index + 1}`,
          touchedAt: index + 1,
        })),
      ),
    );

    render(<AdminGlobalHeader />);
    fireEvent.click(screen.getByRole("button", { name: "Open admin navigation menu" }));

    await waitFor(() => {
      expect(screen.getByRole("link", { name: "Show 6" })).toBeInTheDocument();
    });

    expect(screen.getByRole("link", { name: "Show 5" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Show 4" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Show 3" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Show 2" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Show 1" })).not.toBeInTheDocument();
  });

  it("closes via escape, backdrop click, and link click", async () => {
    const { container } = render(<AdminGlobalHeader />);
    const openButton = screen.getByRole("button", { name: "Open admin navigation menu" });
    const nav = container.querySelector("#admin-side-menu");

    expect(nav).toBeTruthy();

    fireEvent.click(openButton);
    await waitFor(() => expect(nav).toHaveAttribute("aria-hidden", "false"));

    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(nav).toHaveAttribute("aria-hidden", "true"));

    fireEvent.click(openButton);
    await waitFor(() => expect(nav).toHaveAttribute("aria-hidden", "false"));

    const backdrop = container.querySelector("div.fixed.inset-0.z-40") as HTMLDivElement | null;
    expect(backdrop).toBeTruthy();
    fireEvent.click(backdrop as HTMLDivElement);
    await waitFor(() => expect(nav).toHaveAttribute("aria-hidden", "true"));

    fireEvent.click(openButton);
    await waitFor(() => expect(nav).toHaveAttribute("aria-hidden", "false"));

    fireEvent.click(screen.getByRole("link", { name: "Games" }));
    await waitFor(() => expect(nav).toHaveAttribute("aria-hidden", "true"));
  });

  it("renders grouped global search results", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : String(input);
      if (url.includes("/api/admin/trr-api/search?")) {
        return new Response(
          JSON.stringify({
            shows: [{ id: "show-1", name: "The Traitors", slug: "the-traitors-us" }],
            people: [
              {
                id: "person-1",
                full_name: "Alan Cumming",
                known_for: "Host",
                person_slug: "alan-cumming--aaaaaaaa",
                show_context: "the-traitors-us",
              },
            ],
            episodes: [
              {
                id: "episode-1",
                title: "Episode 1",
                episode_number: 1,
                season_number: 1,
                show_name: "The Traitors",
                show_slug: "the-traitors-us",
              },
            ],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      return new Response(JSON.stringify({ error: "not mocked" }), { status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AdminGlobalHeader />);

    const input = screen.getByRole("searchbox", {
      name: "Search shows, people, and episodes",
    });
    fireEvent.change(input, { target: { value: "ala" } });

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Shows" })).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "People" })).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "Episodes" })).toBeInTheDocument();
    });

    expect(screen.getByRole("link", { name: "The Traitors" })).toHaveAttribute(
      "href",
      "/the-traitors-us",
    );
    expect(screen.getByRole("link", { name: /Alan Cumming/i })).toHaveAttribute(
      "href",
      "/people/alan-cumming--aaaaaaaa?showId=the-traitors-us",
    );
  });
});
