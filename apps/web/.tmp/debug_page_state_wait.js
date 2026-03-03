const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const context = browser.contexts()[0] ?? await browser.newContext();
  const page = context.pages()[0] ?? await context.newPage();
  await page.goto('http://admin.localhost:3000/7782652f-783a-488b-8860-41b97de32e75/s6/social/w2/instagram', { waitUntil: 'domcontentloaded', timeout: 60000 });
  try {
    await page.waitForSelector('button[aria-label="Open post detail modal"]', { timeout: 45000 });
  } catch {}
  const info = await page.evaluate(() => ({
    hasLoadingWeek: document.body.innerText.includes('Loading week detail'),
    hasFailedWeek: document.body.innerText.includes('Failed to load week detail'),
    openModalButtons: document.querySelectorAll('button[aria-label="Open post detail modal"]').length,
    cardOverlays: document.querySelectorAll('[data-testid^="instagram-tag-markers-card-"]').length,
    bodySnippet: document.body.innerText.slice(0, 1200),
  }));
  console.log(JSON.stringify(info, null, 2));
  await browser.close();
})();
