import { expect, test, type Page } from "@playwright/test";
import { EVIDENCE_ID, EXPIRED_EVIDENCE_ID, HISTORY_ID, IngestionOperatorFixture, OPERATOR_ORIGIN, RUN_ID } from "./instagram-ingestion-fixtures";

// Uses the existing server without launching the default numbered E2E servers.
// API responses below are browser fixtures, not authenticated backend evidence.
// Keep --output outside apps/web (for example ../../../output/playwright/ingestion)
// so Tailwind's automatic source scan does not consume traces and error contexts.
test.use({ serviceWorkers: "block" });
test.beforeEach(async ({ baseURL }) => {
  test.skip(process.env.E2E_CAST_LIVE !== "1", "Use the existing dev-local server: E2E_CAST_LIVE=1.");
  expect(baseURL, "The ingestion operator suite requires the canonical admin URL").toBe(OPERATOR_ORIGIN);
});

const panel = (page: Page) => page.getByRole("region", { name: "Durable Instagram ingestion" });
async function captureOperatorEvidence(page: Page, name: string) {
  const path = test.info().outputPath(`${name}.png`);
  await page.screenshot({ path, fullPage: true });
  await test.info().attach(name, { path, contentType: "image/png" });
}
async function launch(page: Page) {
  await page.getByRole("button", { name: "Backfill Posts", exact: true }).click();
  await page.getByLabel("Instagram backfill start month").fill("2026-01");
  await page.getByLabel("Instagram backfill end month").fill("2026-09");
  await page.getByRole("button", { name: "Refresh Capacity", exact: true }).click();
  await expect(page.getByRole("button", { name: "Start Backfill", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "Start Backfill", exact: true }).click();
}

test.describe("Instagram ingestion operator journeys (browser API fixtures)", () => {
  for (const missing of [false, true]) {
    test(`disabled rollout preserves the legacy launch surface${missing ? " when service is absent" : ""}`, async ({ page }) => {
      const fixture = new IngestionOperatorFixture();
      fixture.enabled = false; fixture.capabilitiesMissing = missing;
      await fixture.open(page);
      // Wait for the capabilities request before asserting the fallback surface.
      await expect.poll(() => fixture.reads.includes("/api/admin/instagram-ingestion/bravotv/capabilities")).toBe(true);
      await expect(panel(page)).toHaveCount(0);
      await captureOperatorEvidence(page, missing ? "legacy-service-absent" : "legacy-rollout-disabled");
      await launch(page);
      await expect.poll(() => fixture.legacyCommands.length).toBe(1);
      expect(fixture.commands).toHaveLength(0);
      await expect(panel(page)).toHaveCount(0);
      fixture.assertIsolated();
    });
  }

  test("launch, confirm cancel, resume the same run, and refresh balanced incomplete progress", async ({ page }) => {
    const fixture = new IngestionOperatorFixture();
    await fixture.open(page);
    await expect(panel(page)).toBeVisible();
    await launch(page);
    await expect(panel(page).getByText(/Run 11111111 · running/).first()).toBeVisible();
    expect(fixture.commands[0]).toMatchObject({ operation: "runs", body: { action: "backfill", source_scope: "network", selected_tasks: ["post_details", "comments", "media"], detail_worker_count: 8, comments_worker_count: 8, date_start: "2026-01-01T00:00:00.000Z" } });
    expect(fixture.commands[0].key).toBeTruthy();
    await panel(page).getByRole("button", { name: "Cancel Run", exact: true }).click();
    expect(fixture.commands.filter(command => command.operation.endsWith("/cancel"))).toHaveLength(0);
    await panel(page).getByRole("button", { name: "Confirm cancel", exact: true }).click();
    await expect(panel(page).getByText(/Run 11111111 · cancelled/).first()).toBeVisible();
    await panel(page).getByRole("button", { name: "Resume Run", exact: true }).click();
    await expect(panel(page).getByText(/Run 11111111 · running/).first()).toBeVisible();
    expect(fixture.commands.map(command => command.operation)).toEqual(["runs", `runs/${RUN_ID}/cancel`, `runs/${RUN_ID}/resume`]);
    await panel(page).getByRole("button", { name: "Refresh", exact: true }).click();
    await expect(panel(page).getByText("Discovery incomplete · total can grow")).toBeVisible();
    for (const label of ["Committed", "Cached satisfied", "Source unavailable", "Unresolved"]) await expect(panel(page).getByText(label, { exact: true })).toBeVisible();
    await expect(panel(page).getByText(/Requests 100/)).toBeVisible();
    await expect(panel(page).getByText(/All selected stages complete/)).toHaveCount(0);
    await captureOperatorEvidence(page, "balanced-incomplete-progress");
    expect(fixture.legacyCommands).toHaveLength(0);
    fixture.assertIsolated();
  });

  test("reload and a second tab recover the active run without relaunching or transferring history", async ({ page, context }) => {
    const fixture = new IngestionOperatorFixture(); fixture.seedRunning(); fixture.seedHistory();
    await fixture.open(page);
    await expect(panel(page).getByText(/Run 11111111 · running/).first()).toBeVisible();
    await page.reload();
    await expect(panel(page).getByText(/Run 11111111 · running/).first()).toBeVisible();
    await panel(page).getByRole("button", { name: /^22222222 · failed/ }).click();
    await expect(panel(page).getByText(/Run 22222222 · failed/).first()).toBeVisible();
    const second = await context.newPage();
    await fixture.open(second);
    await expect(panel(second).getByText(/Run 11111111 · running/).first()).toBeVisible();
    await panel(second).getByRole("button", { name: "Cancel Run", exact: true }).click();
    await panel(second).getByRole("button", { name: "Confirm cancel", exact: true }).click();
    await expect(panel(second).getByText(/Run 11111111 · cancelled/).first()).toBeVisible();
    await panel(page).getByRole("button", { name: "Refresh", exact: true }).click();
    await expect(page.getByLabel("Active ingestion run controls").getByText(/Active run 11111111 · cancelled/)).toBeVisible();
    await expect(panel(page).getByText(/Run 22222222 · failed/).first()).toBeVisible();
    expect(fixture.commands.map(command => command.operation)).toEqual([`runs/${RUN_ID}/cancel`]);
    expect(fixture.commands.some(command => command.operation.includes(HISTORY_ID))).toBe(false);
    fixture.assertIsolated();
    await second.close();
  });

  test("transient network loss retains the last committed snapshot and manual refresh recovers", async ({ page }) => {
    const fixture = new IngestionOperatorFixture(); fixture.seedRunning();
    await fixture.open(page);
    await expect(panel(page).getByText(/Run 11111111 · running/).first()).toBeVisible();
    fixture.failProgressRequests = 1;
    await panel(page).getByRole("button", { name: "Refresh", exact: true }).click();
    await expect(panel(page).getByRole("status")).toContainText("Showing the last committed snapshot.");
    await expect(panel(page).getByText("Discovery incomplete · total can grow")).toBeVisible();
    await expect(panel(page).getByText(/Requests 100/)).toBeVisible();
    await panel(page).getByRole("button", { name: "Refresh", exact: true }).click();
    await expect(panel(page).getByText(/Showing the last committed snapshot/)).toHaveCount(0);
    expect(fixture.commands).toHaveLength(0);
    fixture.assertIsolated();
  });

  test("an uncertain launch retry reuses its request identity and saved run", async ({ page }) => {
    const fixture = new IngestionOperatorFixture(); fixture.loseNextLaunchResponse = true;
    await fixture.open(page);
    await expect(panel(page)).toBeVisible();
    await launch(page);
    await panel(page).getByRole("button", { name: "Retry Same Launch Request", exact: true }).click();
    await expect.poll(() => fixture.commands.length).toBe(2);
    expect(fixture.commands[0].key).toBe(fixture.commands[1].key);
    expect(fixture.commands[0].body).toEqual(fixture.commands[1].body);
    expect(fixture.runs.size).toBe(1);
    await expect(panel(page).getByText(/Run 11111111 · running/).first()).toBeVisible();
    fixture.assertIsolated();
  });

  test("replay defaults to dry run, requires reviewed apply, and explains expired evidence", async ({ page }) => {
    const fixture = new IngestionOperatorFixture(); fixture.seedRunning();
    await fixture.open(page);
    await panel(page).getByText("Diagnostics and evidence replay", { exact: true }).click();
    await panel(page).getByLabel("Replay evidence").selectOption(EXPIRED_EVIDENCE_ID);
    await expect(panel(page).getByRole("button", { name: "Dry Run Replay", exact: true })).toBeDisabled();
    await expect(panel(page).getByRole("button", { name: "Apply Reviewed Replay", exact: true })).toBeDisabled();
    await panel(page).getByLabel("Replay evidence").selectOption(EVIDENCE_ID);
    await expect(panel(page).getByRole("button", { name: "Apply Reviewed Replay", exact: true })).toBeDisabled();
    await panel(page).getByRole("button", { name: "Dry Run Replay", exact: true }).click();
    await expect(panel(page).getByRole("status")).toContainText("0 writes · 0 source requests");
    expect(fixture.commands[0].body).toMatchObject({ apply: false, evidence_id: EVIDENCE_ID });
    await panel(page).getByText("Review replay comparison", { exact: true }).click();
    await expect(panel(page).locator("pre")).toContainText('"fixture": "old"');
    await panel(page).getByRole("button", { name: "Apply Reviewed Replay", exact: true }).click();
    await expect(panel(page).getByRole("status")).toContainText("1 writes · 0 source requests");
    expect(fixture.commands[1].body.apply).toBe(true);
    fixture.expireNextReplay = true;
    await panel(page).getByRole("button", { name: "Dry Run Replay", exact: true }).click();
    await expect(panel(page).getByRole("alert")).toContainText("Evidence has expired.");
    await captureOperatorEvidence(page, "expired-evidence-replay");
    fixture.assertIsolated();
  });
});
