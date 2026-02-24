import { expect, test } from "@playwright/test";
import { mockAdminApi, SEASON_NUMBER, SHOW_ID, SHOW_NAME, SHOW_SLUG } from "./admin-fixtures";

test.describe("admin breadcrumbs", () => {
  test("renders single root crumb on /admin", async ({ page }) => {
    await page.goto("/admin");

    const breadcrumbNav = page.getByRole("navigation", { name: "Breadcrumb" });
    await expect(breadcrumbNav).toBeVisible();
    await expect(breadcrumbNav.getByText("Admin")).toBeVisible();
    await expect(breadcrumbNav.getByRole("link", { name: "Admin" })).toHaveCount(0);
  });

  test("renders clickable show crumb on season page", async ({ page }) => {
    await mockAdminApi(page);
    await page.goto(`/admin/trr-shows/${SHOW_ID}/seasons/${SEASON_NUMBER}`);

    const breadcrumbNav = page.getByRole("navigation", { name: "Breadcrumb" });
    await expect(breadcrumbNav).toBeVisible();
    await expect(breadcrumbNav.getByText(`Season ${SEASON_NUMBER}`)).toBeVisible();

    const showLink = breadcrumbNav.getByRole("link", { name: SHOW_NAME });
    await expect(showLink).toHaveAttribute("href", `/admin/trr-shows/${SHOW_SLUG}`);
  });
});
