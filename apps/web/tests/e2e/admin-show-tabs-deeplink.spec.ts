import { expect, test } from "@playwright/test";
import { mockAdminApi, SHOW_ID, SHOW_SLUG, waitForAdminReady } from "./admin-fixtures";

const ASSETS_ROUTE_PATTERN = new RegExp(`/(?:${SHOW_ID}|${SHOW_SLUG})/assets(?:\\?|$)`);

test("show tab deep links preserve tab state across navigation", async ({ page }) => {
  await mockAdminApi(page);

  await page.goto(`/${SHOW_ID}/assets`);
  await waitForAdminReady(page);

  const assetsTab = page.getByRole("tab", { name: "Assets" });
  const creditsTab = page.getByRole("tab", { name: "Credits" });

  await expect(assetsTab).toHaveAttribute("aria-selected", "true");
  await expect(page).toHaveURL(ASSETS_ROUTE_PATTERN);

  await page.goto(`/${SHOW_ID}/credits`);
  await waitForAdminReady(page);
  await expect(creditsTab).toHaveAttribute("aria-selected", "true");
  await expect(page).toHaveURL(new RegExp(`/(?:${SHOW_ID}|${SHOW_SLUG})/credits(?:\\?|$)`));

  await page.goBack();
  await waitForAdminReady(page);
  await expect(page).toHaveURL(ASSETS_ROUTE_PATTERN);
  await expect(assetsTab).toHaveAttribute("aria-selected", "true");

  await page.reload();
  await waitForAdminReady(page);
  await expect(page).toHaveURL(ASSETS_ROUTE_PATTERN);
  await expect(assetsTab).toHaveAttribute("aria-selected", "true");
});
