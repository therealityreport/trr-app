import { expect, test } from "@playwright/test";
import { SHOW_ID, mockAdminApi, waitForAdminReady } from "./admin-fixtures";

const ADMIN_RECENT_SHOWS_STORAGE_KEY = "trr-admin-recent-shows-v1";

test.describe("admin global header menu", () => {
  test("renders hamburger + logo and shows expected top-level menu content", async ({ page }) => {
    await page.goto("/admin");
    await waitForAdminReady(page);

    await expect(page.getByRole("button", { name: "Open admin navigation menu" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Go to admin dashboard" })).toBeVisible();

    await page.getByRole("button", { name: "Open admin navigation menu" }).click();

    const nav = page.getByRole("navigation", { name: "Admin navigation" });
    await expect(nav).toBeVisible();

    for (const label of [
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
    ]) {
      await expect(nav.getByRole("link", { name: label, exact: true })).toBeVisible();
    }

    await expect(nav.getByRole("button", { name: "Toggle shows submenu" })).toHaveAttribute("aria-expanded", "true");
    await expect(nav.getByRole("link", { name: "View All Shows" })).toHaveAttribute("href", "/admin/trr-shows");
  });

  test("limits recent shows submenu to the latest five", async ({ page }) => {
    await page.addInitScript(([storageKey]) => {
      const entries = Array.from({ length: 6 }, (_, index) => ({
        slug: `show-${index + 1}`,
        label: `Show ${index + 1}`,
        href: `/admin/trr-shows/show-${index + 1}`,
        touchedAt: index + 1,
      }));
      window.localStorage.setItem(storageKey, JSON.stringify(entries));
    }, [ADMIN_RECENT_SHOWS_STORAGE_KEY]);

    await page.goto("/admin");
    await waitForAdminReady(page);
    await page.getByRole("button", { name: "Open admin navigation menu" }).click();
    const nav = page.getByRole("navigation", { name: "Admin navigation" });

    for (const label of ["Show 6", "Show 5", "Show 4", "Show 3", "Show 2"]) {
      await expect(nav.getByRole("link", { name: label, exact: true })).toBeVisible();
    }

    await expect(nav.getByRole("link", { name: "Show 1", exact: true })).toHaveCount(0);
  });

  test("tracks recent shows from real navigation and preserves most-recent-first order", async ({ page }) => {
    await mockAdminApi(page);
    await page.route(`**/api/admin/trr-api/shows/${SHOW_ID}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          show: {
            id: SHOW_ID,
            name: "Mock Show",
            slug: null,
            canonical_slug: null,
            alternative_names: [],
            imdb_id: null,
            tmdb_id: null,
            show_total_seasons: 6,
            show_total_episodes: 100,
            description: "",
            premiere_date: "2025-01-01",
            networks: ["Bravo"],
            genres: ["Reality"],
            tags: [],
            tmdb_status: null,
            tmdb_vote_average: null,
            imdb_rating_value: null,
            logo_url: null,
            streaming_providers: [],
            watch_providers: [],
          },
        }),
      });
    });

    for (const slug of [
      "alpha-show",
      "beta-show",
      "gamma-show",
      "delta-show",
      "epsilon-show",
      "zeta-show",
    ]) {
      await page.goto(`/admin/trr-shows/${slug}`);
      await waitForAdminReady(page);
    }

    await page.goto("/admin");
    await waitForAdminReady(page);
    await page.getByRole("button", { name: "Open admin navigation menu" }).click();

    const nav = page.getByRole("navigation", { name: "Admin navigation" });
    const recentLinks = nav.locator("#admin-shows-submenu ul li a");
    await expect(recentLinks).toHaveCount(5);

    const hrefs = await recentLinks.evaluateAll((elements) =>
      elements.map((element) => element.getAttribute("href")),
    );
    expect(hrefs).toEqual([
      "/admin/trr-shows/zeta-show",
      "/admin/trr-shows/epsilon-show",
      "/admin/trr-shows/delta-show",
      "/admin/trr-shows/gamma-show",
      "/admin/trr-shows/beta-show",
    ]);

    await expect(nav.getByRole("link", { name: "View All Shows" })).toBeVisible();
    await expect(nav.locator('a[href="/admin/trr-shows/alpha-show"]')).toHaveCount(0);
  });

  test("closes on escape, backdrop click, and navigation", async ({ page }) => {
    await page.goto("/admin");
    await waitForAdminReady(page);

    const openMenu = page.getByRole("button", { name: "Open admin navigation menu" });
    const nav = page.locator("#admin-side-menu");
    const backdrop = page.locator("div.fixed.inset-0.z-40");

    await openMenu.click();
    await expect(nav).toHaveAttribute("aria-hidden", "false");

    await page.keyboard.press("Escape");
    await expect(nav).toHaveAttribute("aria-hidden", "true");

    await openMenu.click();
    await expect(nav).toHaveAttribute("aria-hidden", "false");

    const viewportWidth = page.viewportSize()?.width ?? 1280;
    await backdrop.click({ position: { x: viewportWidth - 20, y: 20 } });
    await expect(nav).toHaveAttribute("aria-hidden", "true");

    await openMenu.click();
    await expect(nav).toHaveAttribute("aria-hidden", "false");

    await page
      .getByRole("navigation", { name: "Admin navigation" })
      .getByRole("link", { name: "Games", exact: true })
      .click();
    await waitForAdminReady(page);
    await expect(page).toHaveURL(/\/admin\/games$/);
    await expect(nav).toHaveAttribute("aria-hidden", "true");
  });
});
