import { describe, expect, it } from "vitest";
import { ADMIN_DASHBOARD_TOOLS, ADMIN_NAV_ITEMS } from "@/lib/admin/admin-navigation";

describe("admin navigation config", () => {
  it("contains the expected top-level menu items in order", () => {
    expect(ADMIN_NAV_ITEMS.map((item) => item.title)).toEqual([
      "Dev Dashboard",
      "Shows",
      "Games",
      "Survey Editor",
      "Social Media",
      "Networks & Streaming",
      "Users",
      "Groups",
      "UI Design System",
      "Settings",
    ]);

    expect(ADMIN_NAV_ITEMS.map((item) => item.href)).toEqual([
      "/admin/dev-dashboard",
      "/admin/trr-shows",
      "/admin/games",
      "/admin/surveys",
      "/admin/social-media",
      "/admin/networks",
      "/admin/users",
      "/admin/groups",
      "/admin/fonts",
      "/admin/settings",
    ]);
  });

  it("marks only Shows as submenu-enabled", () => {
    const submenuItems = ADMIN_NAV_ITEMS.filter((item) => item.hasShowsSubmenu);
    expect(submenuItems).toHaveLength(1);
    expect(submenuItems[0]?.title).toBe("Shows");
    expect(submenuItems[0]?.href).toBe("/admin/trr-shows");
  });

  it("reuses the shared navigation config for dashboard tools", () => {
    expect(ADMIN_DASHBOARD_TOOLS).toBe(ADMIN_NAV_ITEMS);
  });
});
