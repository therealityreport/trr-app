import { expect, test } from "@playwright/test";
import { waitForAdminReady } from "./admin-fixtures";

test.describe("admin dashboard utility copy", () => {
  test("desktop dashboard prioritizes search, routing, and status language", async ({ page }) => {
    await page.goto("/");
    await waitForAdminReady(page);

    const quickSearchRegion = page.getByRole("region", { name: "Admin dashboard quick search" });
    const searchbox = quickSearchRegion.getByRole("searchbox", {
      name: "Search shows, people, and episodes",
    });

    await expect(page.getByRole("heading", { level: 1, name: "Search, route, and act." })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Jump straight to the target record." })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Core workflows" })).toBeVisible();
    await expect(page.getByText("What this page is for")).toBeVisible();
    await expect(searchbox).toBeVisible();

    await expect(page.getByText("Need something else?")).toHaveCount(0);
    await expect(page.getByText(/This page should stay operational, not promotional\./)).toBeVisible();

    const searchHeadingBox = await page
      .getByRole("heading", { level: 2, name: "Jump straight to the target record." })
      .boundingBox();
    const searchBox = await searchbox.boundingBox();
    const viewport = page.viewportSize();

    expect(searchHeadingBox).not.toBeNull();
    expect(searchBox).not.toBeNull();
    expect(viewport).not.toBeNull();

    if (!searchHeadingBox || !searchBox || !viewport) {
      throw new Error("Expected bounding boxes for admin dashboard review.");
    }

    expect(searchHeadingBox.y).toBeLessThan(viewport.height * 0.6);
    expect(searchBox.y + searchBox.height).toBeLessThan(viewport.height * 0.8);
  });

  test("mobile dashboard keeps search and utility framing in the initial viewport", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await waitForAdminReady(page);

    const quickSearchRegion = page.getByRole("region", { name: "Admin dashboard quick search" });
    const title = page.getByRole("heading", { level: 1, name: "Search, route, and act." });
    const searchbox = quickSearchRegion.getByRole("searchbox", {
      name: "Search shows, people, and episodes",
    });
    const statusHeading = page.getByRole("heading", { level: 2, name: "What this page is for" });

    await expect(title).toBeVisible();
    await expect(searchbox).toBeVisible();
    await expect(statusHeading).toBeVisible();

    const titleBox = await title.boundingBox();
    const searchBox = await searchbox.boundingBox();
    const viewport = page.viewportSize();

    expect(titleBox).not.toBeNull();
    expect(searchBox).not.toBeNull();
    expect(viewport).not.toBeNull();

    if (!titleBox || !searchBox || !viewport) {
      throw new Error("Expected bounding boxes for mobile admin dashboard review.");
    }

    expect(titleBox.y).toBeLessThan(searchBox.y);
    expect(searchBox.y + searchBox.height).toBeLessThan(viewport.height);
  });
});
