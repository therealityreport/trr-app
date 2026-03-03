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

  const reqs = [];
  page.on('response', async (res) => {
    const u = res.url();
    if (u.includes('/social/analytics/posts/instagram/')) {
      reqs.push({ url: u, status: res.status() });
    }
  });

  const cardButton = page.locator('button[aria-label="Open post detail modal"]', {
    has: page.locator(`[data-testid="instagram-tag-markers-card-${firstSource}"]`),
  }).first();
  await cardButton.click({ timeout: 20000 });
  await page.waitForSelector('h2:has-text("Post Details")', { timeout: 20000 });
  await page.waitForTimeout(45000);

  const debug = await page.evaluate(() => {
    const drawer = document.querySelector('div.fixed.inset-0.z-50');
    const text = drawer ? (drawer.textContent || '').replace(/\s+/g, ' ').trim() : null;
    const hasLoading = text ? text.includes('Loading all comments...') : false;
    const hasError = text ? text.includes('Failed to load') || text.includes('HTTP') : false;
    return { text: text?.slice(0, 800), hasLoading, hasError };
  });

  console.log('firstSource', firstSource);
  console.log('responses', JSON.stringify(reqs, null, 2));
  console.log('drawer', JSON.stringify(debug, null, 2));
  await browser.close();
})();
