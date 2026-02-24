import { expect, test } from "@playwright/test";
import { mockAdminApi, SHOW_ID, waitForAdminReady } from "./admin-fixtures";

test("show tab deep links preserve tab state across navigation", async ({ page }) => {
  await mockAdminApi(page);

  await page.goto(`/admin/trr-shows/${SHOW_ID}?tab=assets`);
  await waitForAdminReady(page);

  const assetsTab = page.getByRole("tab", { name: "Assets" });

  await expect(assetsTab).toHaveAttribute("aria-selected", "true");

  await expect(async () => {
    const castTab = page.getByRole("tab", { name: "Cast" });
    await castTab.click();
    await expect(castTab).toHaveAttribute("aria-selected", "true");
    await expect(page).toHaveURL(/\/cast\?tab=assets/);
  }).toPass({ timeout: 30_000 });

  await page.goBack();
  await waitForAdminReady(page);
  await expect(page).toHaveURL(/tab=assets/);
  await expect(assetsTab).toHaveAttribute("aria-selected", "true");

  await page.reload();
  await waitForAdminReady(page);
  await expect(page).toHaveURL(/tab=assets/);
  await expect(assetsTab).toHaveAttribute("aria-selected", "true");
});
