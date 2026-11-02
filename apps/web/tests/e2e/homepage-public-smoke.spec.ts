import { expect, test } from "@playwright/test";

test.describe("public homepage smoke", () => {
  test("shows the original game gallery and keeps sign-in accessible", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { level: 1, name: "Pick a game" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Realitease", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Bravodle", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Play", exact: true })).toHaveCount(2);
    await expect(page.getByRole("link", { name: "Sign in", exact: true })).toBeVisible();
    await expect(page.getByRole("region", { name: "The Reality Report editorial launch artwork" })).toHaveCount(0);

    await page.getByRole("link", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByLabel("Email address", { exact: true })).toBeVisible();
  });
});
