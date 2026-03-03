const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const context = browser.contexts()[0] ?? await browser.newContext();
  const page = context.pages()[0] ?? await context.newPage();
  const url = 'http://admin.localhost:3000/7782652f-783a-488b-8860-41b97de32e75/s6/social/w2/instagram';

  let captured = null;
  page.on('response', async (res) => {
    const u = res.url();
    if (!u.includes('/social/analytics/posts/instagram/')) return;
    try {
      const body = await res.json();
      captured = {
        status: res.status(),
        url: u,
        source_id: body?.source_id,
        keys: Object.keys(body || {}).sort(),
        tagged_users_detail_len: Array.isArray(body?.tagged_users_detail) ? body.tagged_users_detail.length : null,
        tagged_users_detail_first: Array.isArray(body?.tagged_users_detail) && body.tagged_users_detail.length > 0
          ? body.tagged_users_detail[0]
          : null,
      };
    } catch (err) {
      captured = { status: res.status(), url: u, parseError: String(err?.message || err) };
    }
  });

  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('button[aria-label="Open post detail modal"]', { timeout: 60000 });

  const firstSource = await page.evaluate(() => {
    const el = document.querySelector('[data-testid^="instagram-tag-markers-card-"]');
    if (!el) return null;
    const tid = el.getAttribute('data-testid') || '';
    const m = tid.match(/^instagram-tag-markers-card-(.+)$/);
    return m ? m[1] : null;
  });

  const cardButton = page.locator('button[aria-label="Open post detail modal"]', {
    has: page.locator(`[data-testid="instagram-tag-markers-card-${firstSource}"]`),
  }).first();
  await cardButton.click({ timeout: 20000 });
  await page.waitForSelector('h2:has-text("Post Details")', { timeout: 20000 });
  await page.waitForTimeout(4000);

  console.log(JSON.stringify({ firstSource, captured }, null, 2));
  await browser.close();
})();
