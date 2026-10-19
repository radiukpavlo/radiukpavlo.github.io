/**
 * Content collections: every data file is validated at build time, so a typo or a missing
 * field fails the build instead of shipping. Publications come from src/data/publications.bib;
 * everything else from YAML in src/data/ and Markdown news in src/content/news/.
 */
import { defineCollection } from 'astro:content';
import { file, glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { parse as parseBibtex } from '@retorquere/bibtex-parser';

export const TOPICS = [
  'xai',
  'medical',
  'uav-energy',
  'mobility',
  'dl-methods',
  'language',
  'information-systems',
] as const;

const yearMonth = z.string().regex(/^\d{4}(-\d{2})?(-\d{2})?$/, 'Use YYYY, YYYY-MM or YYYY-MM-DD');
const url = z.url();

/* ---------- publications (BibTeX) ---------- */

function parsePublications(text: string) {
  const lib = parseBibtex(text, { raw: true, english: false, sentenceCase: false });
  if (lib.errors.length) {
    throw new Error(`publications.bib: ${lib.errors.map((e) => e.error).join('; ')}`);
  }
  return lib.entries.map(({ key, type, fields }) => {
    const { author, editor, topics, mentees, selected, ...rest } = fields as Record<
      string,
      unknown
    >;
    const people = (list: unknown) =>
      Array.isArray(list)
        ? list.map((c: { lastName?: string; firstName?: string; name?: string }) => ({
            family: c.lastName ?? c.name ?? '',
            given: c.firstName ?? '',
          }))
        : [];
    const csv = (v: unknown) =>
      typeof v === 'string'
        ? v
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : [];
    // The parser returns literal lists (publisher, address, …) as arrays; flatten them to text.
    const flat = Object.fromEntries(
      Object.entries(rest).map(([k, v]) => [k, Array.isArray(v) ? v.join(', ') : v]),
    );
    return {
      ...flat,
      id: key,
      type,
      authors: people(author),
      editors: people(editor),
      topics: csv(topics),
      mentees: csv(mentees),
      selected: selected === 'true',
    };
  });
}

const person = z.object({ family: z.string().min(1), given: z.string() });

const publications = defineCollection({
  loader: file('src/data/publications.bib', { parser: parsePublications }),
  schema: z
    .object({
      type: z.enum(['article', 'inproceedings', 'incollection', 'misc']),
      pubtype: z.enum(['journal', 'conference', 'chapter', 'preprint']),
      authors: z.array(person).min(1),
      editors: z.array(person),
      title: z.string().min(5),
      year: z.coerce.number().int().min(2015).max(2035),
      journal: z.string().optional(),
      booktitle: z.string().optional(),
      series: z.string().optional(),
      volume: z.string().optional(),
      number: z.string().optional(),
      pages: z.string().optional(),
      eid: z.string().optional(),
      publisher: z.string().optional(),
      address: z.string().optional(),
      howpublished: z.string().optional(),
      doi: z
        .string()
        .regex(/^10\.\d{4,9}\/\S+$/)
        .optional(),
      url: url.optional(),
      pdf: url.optional(),
      license: url.optional(),
      code: url.optional(),
      thumbnail: z.string().optional(),
      thumbfigure: z.string().optional(),
      note: z.string().optional(),
      langid: z.enum(['ukrainian']).optional(),
      topics: z.array(z.enum(TOPICS)).min(1),
      selected: z.boolean(),
      mentees: z.array(z.string()),
      kbid: z.string(),
    })
    .superRefine((p, ctx) => {
      if (!p.authors.some((a) => a.family === 'Radiuk')) {
        ctx.addIssue({ code: 'custom', message: 'Byline must include Radiuk' });
      }
      if (p.selected && !(p.thumbnail && p.thumbfigure && p.license)) {
        ctx.addIssue({
          code: 'custom',
          message: 'Selected works need thumbnail, thumbfigure and license',
        });
      }
      if (p.type === 'article' && !p.journal) {
        ctx.addIssue({ code: 'custom', message: '@article needs journal' });
      }
      if ((p.type === 'inproceedings' || p.type === 'incollection') && !p.booktitle) {
        ctx.addIssue({ code: 'custom', message: `@${p.type} needs booktitle` });
      }
    }),
});

/* ---------- people and career (YAML) ---------- */

const profile = defineCollection({
  loader: file('src/data/profile.yaml'),
  schema: z.object({
    name: z.string(),
    honorific: z.literal('Dr.'),
    position: z.string(),
    department: z.string(),
    faculty: z.string(),
    university: z.string(),
    universityUrl: url,
    city: z.string(),
    country: z.string(),
    tagline: z.string(),
    emails: z.array(z.object({ address: z.email(), label: z.string() })).min(1),
    ids: z.object({
      orcid: z.string().regex(/^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/),
      scopus: z.string().regex(/^\d+$/),
      wos: z.string(),
      scholar: z.string(),
      researchgate: z.string(),
      linkedin: z.string(),
      github: z.string(),
      /** Staff page slug on the Department of Computer Science website (kn.khmnu.edu.ua). */
      department: z.string(),
    }),
    bios: z.object({ short: z.string(), medium: z.string(), long: z.string() }),
    currently: z.string(),
  }),
});

const positions = defineCollection({
  loader: file('src/data/positions.yaml'),
  schema: z.object({
    role: z.string(),
    org: z.string(),
    unit: z.string().optional(),
    city: z.string(),
    country: z.string(),
    start: yearMonth,
    end: yearMonth.nullable(),
    sector: z.enum(['academic', 'industry', 'research']),
    summary: z.string().optional(),
    highlights: z.array(z.string()).default([]),
  }),
});

const education = defineCollection({
  loader: file('src/data/education.yaml'),
  schema: z.object({
    degree: z.string(),
    field: z.string(),
    institution: z.string(),
    city: z.string(),
    start: yearMonth.optional(),
    end: yearMonth.nullable(),
    status: z.enum(['completed', 'in-progress']),
    thesis: z.string().optional(),
    advisor: z.string().optional(),
    honours: z.string().optional(),
  }),
});

const projects = defineCollection({
  loader: file('src/data/projects.yaml'),
  schema: z.object({
    title: z.string(),
    acronym: z.string().optional(),
    funder: z.string(),
    programme: z.string(),
    grantId: z.string().optional(),
    role: z.string(),
    start: yearMonth,
    end: yearMonth.nullable(),
    status: z.enum(['ongoing', 'completed']),
    euFunded: z.boolean(),
    /** Horizon Europe visibility rules: shown next to the EU emblem whenever euFunded is true. */
    disclaimer: z.string().optional(),
    url: url.optional(),
    summary: z.string(),
    topics: z.array(z.enum(TOPICS)).default([]),
  }),
});

const service = defineCollection({
  loader: file('src/data/service.yaml'),
  schema: z.object({
    kind: z.enum([
      'programme-committee',
      'conference-reviewer',
      'editorial',
      'organizing',
      'dissertation',
    ]),
    venue: z.string(),
    /** Short venue name for the one-page CV. */
    short: z.string().optional(),
    role: z.string(),
    years: z.array(z.number().int().min(2015).max(2035)).min(1),
    url: url.optional(),
    note: z.string().optional(),
  }),
});

const talks = defineCollection({
  loader: file('src/data/talks.yaml'),
  schema: z.object({
    event: z.string(),
    short: z.string(),
    city: z.string(),
    country: z.string(),
    lat: z.number().min(-90).max(90),
    lon: z.number().min(-180).max(180),
    date: yearMonth,
    kind: z.enum(['paper', 'invited', 'presentation']),
    title: z.string().optional(),
    publications: z.array(z.string()).default([]),
    slides: url.optional(),
    video: url.optional(),
  }),
});

const teaching = defineCollection({
  loader: file('src/data/teaching.yaml'),
  schema: z.object({
    title: z.string(),
    level: z.enum(['bachelor', 'master', 'phd']),
    language: z.enum(['uk', 'en']),
    current: z.boolean(),
    url: url.optional(),
    note: z.string().optional(),
  }),
});

const awards = defineCollection({
  loader: file('src/data/awards.yaml'),
  schema: z.object({
    title: z.string(),
    issuer: z.string(),
    years: z.string(),
    url: url.optional(),
    description: z.string().optional(),
  }),
});

const registeredWorks = defineCollection({
  loader: file('src/data/registered-works.yaml'),
  schema: z.object({
    certificate: z.string(),
    title: z.string(),
    kind: z.enum(['computer program', 'scientific work', 'methodological work']),
    year: z.number().int(),
    coauthors: z.array(z.string()),
  }),
});

const metrics = defineCollection({
  loader: file('src/data/metrics.yaml'),
  schema: z.object({
    asOf: yearMonth,
    scholar: z.object({ citations: z.number(), h: z.number(), i10: z.number(), asOf: yearMonth }),
    scopus: z.object({
      documents: z.number(),
      citations: z.number(),
      h: z.number(),
      asOf: yearMonth,
    }),
    wos: z.object({ documents: z.number(), citations: z.number(), h: z.number(), asOf: yearMonth }),
    reviews: z.string(),
  }),
});

const partner = defineCollection({
  loader: file('src/data/partner.yaml'),
  schema: z.object({
    statement: z.string(),
    roles: z.array(z.object({ title: z.string(), description: z.string() })).min(1),
    pic: z.string().nullable(),
    picHolder: z.string(),
  }),
});

/** Text used only by the PDF CVs; all other CV content comes from the collections above. */
const cv = defineCollection({
  loader: file('src/data/cv.yaml'),
  schema: z.object({
    summary: z.object({ full: z.string(), onePage: z.string() }),
    interests: z.array(z.object({ title: z.string(), text: z.string() })).min(1),
    skills: z.array(z.object({ group: z.string(), items: z.array(z.string()).min(1) })),
    languages: z.array(z.object({ language: z.string(), level: z.string() })),
  }),
});

const news = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/news' }),
  schema: z.object({
    date: z.coerce.date(),
    title: z.string(),
    link: url.optional(),
  }),
});

export const collections = {
  publications,
  profile,
  positions,
  education,
  projects,
  service,
  talks,
  teaching,
  awards,
  registeredWorks,
  metrics,
  partner,
  cv,
  news,
};
