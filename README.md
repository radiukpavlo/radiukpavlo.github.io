# radiukpavlo.github.io

Source of the academic website of Dr. Pavlo Radiuk, Associate Professor of Computer Science at Khmelnytskyi National University, Ukraine. The site presents his research on explainable AI for medical imaging, UAV inspection of energy infrastructure and smart mobility, together with publications, projects, service and a partner kit for EU consortia.

The site is built with [Astro](https://astro.build) as static pages and deployed to GitHub Pages by GitHub Actions. The build contract — routes, content rules, metadata, accessibility and performance targets — is in [docs/SITE-SPEC.md](docs/SITE-SPEC.md).

## Development

```bash
npm ci               # install exact dependencies
npm run dev          # local server at http://localhost:4321
npm run check        # type-check and validate all content against src/content.config.ts
npm run build        # static build into dist/
npm run format       # format with Prettier
```

Content lives in `src/data/` (BibTeX bibliography and YAML) and `src/content/news/` (Markdown). Every file is validated at build time, so an invalid entry fails the build.

## PDF CVs

Two LaTeX CVs are generated from the same data: a full CV (`public/cv/Pavlo-Radiuk-CV.pdf`) and a one-page CV (`public/cv/Pavlo-Radiuk-CV-one-page.pdf`). `src/lib/cv-tex.ts` writes the LaTeX sources, `latex/radiuk-cv.sty` sets them in the site's typefaces and colours, and `scripts/cv-latex.mjs` compiles them with LuaLaTeX and fails if the one-page CV runs over one page. After changing CV data, rebuild and commit the PDFs:

```bash
npm run cv           # needs MiKTeX or TeX Live with LuaLaTeX, Source Serif 4, Source Sans 3, fontawesome7, academicons
```

## Maintenance tools

```bash
npm run fonts        # rebuild public/fonts from Source Serif 4 / Source Sans 3 (needs uv)
npm run assets       # regenerate share images (public/og) and favicons after adding a page
npm run review -- /  # screenshots and structural checks for the given paths (after a build)
npm run weight -- /  # transfer weight per page, gzip for text resources
npm run lighthouse -- / /publications/   # Lighthouse, mobile; reports in ./lighthouse
```

The web fonts are instanced and subsetted from the Fontsource files (SIL Open Font License 1.1). Because the original fonts reserve the name "Source", the modified files are named Radiuk Serif and Radiuk Sans; the licence texts are in `public/fonts/`.

## Deployment

`.github/workflows/deploy.yml` checks, builds and deploys to GitHub Pages on every push to `main`; publishing is skipped while the repository is private. `.github/workflows/links.yml` checks links weekly and reports broken ones in the job summary.

## Requirements

- Node.js 26 (see `.nvmrc`; Astro 7 needs Node 22.22 or newer)
- npm

## License

The source code is released under the [MIT License](LICENSE). The content — texts, biographies, photographs, CV data and publication metadata — is © Pavlo Radiuk, all rights reserved. Third-party figures and logos remain under their own licenses as credited on the site.
