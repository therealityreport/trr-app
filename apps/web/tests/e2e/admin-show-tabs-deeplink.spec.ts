import { expect, test } from "@playwright/test";
import { mockAdminApi, SHOW_ID } from "./admin-fixtures";

test("show tab deep links preserve tab state across navigation", async ({ page }) => {
  await mockAdminApi(page);

  await page.goto(`/admin/trr-shows/${SHOW_ID}?tab=assets`);

  const assetsTab = page.getByRole("tab", { name: "Assets" });
  const castTab = page.getByRole("tab", { name: "Cast" });

  await expect(assetsTab).toHaveAttribute("aria-selected", "true");

  await castTab.click();
  await expect(castTab).toHaveAttribute("aria-selected", "true");
  await expect(page).toHaveURL(/\/cast\?tab=assets/);

  await page.goBack();
  await expect(page).toHaveURL(/tab=assets/);
  await expect(assetsTab).toHaveAttribute("aria-selected", "true");

  await page.reload();
  await expect(page).toHaveURL(/tab=assets/);
  await expect(assetsTab).toHaveAttribute("aria-selected", "true");
});
