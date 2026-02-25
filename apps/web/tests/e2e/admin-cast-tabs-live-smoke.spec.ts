import { expect, test } from "@playwright/test";
import { waitForAdminReady } from "./admin-fixtures";

const LIVE_ENABLED = process.env.E2E_CAST_LIVE === "1";
const LIVE_BASE_URL = process.env.PLAYWRIGHT_BASE_URL;
const LIVE_STORAGE_STATE = process.env.PLAYWRIGHT_STORAGE_STATE;
const LIVE_SHOW_ID = process.env.E2E_CAST_SHOW_ID;
const LIVE_SEASON_NUMBER = process.env.E2E_CAST_SEASON_NUMBER ?? "6";
const LIVE_PERSON_ID = process.env.E2E_CAST_PERSON_ID;

test.describe("cast + season tabs smoke (live authenticated)", () => {
  test.beforeEach(async () => {
    test.skip(!LIVE_ENABLED, "Set E2E_CAST_LIVE=1 to run live cast smoke tests.");
    test.skip(!LIVE_BASE_URL, "Set PLAYWRIGHT_BASE_URL for live cast smoke tests.");
    test.skip(!LIVE_STORAGE_STATE, "Set PLAYWRIGHT_STORAGE_STATE for authenticated live cast smoke tests.");
    test.skip(!LIVE_SHOW_ID, "Set E2E_CAST_SHOW_ID for live cast smoke tests.");
  });

  test("show role-editor deep-link timing behavior", async ({ page }) => {
    test.skip(!LIVE_PERSON_ID, "Set E2E_CAST_PERSON_ID to validate role-editor deep-link timing.");

    await page.goto(
      `/admin/trr-shows/${LIVE_SHOW_ID}?tab=cast&cast_person=${LIVE_PERSON_ID}&cast_open_role_editor=1`
    );
    await waitForAdminReady(page);

    const dialog = page.getByRole("dialog", { name: "Assign cast roles" });
    const warning = page.getByText(
      "Role editor deep-link is waiting for cast intelligence. Retry roles and cast intelligence, then reopen."
    );

    const deepLinkOutcome = await Promise.race([
      dialog
        .waitFor({ state: "visible", timeout: 20_000 })
        .then(() => "dialog" as const)
        .catch(() => null),
      warning
        .waitFor({ state: "visible", timeout: 20_000 })
        .then(() => "warning" as const)
        .catch(() => null),
    ]);

    // In live environments, either the modal opens, or the URL stays pending with a waiting warning.
    if (deepLinkOutcome === "dialog" || (await dialog.isVisible())) {
      await expect(page).not.toHaveURL(/cast_open_role_editor=1/);
      await expect(page).not.toHaveURL(/cast_person=/);
    } else {
      await expect(page).toHaveURL(/cast_open_role_editor=1/);
      if (deepLinkOutcome === "warning") {
        await expect(warning).toBeVisible();
      }
      await expect(page).toHaveURL(/cast_open_role_editor=1/);
    }
  });

  test("show cast per-person refresh can be canceled", async ({ page }) => {
    await page.goto(`/admin/trr-shows/${LIVE_SHOW_ID}?tab=cast`);
    await waitForAdminReady(page);

    const refreshButtons = page.getByRole("button", { name: "Refresh Person" });
    const refreshCount = await refreshButtons.count();
    test.skip(refreshCount === 0, "No cast member refresh controls available for this show.");

    await refreshButtons.first().click();

    const cancelButton = page.getByRole("button", { name: "Cancel" }).first();
    let cancelVisible = true;
    try {
      await expect(cancelButton).toBeVisible({ timeout: 7_000 });
    } catch {
      cancelVisible = false;
    }

    test.skip(!cancelVisible, "Refresh finished too quickly to exercise cancel behavior.");

    await cancelButton.click();
    await expect(page.getByRole("button", { name: "Cancel" }).first()).toHaveCount(0, {
      timeout: 10_000,
    });
  });

  test("season cast sync/enrich controls and rendered/matched/total counters", async ({ page }) => {
    await page.goto(`/admin/trr-shows/${LIVE_SHOW_ID}/seasons/${LIVE_SEASON_NUMBER}?tab=cast`);
    await waitForAdminReady(page);

    const syncButton = page.getByRole("button", { name: "Sync Cast" });
    const enrichButton = page.getByRole("button", { name: "Enrich Cast & Crew Media" });

    await expect(syncButton).toBeVisible();
    await expect(enrichButton).toBeVisible();

    await expect(page.getByText(/\d+\/\d+\/\d+ cast · \d+\/\d+\/\d+ crew · \d+\/\d+\/\d+ visible/)).toBeVisible();

    await syncButton.click();
    const cancelButton = page.getByRole("button", { name: "Cancel" }).first();
    let syncRunning = true;
    try {
      await expect(cancelButton).toBeVisible({ timeout: 7_000 });
    } catch {
      syncRunning = false;
    }

    if (syncRunning) {
      await cancelButton.click();
      await expect(page.getByRole("button", { name: "Cancel" }).first()).toHaveCount(0, {
        timeout: 15_000,
      });
    }
    await expect(syncButton).toBeVisible();

    await enrichButton.click();
    let enrichRunning = true;
    try {
      await expect(page.getByRole("button", { name: "Cancel" }).first()).toBeVisible({ timeout: 7_000 });
    } catch {
      enrichRunning = false;
    }

    if (enrichRunning) {
      await page.getByRole("button", { name: "Cancel" }).first().click();
      await expect(page.getByRole("button", { name: "Cancel" }).first()).toHaveCount(0, {
        timeout: 15_000,
      });
      await expect(page.getByRole("button", { name: "Enrich Cast & Crew Media" })).toBeVisible();
    }
  });
});
