# Site specification

The contract for building radiukpavlo.github.io. Pages are built against this document; changing a target here is a decision, not a refactor.

## Audience and message

Primary audience: coordinators and partners of EU research consortia (Horizon Europe, MSCA, EuroHPC). Secondary: editors, programme chairs, students. The home page stays deliberately sparse: name, position, a three-sentence first-person bio, research areas, selected publications, recent news and one collaboration line. No slogan and no citation statistics on the home page.

## Routes

| Route             | Purpose                                                                                                                                                                              | Data                                             |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------ |
| `/`               | Introduction (name, position, short bio, key links), three research areas, six selected publications as a list with credited thumbnails, latest four news items, collaboration line  | `profile`, `publications` (selected), `news`     |
| `/research/`      | The transition-matrix programme, the three pillars in depth, data and software                                                                                                       | `profile`, `publications` (by topic), `projects` |
| `/publications/`  | Full list: type tabs, topic filters, text search, year grouping, output-per-year chart, BibTeX copy, Dimensions badges, citation-metrics table by database (dated), registered works | `publications`, `metrics`, `registeredWorks`     |
| `/projects/`      | U_CAN with the EU emblem and disclaimer, the MES project, funding summary                                                                                                            | `projects`                                       |
| `/talks-service/` | Europe map and timeline of contributions; programme committees; conference reviewing; editorial; organising; dissertation councils; "450+ peer reviews"                              | `talks`, `service`, `metrics`                    |
| `/teaching/`      | Courses by level, the English-taught course, open courseware link                                                                                                                    | `teaching`                                       |
| `/cv/`            | Positions (academic, research, industry), education, awards; print stylesheet; PDF download                                                                                          | `positions`, `education`, `awards`, `projects`   |
| `/partner-kit/`   | Capability statement, four roles, bios (50/150/300 words) with copy buttons, headshot, KhNU PIC, contact                                                                             | `partner`, `profile`                             |
| `/privacy/`       | Hosting, statistics, citation badges, external links                                                                                                                                 | `config`                                         |
| `/404`            | Short message and links to the main pages                                                                                                                                            | —                                                |

Navigation: sticky top bar with Research, Publications, Projects, Talks & Service, Teaching, CV, Partner Kit; theme toggle at the end. The footer holds the profile icon row (Scholar, ORCID, Scopus, WoS, LinkedIn, ResearchGate, GitHub), both email addresses (assembled by script), the Privacy link and the licence note.

## Design

- Typography: Source Serif 4 (optical sizes, real italics) for headings and running text at 18 px; Source Sans 3 for interface text (navigation, labels, metadata, captions, tables).
- Palette: near-white warm background, ink-navy text, copper reserved for links and the current-page marker; dark theme from the same tokens.
- Clean and rigorous: thin rules aligned with the text column, small radii, no shadows, gradients, textures or hover motion. Publications follow the standard academic format (title, byline, italic venue, year, text links).

## Content rules

- British English in all site prose. Paper titles and event names keep their published spelling.
- Titles are date-bounded: "Associate Professor" from 1 September 2025, "Senior Lecturer" for September 2022 – August 2025. Use only titles recorded in `src/data/positions.yaml`.
- Every metric shows its database and date. Never add counts across databases. Peer review is stated as "450+".
- Talks use neutral wording ("presented at"); the map title is "Where my work was presented". No claim of in-person attendance.
- † marks a mentored junior researcher in author lists (the `mentees` field); a legend explains it wherever † appears.
- EU visibility: every page that presents U_CAN shows the "Funded by the European Union" emblem (positive on light, negative on dark) with the project's disclaimer, at least as large as any other logo on that page. No U_CAN logo; no simulated CO₂ figures.
- Thumbnails always carry their credit: figure number, authors, year, venue and licence link. The 2017 figure (CC BY-NC-ND) is shown unmodified.
- Ukrainian-language works show the English title followed by "(in Ukrainian)".
- Unpublished manuscripts, pending grant applications and projects outside the research profile are never shown.

## Metadata

- `<title>` per page: "Page — Dr. Pavlo Radiuk"; meta description 120–160 characters.
- JSON-LD `Person` on every page: name, honorific, jobTitle, affiliation (KhNU with its URL), email, `sameAs` (ORCID, Scholar, Scopus, WoS, LinkedIn, ResearchGate, GitHub), `knowsAbout` (the pillar topics). `ScholarlyArticle` items for the six selected works on the home page.
- Open Graph and Twitter card tags; one generated 1200×630 share image per page (name, page title, warm editorial palette).
- Canonical URLs, `sitemap-index.xml` (already generated), `robots.txt` pointing to it.
- Favicon set from the "PR" monogram: SVG, 32 px PNG, 180 px Apple touch icon.

## Accessibility (WCAG 2.2 AA)

- Contrast ≥ 4.5:1 for text in both themes (tokens in `src/styles/tokens.css`); decorative copper only for large text, rules and ornament.
- Visible focus on every interactive element; skip link to main content; landmarks (`header`, `nav`, `main`, `footer`).
- Theme toggle, filters and copy buttons are real `<button>`s with labels and state (`aria-pressed`, live region for "Copied").
- Map and charts carry text alternatives (a list of venues; a data table for the output chart).
- `prefers-reduced-motion` disables transitions and animations.
- Body text 17 px, line length ≤ 68 characters, no information conveyed by colour alone.

## Performance

- Lighthouse on mobile: ≥ 95 in Performance, Accessibility, Best Practices and SEO for `/`, `/publications/` and `/cv/`.
- JavaScript only as small islands: theme toggle, publication filters and search, BibTeX copy, email assembly, lazy Dimensions loader, GoatCounter. No UI framework.
- Fonts: one serif and one sans file per script subset (about 75 KB on a typical page), preloaded; no `font-size-adjust` (it doubled style-recalculation time in Chrome; layout shift stays at 0 through preloading). Stylesheets are inlined.
- Below-the-fold blocks use `content-visibility: auto` with `contain-intrinsic-size`; keyboard reachability across them is verified.
- Images through `astro:assets` (AVIF/WebP, responsive `srcset`, explicit dimensions, lazy below the fold). Fonts self-hosted with `font-display: swap`; preload only the two hero fonts.
- Europe map rendered at build time; simplify its geometry if it pushes page weight over budget.
- Page weight budget for `/`: ≤ 350 KB transferred on first load, excluding lazily loaded badges.

## Testing

- Widths 375, 768, 1280 and 1920 px in light and dark themes; no horizontal scrolling.
- `npm run check`, `npm run build` and `npm run format:check` pass before every commit.
- Text scan for spacing defects around inline elements (Astro 7 whitespace rules).
- Open-access PDF links checked in a real browser (MDPI blocks automated clients).

## Release

1. Build and review locally; the owner approves.
2. Make the repository public and enable GitHub Pages with "GitHub Actions" as the source.
3. Push to `main`; the deploy workflow builds and publishes.
4. Update the GitHub profile (bio, website field, pins, profile README) only after the site is live.
