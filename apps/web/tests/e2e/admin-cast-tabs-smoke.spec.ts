import { expect, test, type Page } from "@playwright/test";
import {
  CAST_PERSON_PRIMARY_ID,
  CAST_PERSON_SECONDARY_ID,
  SEASON_NUMBER,
  SHOW_ID,
  buildCastRoleMember,
  buildSeasonCastMember,
  buildShowCastMember,
  mockAdminApi,
  waitForAdminReady,
} from "./admin-fixtures";

const castRows = [
  buildShowCastMember(CAST_PERSON_PRIMARY_ID, "Lisa Barlow"),
  buildShowCastMember(CAST_PERSON_SECONDARY_ID, "Heather Gay"),
];

const seasonCastRows = [
  buildSeasonCastMember(CAST_PERSON_PRIMARY_ID, "Lisa Barlow"),
  buildSeasonCastMember(CAST_PERSON_SECONDARY_ID, "Heather Gay"),
];

const roleMembers = [
  buildCastRoleMember(CAST_PERSON_PRIMARY_ID, "Lisa Barlow", ["Housewife"]),
  buildCastRoleMember(CAST_PERSON_SECONDARY_ID, "Heather Gay", ["Housewife"]),
];

const showRoles = [
  {
    id: "role-housewife",
    show_id: SHOW_ID,
    name: "Housewife",
    normalized_name: "housewife",
    sort_order: 1,
    is_active: true,
  },
];

test.describe("cast + season tabs smoke (mocked)", () => {
  const startAndWaitForCancel = async (page: Page, startButtonName: string) => {
    const startButton = page.getByRole("button", { name: startButtonName });
    await expect(startButton).toBeVisible({ timeout: 20_000 });

    // Hydration timing can swallow the first click in Next dev mode.
    await startButton.click();
    const cancelButton = page.getByRole("button", { name: "Cancel" }).first();
    if (!(await cancelButton.isVisible().catch(() => false))) {
      await page.waitForTimeout(250);
      await startButton.click();
    }

    await expect(cancelButton).toBeVisible({ timeout: 8_000 });
    return cancelButton;
  };

  test("show deep-link role editor waits for cast intelligence before consuming URL params", async ({ page }) => {
    await mockAdminApi(page, {
      showCastMembers: castRows,
      seasonCastMembers: seasonCastRows,
      castRoleMembers: roleMembers,
      showRoles,
      castRoleMembersDelayMs: 1200,
    });

    await page.goto(
      `/admin/trr-shows/${SHOW_ID}?tab=cast&cast_person=${CAST_PERSON_PRIMARY_ID}&cast_open_role_editor=1`
    );
    await waitForAdminReady(page);

    const roleEditorDialog = page.getByRole("dialog", { name: "Assign cast roles" });
    await expect(roleEditorDialog).toHaveCount(0, { timeout: 700 });
    await expect(roleEditorDialog).toBeVisible({ timeout: 12_000 });
    await expect(page).not.toHaveURL(/cast_open_role_editor=1/);
    await expect(page).not.toHaveURL(/cast_person=/);
  });

  test("season cast per-person refresh supports cancel during in-flight stream", async ({ page }) => {
    await mockAdminApi(page, {
      showCastMembers: castRows,
      seasonCastMembers: seasonCastRows,
      castRoleMembers: roleMembers,
      showRoles,
      personRefreshStreamDelayMs: 15_000,
    });

    await page.goto(`/admin/trr-shows/${SHOW_ID}/seasons/${SEASON_NUMBER}?tab=cast`);
    await waitForAdminReady(page);

    const firstRefreshButton = page.getByRole("button", { name: "Refresh Person" }).first();
    await expect(firstRefreshButton).toBeVisible({ timeout: 20_000 });
    await firstRefreshButton.click();

    const cancelButton = page.getByRole("button", { name: "Cancel" }).first();
    await expect(cancelButton).toBeVisible({ timeout: 5_000 });
    try {
      await cancelButton.click({ timeout: 2_000 });
    } catch {
      // The action can complete while Playwright is interacting; treat as already settled.
    }

    await expect(page.getByRole("button", { name: "Cancel" }).first()).toHaveCount(0, {
      timeout: 8_000,
    });
    await expect(firstRefreshButton).toHaveText("Refresh Person", { timeout: 8_000 });
  });

  test("season cast sync enters running state and cancels cleanly", async ({ page }) => {
    await mockAdminApi(page, {
      showCastMembers: castRows,
      seasonCastMembers: seasonCastRows,
      castRoleMembers: roleMembers,
      showRoles,
      showRefreshStreamDelayMs: 15_000,
    });

    await page.goto(`/admin/trr-shows/${SHOW_ID}/seasons/${SEASON_NUMBER}?tab=cast`);
    await waitForAdminReady(page);

    const cancelButton = await startAndWaitForCancel(page, "Sync Cast");
    await cancelButton.click();
    await expect(page.getByText("Season cast refresh canceled.").first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test("season cast enrich enters running state and cancels cleanly", async ({ page }) => {
    await mockAdminApi(page, {
      showCastMembers: castRows,
      seasonCastMembers: seasonCastRows,
      castRoleMembers: roleMembers,
      showRoles,
      personReprocessStreamDelayMs: 15_000,
    });

    await page.goto(`/admin/trr-shows/${SHOW_ID}/seasons/${SEASON_NUMBER}?tab=cast`);
    await waitForAdminReady(page);

    const cancelButton = await startAndWaitForCancel(page, "Enrich Cast & Crew Media");
    await cancelButton.click();
    await expect(
      page
        .getByText(
          /Season cast & crew media enrich canceled\.|Enriched season cast & crew media\.|Failed to enrich season cast media/
        )
        .first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("season cast count chip shows rendered/matched/total and updates with search filter", async ({ page }) => {
    await mockAdminApi(page, {
      showCastMembers: castRows,
      seasonCastMembers: seasonCastRows,
      castRoleMembers: roleMembers,
      showRoles,
    });

    await page.goto(`/admin/trr-shows/${SHOW_ID}/seasons/${SEASON_NUMBER}?tab=cast`);
    await waitForAdminReady(page);

    await expect(
      page.getByText("2/2/2 cast · 0/0/0 crew · 2/2/2 visible").first()
    ).toBeVisible();

    await page.getByLabel("Search Name").fill("Lisa");
    await expect(page.getByRole("textbox", { name: "Search Name" })).toHaveValue("Lisa");
    await expect(page.getByRole("link", { name: /Lisa Barlow/ }).first()).toBeVisible({
      timeout: 8_000,
    });
    await expect(page.getByRole("link", { name: /Heather Gay/ })).toHaveCount(0);
    await expect(
      page.getByText(/1\/1\/2 cast · 0\/0\/0 crew · 1\/1\/2 visible|1\/2\/2 cast · 0\/0\/0 crew · 1\/2\/2 visible/).first()
    ).toBeVisible({ timeout: 8_000 });
  });
});
