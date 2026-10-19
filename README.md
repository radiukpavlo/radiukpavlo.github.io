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

Content lives in `src/data/` (BibTeX bibliography and YAML) and `src/content/news/` (Markdown). Every file is validated at build time, so an invalid entry fails the build. The CV PDF is rendered from the built `/cv/` page by `scripts/cv-pdf.mjs` in CI.

## Deployment

`.github/workflows/deploy.yml` checks, builds and — once the repository is public — deploys to GitHub Pages on every push to `main`. `.github/workflows/links.yml` checks links weekly and reports broken ones in the job summary.

## Requirements

- Node.js 26 (see `.nvmrc`; Astro 7 needs Node 22.22 or newer)
- npm

## License

The source code is released under the [MIT License](LICENSE). The content — texts, biographies, photographs, CV data and publication metadata — is © Pavlo Radiuk, all rights reserved. Third-party figures and logos remain under their own licenses as credited on the site.
