import { expect, test } from "@playwright/test";

test.describe("homepage visual smoke", () => {
  test("desktop hero keeps the brand, H1, visual anchor, and auth actions in view", async ({ page }) => {
    await page.goto("/");

    const heroHeading = page.getByRole("heading", {
      level: 1,
      name: "Reality TV, reported with a sharper eye.",
    });
    const continueButton = page.getByRole("button", { name: "Continue", exact: true });
    const googleButton = page.getByRole("button", { name: /Continue with Google/i });
    const launchArtwork = page.getByRole("region", {
      name: "The Reality Report editorial launch artwork",
    });

    await expect(heroHeading).toBeVisible();
    await expect(continueButton).toBeVisible();
    await expect(googleButton).toBeVisible();
    await expect(launchArtwork).toBeVisible();
    await expect(page.getByRole("img", { name: "The Reality Report" })).toBeVisible();

    const heroBox = await heroHeading.boundingBox();
    const continueBox = await continueButton.boundingBox();
    const artworkBox = await launchArtwork.boundingBox();

    expect(heroBox).not.toBeNull();
    expect(continueBox).not.toBeNull();
    expect(artworkBox).not.toBeNull();

    const viewport = page.viewportSize();
    expect(viewport).not.toBeNull();
    if (!heroBox || !continueBox || !artworkBox || !viewport) {
      throw new Error("Expected viewport and bounding boxes for homepage hero review.");
    }

    expect(heroBox.y).toBeLessThan(viewport.height * 0.45);
    expect(continueBox.y + continueBox.height).toBeLessThan(viewport.height);
    expect(artworkBox.y).toBeLessThan(viewport.height * 0.6);
  });

  test("mobile hero stays scannable and keeps the primary CTA above the fold", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");

    const heroHeading = page.getByRole("heading", {
      level: 1,
      name: "Reality TV, reported with a sharper eye.",
    });
    const continueButton = page.getByRole("button", { name: "Continue", exact: true });
    const memberAccessHeading = page.getByText("Log in or create your account.");

    await expect(heroHeading).toBeVisible();
    await expect(continueButton).toBeVisible();
    await expect(memberAccessHeading).toBeVisible();

    const heroBox = await heroHeading.boundingBox();
    const buttonBox = await continueButton.boundingBox();
    const memberAccessBox = await memberAccessHeading.boundingBox();
    const viewport = page.viewportSize();

    expect(heroBox).not.toBeNull();
    expect(buttonBox).not.toBeNull();
    expect(memberAccessBox).not.toBeNull();
    expect(viewport).not.toBeNull();

    if (!heroBox || !buttonBox || !memberAccessBox || !viewport) {
      throw new Error("Expected viewport and bounding boxes for mobile homepage review.");
    }

    expect(heroBox.y).toBeLessThan(memberAccessBox.y);
    expect(buttonBox.y + buttonBox.height).toBeLessThan(viewport.height);
    expect(buttonBox.y).toBeGreaterThan(memberAccessBox.y);
  });
});
