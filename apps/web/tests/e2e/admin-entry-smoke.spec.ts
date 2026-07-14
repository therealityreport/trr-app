import { expect, test } from "@playwright/test";

test.describe("admin entry smoke", () => {
  test("desktop admin entry keeps the brand, H1, quick search, and route list available", async ({ page }) => {
    await page.goto("/");

    const dashboardHeading = page.getByRole("heading", {
      level: 1,
      name: "Search, route, and act.",
    });
    const quickSearch = page.getByRole("searchbox", { name: "Search shows, people, and episodes" });
    const showsCard = page.getByRole("link", { name: /Shows Browse the show library/i });

    await expect(dashboardHeading).toBeVisible();
    await expect(quickSearch).toBeVisible();
    await expect(showsCard).toBeVisible();
    await expect(page.getByRole("img", { name: "The Reality Report" })).toBeVisible();

    const headingBox = await dashboardHeading.boundingBox();
    const searchBox = await quickSearch.boundingBox();

    expect(headingBox).not.toBeNull();
    expect(searchBox).not.toBeNull();

    const viewport = page.viewportSize();
    expect(viewport).not.toBeNull();
    if (!headingBox || !searchBox || !viewport) {
      throw new Error("Expected viewport and bounding boxes for admin dashboard review.");
    }

    expect(headingBox.y).toBeLessThan(viewport.height * 0.45);
    expect(searchBox.y + searchBox.height).toBeLessThan(viewport.height);
  });

  test("mobile admin entry stays scannable and keeps quick search above the fold", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");

    const dashboardHeading = page.getByRole("heading", {
      level: 1,
      name: "Search, route, and act.",
    });
    const quickSearchHeading = page.getByRole("heading", {
      level: 2,
      name: "Jump straight to the target record.",
    });
    const quickSearch = page.getByRole("searchbox", { name: "Search shows, people, and episodes" });

    await expect(dashboardHeading).toBeVisible();
    await expect(quickSearchHeading).toBeVisible();
    await expect(quickSearch).toBeVisible();

    const headingBox = await dashboardHeading.boundingBox();
    const searchHeadingBox = await quickSearchHeading.boundingBox();
    const searchBox = await quickSearch.boundingBox();
    const viewport = page.viewportSize();

    expect(headingBox).not.toBeNull();
    expect(searchHeadingBox).not.toBeNull();
    expect(searchBox).not.toBeNull();
    expect(viewport).not.toBeNull();

    if (!headingBox || !searchHeadingBox || !searchBox || !viewport) {
      throw new Error("Expected viewport and bounding boxes for mobile admin dashboard review.");
    }

    expect(headingBox.y).toBeLessThan(searchHeadingBox.y);
    expect(searchBox.y + searchBox.height).toBeLessThan(viewport.height);
    expect(searchBox.y).toBeGreaterThan(searchHeadingBox.y);
  });
});
