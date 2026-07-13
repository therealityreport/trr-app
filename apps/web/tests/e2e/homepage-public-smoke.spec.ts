import { expect, test } from "@playwright/test";

test.describe("public homepage smoke", () => {
  test("keeps the editorial hero and authentication actions visible", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Reality TV, reported with a sharper eye.",
      }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Continue", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /Continue with Google/i })).toBeVisible();
    await expect(
      page.getByRole("region", { name: "The Reality Report editorial launch artwork" }),
    ).toBeVisible();
  });
});
