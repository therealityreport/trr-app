const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const context = browser.contexts()[0] ?? await browser.newContext();
  const page = context.pages()[0] ?? await context.newPage();
  const url = 'http://admin.localhost:3000/7782652f-783a-488b-8860-41b97de32e75/s6/social/w2/instagram';
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('button[aria-label="Open post detail modal"]', { timeout: 60000 });

  const firstSource = await page.evaluate(() => {
    const el = document.querySelector('[data-testid^="instagram-tag-markers-card-"]');
    if (!el) return null;
    const tid = el.getAttribute('data-testid') || '';
    const m = tid.match(/^instagram-tag-markers-card-(.+)$/);
    return m ? m[1] : null;
  });

  console.log('firstSource', firstSource);
  if (!firstSource) {
    await browser.close();
    return;
  }

  const cardButton = page.locator('button[aria-label="Open post detail modal"]', {
    has: page.locator(`[data-testid="instagram-tag-markers-card-${firstSource}"]`),
  }).first();

  await cardButton.scrollIntoViewIfNeeded();
  await cardButton.click({ timeout: 20000 });
  await page.waitForSelector('h2:has-text("Post Details")', { timeout: 20000 });
  await page.waitForTimeout(3500);

  const debug = await page.evaluate(() => {
    const drawer = document.querySelector('div.fixed.inset-0.z-50');
    const drawerText = drawer ? (drawer.textContent || '').slice(0, 700) : null;
    const allDrawerTestIds = Array.from(document.querySelectorAll('[data-testid^="instagram-tag-markers-drawer-"]')).map((n) => n.getAttribute('data-testid'));
    const allCardTestIds = Array.from(document.querySelectorAll('[data-testid^="instagram-tag-markers-card-"]')).slice(0, 10).map((n) => n.getAttribute('data-testid'));
    const images = Array.from(document.querySelectorAll('div.fixed.inset-0.z-50 img')).map((img) => ({ alt: img.getAttribute('alt'), src: img.getAttribute('src')?.slice(0,120) }));
    return { drawerExists: !!drawer, drawerText, allDrawerTestIds, allCardTestIds, images };
  });

  console.log(JSON.stringify(debug, null, 2));
  await page.keyboard.press('Escape').catch(() => {});
  await browser.close();
})();
