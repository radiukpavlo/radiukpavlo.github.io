/**
 * Lighthouse (mobile, default throttling) for the built site, served by `astro preview`.
 * Prints category scores, core metrics and failing audits per page; JSON reports go to out-dir.
 * Usage: npm run build && node scripts/lighthouse.mjs <out-dir> [path ...]
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { preview } from 'astro';
import lighthouse from 'lighthouse';
import { chromium } from 'playwright';

const [out = 'lighthouse', ...paths] = process.argv.slice(2);
const PORT = 4333;
const DEBUG_PORT = 9333;
mkdirSync(out, { recursive: true });

const server = await preview({
  root: '.',
  server: { port: PORT, host: '127.0.0.1' },
  logLevel: 'warn',
});
// Playwright launches Chromium reliably on all platforms; Lighthouse attaches via the debug port.
const browser = await chromium.launch({ args: [`--remote-debugging-port=${DEBUG_PORT}`] });
try {
  for (const path of paths.length ? paths : ['/']) {
    const slug = path.replace(/\//g, '_').replace(/^_|_$/g, '') || 'home';
    const result = await lighthouse(`http://127.0.0.1:${PORT}${path}`, {
      port: DEBUG_PORT,
      output: 'json',
      logLevel: 'error',
    });
    if (!result) throw new Error(`No Lighthouse result for ${path}`);
    writeFileSync(`${out}/${slug}.json`, result.report);
    const { lhr } = result;
    const scores = Object.values(lhr.categories)
      .map((c) => `${c.title} ${Math.round((c.score ?? 0) * 100)}`)
      .join(' · ');
    console.log(`${path}: ${scores}`);
    const metric = (id) => lhr.audits[id]?.displayValue ?? '?';
    console.log(
      `   FCP ${metric('first-contentful-paint')} · LCP ${metric('largest-contentful-paint')} · TBT ${metric('total-blocking-time')} · CLS ${metric('cumulative-layout-shift')}`,
    );
    const failing = Object.values(lhr.audits).filter(
      (a) =>
        a.score !== null &&
        a.score < 0.9 &&
        !['informative', 'manual', 'notApplicable'].includes(a.scoreDisplayMode),
    );
    for (const a of failing.slice(0, 12)) {
      console.log(`   x ${a.id}: ${a.title}${a.displayValue ? ` (${a.displayValue})` : ''}`);
    }
  }
} finally {
  await browser.close();
  await server.stop();
}
