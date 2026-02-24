import { expect, test } from "@playwright/test";
import { mockAdminApi, SHOW_ID } from "./admin-fixtures";

test("batch jobs modal supports keyboard escape close", async ({ page }) => {
  await mockAdminApi(page);

  await page.goto(`/admin/trr-shows/${SHOW_ID}?tab=assets`);

  const openButton = page.getByRole("button", { name: "Batch Jobs" }).first();
  await expect(openButton).toBeVisible();
  await openButton.click();

  const dialog = page.getByRole("dialog", { name: "Run image batch jobs" });
  await expect(dialog).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(openButton).toBeFocused();
});
