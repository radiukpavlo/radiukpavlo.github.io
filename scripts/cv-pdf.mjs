/**
 * Renders the built /cv/ page to dist/cv/Pavlo-Radiuk-CV.pdf with Playwright, so the PDF is
 * generated from the same data as the site. Run after `npm run build`.
 */
import { preview } from 'astro';
import { chromium } from 'playwright';

const PORT = 4329;
const OUT = 'dist/cv/Pavlo-Radiuk-CV.pdf';

const server = await preview({
  root: '.',
  server: { port: PORT, host: '127.0.0.1' },
  logLevel: 'warn',
});
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.emulateMedia({ media: 'print', colorScheme: 'light' });
  await page.goto(`http://127.0.0.1:${PORT}/cv/`, { waitUntil: 'networkidle' });
  await page.pdf({
    path: OUT,
    format: 'A4',
    printBackground: true,
    margin: { top: '16mm', right: '16mm', bottom: '18mm', left: '16mm' },
  });
  console.log(`Wrote ${OUT}`);
} finally {
  await browser.close();
  await server.stop();
}
