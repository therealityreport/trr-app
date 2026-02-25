import { expect, test } from "@playwright/test";
import { mockAdminApi, SHOW_ID, waitForAdminReady } from "./admin-fixtures";

const ASSETS_ROUTE_PATTERN = /\/(assets|media-gallery|media)(\?|$)|\?tab=assets/;

test("show tab deep links preserve tab state across navigation", async ({ page }) => {
  await mockAdminApi(page);

  await page.goto(`/shows/${SHOW_ID}/media`);
  await waitForAdminReady(page);

  const assetsTab = page.getByRole("tab", { name: "Assets" });
  const castTab = page.getByRole("tab", { name: "Cast" });

  await expect(assetsTab).toHaveAttribute("aria-selected", "true");
  await expect(page).toHaveURL(ASSETS_ROUTE_PATTERN);

  await page.goto(`/shows/${SHOW_ID}/cast`);
  await waitForAdminReady(page);
  await expect(castTab).toHaveAttribute("aria-selected", "true");
  await expect(page).toHaveURL(/\/cast(\?|$)/);

  await page.goBack();
  await waitForAdminReady(page);
  await expect(page).toHaveURL(ASSETS_ROUTE_PATTERN);
  await expect(assetsTab).toHaveAttribute("aria-selected", "true");

  await page.reload();
  await waitForAdminReady(page);
  await expect(page).toHaveURL(ASSETS_ROUTE_PATTERN);
  await expect(assetsTab).toHaveAttribute("aria-selected", "true");
});
