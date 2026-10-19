/**
 * Generates static brand assets into public/: one 1200×630 share image per page (og/<slug>.png),
 * favicon PNGs, favicon.ico and the Apple touch icon. Re-run after adding a page or changing titles.
 * Usage: node scripts/brand-assets.mjs
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';
import sharp from 'sharp';

const PAGES = [
  {
    slug: 'home',
    title: 'Explainable AI for medical imaging, energy infrastructure and urban mobility',
    kicker: 'Research',
  },
  {
    slug: 'research',
    title: 'Research',
    kicker: 'Explainable AI · medical imaging · UAV · mobility',
  },
  {
    slug: 'publications',
    title: 'Publications',
    kicker: 'Journal articles, conference papers, chapters',
  },
  { slug: 'projects', title: 'Projects', kicker: 'Horizon Europe U_CAN and national research' },
  {
    slug: 'talks-service',
    title: 'Talks & service',
    kicker: 'Conferences, committees, peer review',
  },
  { slug: 'teaching', title: 'Teaching', kicker: 'Courses and supervision' },
  { slug: 'cv', title: 'Curriculum vitae', kicker: 'Positions, education, projects, awards' },
  {
    slug: 'partner-kit',
    title: 'Partner kit',
    kicker: 'For Horizon Europe, MSCA and EuroHPC consortia',
  },
  { slug: 'privacy', title: 'Privacy', kicker: 'How this site handles visitor data' },
];

const font = (file) =>
  `data:font/woff2;base64,${readFileSync(`public/fonts/${file}`).toString('base64')}`;
const FACES = `
  @font-face { font-family: S; font-weight: 400 600; src: url(${font('serif-latin.woff2')}) format('woff2'); }
  @font-face { font-family: S; font-style: italic; src: url(${font('serif-italic-latin.woff2')}) format('woff2'); }
  @font-face { font-family: N; font-weight: 400 600; src: url(${font('sans-latin.woff2')}) format('woff2'); }`;

const card = ({ title, kicker }) => `<!doctype html><html><head><style>${FACES}
  * { margin: 0; box-sizing: border-box; }
  body { width: 1200px; height: 630px; background: #fcfbf8; color: #1c2638; font-family: N;
         display: grid; grid-template-rows: auto 1fr auto; padding: 72px 88px 64px; position: relative; }
  body::before { content: ''; position: absolute; inset: 0 auto 0 0; width: 14px; background: #b4643c; }
  .top { display: flex; justify-content: space-between; align-items: center; font-size: 24px; color: #575f6b; letter-spacing: .04em; }
  .mark { width: 76px; height: 76px; border-radius: 8px; background: #1c2638; color: #fcfbf8; display: grid; place-items: center;
          font-family: S; font-weight: 600; font-size: 34px; }
  .main { align-self: center; }
  .kicker { font-size: 26px; color: #9a4f2a; margin-bottom: 18px; }
  h1 { font-family: S; font-weight: 600; font-size: 74px; line-height: 1.08; max-width: 920px; }
  .who { border-top: 2px solid #e5e1da; padding-top: 22px; display: flex; gap: 18px; align-items: baseline; }
  .name { font-family: S; font-weight: 600; font-size: 34px; }
  .role { font-size: 24px; color: #575f6b; }
</style></head><body>
  <div class="top"><span>radiukpavlo.github.io</span><span class="mark">PR</span></div>
  <div class="main"><p class="kicker">${kicker}</p><h1 style="font-size:${title.length > 40 ? 58 : 74}px">${title}</h1></div>
  <div class="who"><span class="name">Dr. Pavlo Radiuk</span><span class="role">Associate Professor · Khmelnytskyi National University, Ukraine</span></div>
</body></html>`;

mkdirSync('public/og', { recursive: true });
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 1,
  });
  for (const p of PAGES) {
    await page.setContent(card(p), { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    const png = await page.screenshot({ type: 'png' });
    const out = await sharp(png)
      .png({ palette: true, quality: 90, compressionLevel: 9 })
      .toBuffer();
    writeFileSync(`public/og/${p.slug}.png`, out);
    console.log(`og/${p.slug}.png ${(out.length / 1024).toFixed(1)} KB`);
  }
} finally {
  await browser.close();
}

// Favicons from the SVG master.
const svg = readFileSync('public/favicon.svg');
const png = (size) =>
  sharp(svg, { density: 384 }).resize(size, size).png({ compressionLevel: 9 }).toBuffer();
const [p32, p180, p192, p512] = await Promise.all([png(32), png(180), png(192), png(512)]);
writeFileSync('public/favicon-32.png', p32);
writeFileSync('public/apple-touch-icon.png', p180);
writeFileSync('public/icon-192.png', p192);
writeFileSync('public/icon-512.png', p512);

// favicon.ico with one PNG-compressed 32×32 image (supported by all current browsers).
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(1, 4);
const entry = Buffer.alloc(16);
entry.writeUInt8(32, 0);
entry.writeUInt8(32, 1);
entry.writeUInt16LE(1, 4);
entry.writeUInt16LE(32, 6);
entry.writeUInt32LE(p32.length, 8);
entry.writeUInt32LE(6 + 16, 12);
writeFileSync('public/favicon.ico', Buffer.concat([header, entry, p32]));
console.log(
  'favicons: favicon-32.png, apple-touch-icon.png, icon-192.png, icon-512.png, favicon.ico',
);
