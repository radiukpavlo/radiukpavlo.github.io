/**
 * Transfer-weight report for the built site: per page, bytes by resource type with text
 * resources gzip-compressed (as GitHub Pages serves them), and the font files requested.
 * Usage: npm run build && node scripts/weight.mjs [path ...]
 */
import { gzipSync } from 'node:zlib';
import { preview } from 'astro';
import { chromium } from 'playwright';

const paths = process.argv.slice(2);
const PORT = 4332;
const TEXT = /^(text\/|application\/(javascript|json|xml)|image\/svg)/;

const server = await preview({
  root: '.',
  server: { port: PORT, host: '127.0.0.1' },
  logLevel: 'warn',
});
const browser = await chromium.launch();
try {
  for (const path of paths.length ? paths : ['/']) {
    for (const viewport of [{ width: 375, height: 812 }]) {
      const page = await browser.newPage({ viewport });
      const rows = [];
      page.on('response', async (res) => {
        const url = new URL(res.url());
        if (!url.host.startsWith('127.0.0.1')) return;
        const body = await res.body().catch(() => Buffer.alloc(0));
        const type = (res.headers()['content-type'] ?? '').split(';')[0];
        const bytes = TEXT.test(type) ? gzipSync(body).length : body.length;
        rows.push({ file: url.pathname, type, bytes });
      });
      await page.goto(`http://127.0.0.1:${PORT}${path}`, { waitUntil: 'networkidle' });
      await page.close();
      const sum = (pred) => rows.filter(pred).reduce((n, r) => n + r.bytes, 0);
      const kb = (n) => `${Math.round(n / 1024)} KB`;
      console.log(
        `${path} (mobile): total ${kb(sum(() => true))} | html ${kb(sum((r) => r.type === 'text/html'))}` +
          ` css ${kb(sum((r) => r.type === 'text/css'))} js ${kb(sum((r) => r.type.includes('javascript')))}` +
          ` fonts ${kb(sum((r) => r.file.endsWith('.woff2')))} images ${kb(sum((r) => r.type.startsWith('image/')))}`,
      );
      for (const r of rows.filter((r) => r.file.endsWith('.woff2'))) {
        console.log(`   font ${kb(r.bytes).padStart(6)}  ${r.file.split('/').pop()}`);
      }
    }
  }
} finally {
  await browser.close();
  await server.stop();
}
