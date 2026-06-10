import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ADMIN_DASHBOARD_TOOLS, ADMIN_NAV_ITEMS } from "@/lib/admin/admin-navigation";

describe("admin navigation config", () => {
  it("contains the expected top-level menu items in order", () => {
    expect(ADMIN_NAV_ITEMS.map((item) => item.title)).toEqual([
      "Dev Dashboard",
      "Shows",
      "Screenalytics",
      "Cast References",
      "People",
      "Games",
      "Surveys",
      "Social Media",
      "Brands",
      "Users",
      "Groups",
      "Docs",
      "API References Library",
      "UI Design System",
      "Design Docs",
      "Settings",
    ]);

    expect(ADMIN_NAV_ITEMS.map((item) => item.href)).toEqual([
      "/dev-dashboard",
      "/admin/shows",
      "/screenalytics",
      "/admin/cast-reference-review",
      "/people",
      "/games",
      "/surveys",
      "/admin/social",
      "/brands",
      "/users",
      "/groups",
      "/docs",
      "/admin/api-references",
      "/design-system/fonts",
      "/design-docs",
      "/settings",
    ]);
  });

  it("marks only Shows as submenu-enabled", () => {
    const submenuItems = ADMIN_NAV_ITEMS.filter((item) => item.hasShowsSubmenu);
    expect(submenuItems).toHaveLength(1);
    expect(submenuItems[0]?.title).toBe("Shows");
    expect(submenuItems[0]?.href).toBe("/admin/shows");
  });

  it("reuses the shared navigation config for dashboard tools", () => {
    expect(ADMIN_DASHBOARD_TOOLS).toBe(ADMIN_NAV_ITEMS);
  });

  it("does not route admin-labeled dashboard links to the public home page", () => {
    const files = [
      "src/components/admin/AdminGlobalHeader.tsx",
      "src/app/admin/dev-dashboard/_components/DevDashboardShell.tsx",
      "src/app/admin/docs/page.tsx",
      "src/app/admin/games/page.tsx",
      "src/app/admin/groups/page.tsx",
      "src/app/admin/settings/page.tsx",
      "src/app/admin/social/page.tsx",
      "src/app/admin/surveys/page.tsx",
      "src/app/admin/trr-shows/page.tsx",
      "src/app/admin/users/page.tsx",
      "src/components/admin/UnifiedBrandsWorkspace.tsx",
    ];

    for (const file of files) {
      const source = readFileSync(join(process.cwd(), file), "utf8");

      expect(source, file).not.toMatch(/href="\/"[\s\S]{0,220}Back to (?:Admin|Dashboard)/);
      expect(source, file).not.toMatch(/aria-label="Go to admin dashboard"[\s\S]{0,80}href="\/"/);
      expect(source, file).not.toMatch(/href="\/"[\s\S]{0,80}aria-label="Go to admin dashboard"/);
    }
  });
});
