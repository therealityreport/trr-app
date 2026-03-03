const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const context = browser.contexts()[0] ?? await browser.newContext();
  const page = context.pages()[0] ?? await context.newPage();
  await page.goto('http://admin.localhost:3000/7782652f-783a-488b-8860-41b97de32e75/s6/social/w2/instagram', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(2000);
  const info = await page.evaluate(() => ({
    title: document.title,
    h1: document.querySelector('h1')?.textContent || null,
    bodyStart: (document.body?.innerText || '').slice(0, 500),
    openModalButtons: document.querySelectorAll('button[aria-label="Open post detail modal"]').length,
    cardOverlays: document.querySelectorAll('[data-testid^="instagram-tag-markers-card-"]').length,
  }));
  console.log(JSON.stringify(info, null, 2));
  await browser.close();
})();
