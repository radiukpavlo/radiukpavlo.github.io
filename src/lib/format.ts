/** Formatting helpers shared by pages: dates, numbers, people and publication metadata. */
import type { CollectionEntry } from 'astro:content';

export type Publication = CollectionEntry<'publications'>;
type Person = Publication['data']['authors'][number];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** '2024-09-01' → 'Sep 2024'; '2024-09' → 'Sep 2024'; '2024' → '2024'. */
export function formatYearMonth(value: string): string {
  const [y, m] = value.split('-');
  return m ? `${MONTHS[Number(m) - 1]} ${y}` : (y ?? value);
}

/** '2026-10-14' → '14 Oct 2026' (falls back to month or year precision). */
export function formatDate(value: string): string {
  const [y, m, d] = value.split('-');
  if (!m) return y ?? value;
  return d ? `${Number(d)} ${MONTHS[Number(m) - 1]} ${y}` : `${MONTHS[Number(m) - 1]} ${y}`;
}

export function formatRange(start: string, end: string | null, open = 'present'): string {
  return `${formatYearMonth(start)} – ${end ? formatYearMonth(end) : open}`;
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat('en-GB').format(n);
}

/** 'Oleksander' → 'O.'; 'Jean-Luc' → 'J.-L.' */
export function initials(given: string): string {
  return given
    .split(/\s+/)
    .filter(Boolean)
    .map((part) =>
      part
        .split('-')
        .map((p) => `${p[0]}.`)
        .join('-'),
    )
    .join(' ');
}

export interface DisplayAuthor {
  name: string;
  self: boolean;
  mentee: boolean;
}

export function displayAuthors(pub: Publication['data']): DisplayAuthor[] {
  const mentees = new Set(pub.mentees);
  return pub.authors.map((a: Person) => ({
    name: `${initials(a.given)} ${a.family}`.trim(),
    self: a.family === 'Radiuk',
    mentee: mentees.has(a.family),
  }));
}

const TYPE_LABEL = {
  journal: 'Journal',
  conference: 'Conference',
  chapter: 'Chapter',
  preprint: 'Preprint',
} as const;

export const typeLabel = (pub: Publication['data']) => TYPE_LABEL[pub.pubtype];

const pages = (p?: string) => p?.replace(/--/g, '–');

/**
 * Venue split for citation styling: `name` is set in italics, `rest` follows it verbatim
 * (including its leading separator). E.g. AI + ' 7(9):376'; ITSSI + ' No. 1(35), pp. 79–99'.
 */
export function venueParts(pub: Publication['data']): { name: string; rest: string } {
  const pp = pub.pages ? `pp. ${pages(pub.pages)}` : '';
  switch (pub.type) {
    case 'article': {
      const eid = pub.eid ? `:${pub.eid}` : '';
      let numbering = '';
      if (pub.volume) numbering = `${pub.volume}${pub.number ? `(${pub.number})` : ''}${eid}`;
      else if (pub.number) numbering = `No. ${pub.number}${eid}`;
      else if (pub.eid) numbering = pub.eid;
      const parts = [numbering, pub.eid ? '' : pp].filter(Boolean);
      return { name: pub.journal ?? '', rest: parts.length ? ` ${parts.join(', ')}` : '' };
    }
    case 'inproceedings': {
      const series = pub.series ? `${pub.series} ${pub.volume ?? ''}`.trim() : '';
      const parts = [series, pp].filter(Boolean);
      return { name: pub.booktitle ?? '', rest: parts.length ? `, ${parts.join(', ')}` : '' };
    }
    case 'incollection': {
      const parts = [pub.publisher, pp].filter(Boolean);
      return { name: pub.booktitle ?? '', rest: parts.length ? `, ${parts.join(', ')}` : '' };
    }
    default:
      return { name: pub.publisher ?? 'Preprint', rest: ' (preprint)' };
  }
}

/** Plain venue line without year, e.g. for metadata. */
export function venueLine(pub: Publication['data']): string {
  const { name, rest } = venueParts(pub);
  return `${name}${rest}`;
}

export const doiUrl = (doi?: string) => (doi ? `https://doi.org/${doi}` : undefined);

/** Primary link for a work: DOI, else publisher URL. */
export const primaryUrl = (pub: Publication['data']) => doiUrl(pub.doi) ?? pub.url;

const LICENCES: Record<string, string> = {
  'creativecommons.org/licenses/by/4.0': 'CC BY 4.0',
  'creativecommons.org/licenses/by-nc-nd/4.0': 'CC BY-NC-ND 4.0',
};

export function licenceLabel(url?: string): string | undefined {
  if (!url) return undefined;
  const key = Object.keys(LICENCES).find((k) => url.includes(k));
  return key ? LICENCES[key] : 'Licence';
}

/** Short author credit for figure attributions: 'Borovyk et al. (2025)'. */
export function shortCredit(pub: Publication['data']): string {
  const first = pub.authors[0]?.family ?? '';
  const others =
    pub.authors.length > 2
      ? ' et al.'
      : pub.authors.length === 2
        ? ` and ${pub.authors[1]?.family}`
        : '';
  return `${first}${others} (${pub.year})`;
}

const BIB_FIELDS = [
  'title',
  'journal',
  'booktitle',
  'series',
  'volume',
  'number',
  'pages',
  'eid',
  'publisher',
  'address',
  'year',
  'doi',
  'url',
] as const;

const texEscape = (s: string) => s.replace(/([&%#_$])/g, '\\$1');

/** Clean, LaTeX-safe BibTeX for the copy button (no site-specific fields). */
export function toBibtex(entry: Publication): string {
  const pub = entry.data;
  const fields: [string, string][] = [
    ['author', pub.authors.map((a) => `${a.family}, ${a.given}`).join(' and ')],
  ];
  if (pub.editors.length)
    fields.push(['editor', pub.editors.map((a) => `${a.family}, ${a.given}`).join(' and ')]);
  for (const key of BIB_FIELDS) {
    const value = pub[key];
    if (value === undefined || value === '') continue;
    const text = String(value);
    fields.push([key, key === 'doi' || key === 'url' ? text : texEscape(text)]);
  }
  if (pub.langid) fields.push(['note', 'In Ukrainian']);
  const width = Math.max(...fields.map(([k]) => k.length));
  const body = fields.map(([k, v]) => `  ${k.padEnd(width)} = {${v}}`).join(',\n');
  return `@${pub.type}{${entry.id},\n${body}\n}`;
}

export function byYearDesc(a: Publication, b: Publication): number {
  return b.data.year - a.data.year || a.data.title.localeCompare(b.data.title);
}
