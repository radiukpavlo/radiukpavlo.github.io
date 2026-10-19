// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://radiukpavlo.github.io',
  output: 'static',
  trailingSlash: 'ignore',
  build: { format: 'directory' },
  // Astro 7 defaults to JSX whitespace rules, which drop line breaks between text and
  // inline elements (e.g. "use the<a>"). Lossless HTML compression keeps prose spacing.
  compressHTML: true,
  integrations: [sitemap()],
});
