/**
 * Local review of the built site: screenshots at several widths and themes plus automated checks
 * (landmarks, headings, spacing defects, overflow, console errors, external requests, weight).
 * Usage: npm run build && node scripts/review.mjs <out-dir> [path ...]
 */
import { mkdirSync } from 'node:fs';
import { preview } from 'astro';
import { chromium } from 'playwright';

const [out = 'review', ...paths] = process.argv.slice(2);
const PORT = 4330;
const BASE = `http://127.0.0.1:${PORT}`;
const WIDTHS = [
  { name: '1280', width: 1280, height: 900 },
  { name: '375', width: 375, height: 812 },
];
mkdirSync(out, { recursive: true });

const server = await preview({
  root: '.',
  server: { port: PORT, host: '127.0.0.1' },
  logLevel: 'warn',
});
const browser = await chromium.launch();
try {
  for (const path of paths.length ? paths : ['/']) {
    const slug = path.replace(/\//g, '_').replace(/^_|_$/g, '') || 'home';
    for (const vp of WIDTHS) {
      for (const scheme of vp.name === '1280' ? ['light', 'dark'] : ['light']) {
        const context = await browser.newContext({ viewport: vp, colorScheme: scheme });
        const page = await context.newPage();
        const errors = [];
        const external = new Set();
        let bytes = 0;
        page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
        page.on('pageerror', (e) => errors.push(e.message));
        page.on('request', (r) => {
          const host = new URL(r.url()).host;
          if (!host.startsWith('127.0.0.1')) external.add(host);
        });
        page.on('response', async (r) => {
          const len = Number(r.headers()['content-length'] ?? 0);
          bytes += len || (await r.body().catch(() => Buffer.alloc(0))).length;
        });
        await page.goto(BASE + path, { waitUntil: 'networkidle' });
        const report = await page.evaluate(() => {
          const text = document.querySelector('main')?.innerText ?? '';
          const anomalies = [...text.matchAll(/.{0,20}( [,.;:)†]| {2,}|\( ).{0,12}/g)].map(
            (m) => m[0],
          );
          const headings = [...document.querySelectorAll('h1,h2,h3,h4')].map((h) =>
            Number(h.tagName[1]),
          );
          const skips = headings.filter((h, i) => i > 0 && h - headings[i - 1] > 1).length;
          return {
            mains: document.querySelectorAll('main').length,
            h1: headings.filter((h) => h === 1).length,
            headingSkips: skips,
            overflowX: document.documentElement.scrollWidth > window.innerWidth,
            imgsWithoutAlt: [...document.images].filter((i) => !i.hasAttribute('alt')).length,
            anomalies: anomalies.slice(0, 8),
          };
        });
        const shot = `${out}/${slug}-${vp.name}-${scheme}.png`;
        await page.screenshot({ path: shot, fullPage: true });
        console.log(
          JSON.stringify({
            path,
            vp: vp.name,
            scheme,
            kb: Math.round(bytes / 1024),
            external: [...external],
            errors,
            ...report,
          }),
        );
        if (vp.name === '375' && path === '/') {
          await page.locator('.nav-toggle').click();
          await page.screenshot({ path: `${out}/${slug}-375-menu.png` });
        }
        await context.close();
      }
    }
  }
} finally {
  await browser.close();
  await server.stop();
}
