/**
 * Builds the two PDF CVs with LuaLaTeX and copies them to public/cv/ for the next site build.
 *
 * 1. An Astro build with CV_TEX=1 renders the LaTeX sources from the site data
 *    (src/pages/cv/[file].tex.ts → src/lib/cv-tex.ts) into .cv/site/cv/.
 * 2. Each source is compiled twice with lualatex (page totals and bookmarks need a second run)
 *    next to latex/radiuk-cv.sty and the EU emblem.
 * 3. The one-page CV must stay on one page; the script fails otherwise.
 *
 * Needs a TeX distribution with LuaLaTeX, Source Serif 4, Source Sans 3, fontawesome7,
 * academicons and KOMA-Script (MiKTeX or TeX Live). Run with `npm run cv`, then commit
 * public/cv/*.pdf.
 */
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { basename, join } from 'node:path';
import { build } from 'astro';

const WORK = '.cv';
const OUT = join('public', 'cv');
const DOCUMENTS = [
  { name: 'Pavlo-Radiuk-CV', maxPages: Infinity },
  { name: 'Pavlo-Radiuk-CV-one-page', maxPages: 1 },
];
const SUPPORT = ['latex/radiuk-cv.sty', 'src/assets/eu/eu-funded-pos.png'];

process.env.CV_TEX = '1';
rmSync(WORK, { recursive: true, force: true });
await build({ outDir: join(WORK, 'site'), logLevel: 'warn' });

for (const file of SUPPORT) copyFileSync(file, join(WORK, basename(file)));
mkdirSync(OUT, { recursive: true });

for (const { name, maxPages } of DOCUMENTS) {
  copyFileSync(join(WORK, 'site', 'cv', `${name}.tex`), join(WORK, `${name}.tex`));
  for (let run = 0; run < 2; run++) {
    execFileSync(
      'lualatex',
      ['-interaction=nonstopmode', '-halt-on-error', '-file-line-error', `${name}.tex`],
      { cwd: WORK, stdio: run === 0 ? 'ignore' : 'inherit' },
    );
  }
  const aux = readFileSync(join(WORK, `${name}.aux`), 'utf8');
  const pages = Number(/\\newlabel\{LastPage\}\{\{[^}]*\}\{(\d+)\}/.exec(aux)?.[1] ?? NaN);
  if (!(pages <= maxPages)) {
    throw new Error(`${name}.pdf has ${pages} pages; the limit is ${maxPages}.`);
  }
  copyFileSync(join(WORK, `${name}.pdf`), join(OUT, `${name}.pdf`));
  console.log(`${name}.pdf: ${pages} page${pages === 1 ? '' : 's'} → ${OUT}`);
}
