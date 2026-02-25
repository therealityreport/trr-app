import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ADMIN_RECENT_SHOWS_STORAGE_KEY,
  buildAdminShowHref,
  readAdminRecentShows,
  recordAdminRecentShow,
} from "@/lib/admin/admin-recent-shows";

describe("admin recent shows storage", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("returns empty for corrupt JSON", () => {
    localStorage.setItem(ADMIN_RECENT_SHOWS_STORAGE_KEY, "{invalid-json");
    expect(readAdminRecentShows()).toEqual([]);
  });

  it("dedupes by slug, keeps max 5, and sorts most-recent-first", () => {
    let now = 1_700_000_000_000;
    vi.spyOn(Date, "now").mockImplementation(() => now++);

    for (let i = 1; i <= 6; i += 1) {
      recordAdminRecentShow({ slug: `show-${i}`, label: `Show ${i}` });
    }

    let entries = readAdminRecentShows();
    expect(entries).toHaveLength(5);
    expect(entries.map((entry) => entry.slug)).toEqual(["show-6", "show-5", "show-4", "show-3", "show-2"]);

    recordAdminRecentShow({ slug: "show-4", label: "Show 4 updated" });

    entries = readAdminRecentShows();
    expect(entries).toHaveLength(5);
    expect(entries[0]).toMatchObject({
      slug: "show-4",
      label: "Show 4 updated",
      href: "/shows/show-4",
    });
    expect(entries.map((entry) => entry.slug)).toEqual(["show-4", "show-6", "show-5", "show-3", "show-2"]);
  });

  it("normalizes malformed saved entries and computes default href", () => {
    localStorage.setItem(
      ADMIN_RECENT_SHOWS_STORAGE_KEY,
      JSON.stringify([
        { slug: "  slc  ", label: "  RHOSLC  ", touchedAt: "123" },
        { slug: "", label: "Invalid" },
        { label: "Missing slug" },
      ]),
    );

    expect(readAdminRecentShows()).toEqual([
      {
        slug: "slc",
        label: "RHOSLC",
        href: "/shows/slc",
        touchedAt: 123,
      },
    ]);

    expect(buildAdminShowHref("real-housewives/beverly-hills")).toBe(
      "/shows/real-housewives%2Fbeverly-hills",
    );
  });
});
