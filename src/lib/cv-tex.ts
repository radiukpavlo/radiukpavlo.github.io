/**
 * LaTeX sources of the two PDF CVs, generated from the same content collections as the web
 * pages so that the PDFs cannot drift from the site. Served by src/pages/cv/[file].tex.ts when
 * CV_TEX is set, and compiled by scripts/cv-latex.mjs with latex/radiuk-cv.sty.
 *
 * full      several pages: everything a partner or evaluator needs, with complete lists.
 * one-page  a single page: positions, education, projects, selected works, service, contact.
 */
import { getCollection, type CollectionEntry } from 'astro:content';
import {
  byYearDesc,
  displayAuthors,
  doiUrl,
  formatDate,
  formatNumber,
  formatYearMonth,
  formatYears,
  venueParts,
  type Publication,
} from '@/lib/format';
import { breakable, href, tex } from '@/lib/latex';
import { getCv, getMetrics, getPartner, getProfile, profileLinks } from '@/lib/profile';

export const CV_FILES = {
  'Pavlo-Radiuk-CV': 'full',
  'Pavlo-Radiuk-CV-one-page': 'one-page',
} as const;
export type CvVariant = (typeof CV_FILES)[keyof typeof CV_FILES];

const SITE = 'https://radiukpavlo.github.io';
/** Copied next to the .tex sources by scripts/cv-latex.mjs. */
const EU_EMBLEM = 'eu-funded-pos.png';

type Position = CollectionEntry<'positions'>['data'];
type Education = CollectionEntry<'education'>['data'];
type Project = CollectionEntry<'projects'>['data'];
type Service = CollectionEntry<'service'>['data'];

const PUB_GROUPS = [
  { type: 'journal', title: 'Journal articles', one: 'journal article', prefix: 'J' },
  { type: 'conference', title: 'Conference papers', one: 'conference paper', prefix: 'C' },
  { type: 'chapter', title: 'Book chapters', one: 'book chapter', prefix: 'B' },
  { type: 'preprint', title: 'Preprints', one: 'preprint', prefix: 'P' },
] as const;

/* ---------- data ---------- */

const byStart = <T extends { data: { start?: string; end: string | null } }>(a: T, b: T) =>
  (b.data.start ?? b.data.end ?? '').localeCompare(a.data.start ?? a.data.end ?? '') ||
  // Same start: an ongoing entry (no end) comes before one that has ended.
  Number(a.data.end !== null) - Number(b.data.end !== null);

async function load() {
  const [profile, metrics, partner, cv] = await Promise.all([
    getProfile(),
    getMetrics(),
    getPartner(),
    getCv(),
  ]);
  const data = <T>(entries: { data: T }[]) => entries.map((e) => e.data);
  return {
    profile,
    metrics,
    partner,
    cv,
    positions: data((await getCollection('positions')).sort(byStart)),
    education: data((await getCollection('education')).sort(byStart)),
    projects: data((await getCollection('projects')).sort(byStart)).sort(
      (a, b) => Number(b.status === 'ongoing') - Number(a.status === 'ongoing'),
    ),
    awards: data(await getCollection('awards')),
    service: data(await getCollection('service')),
    teaching: data(await getCollection('teaching')).filter((c) => c.current),
    talks: data(await getCollection('talks')).sort((a, b) => b.date.localeCompare(a.date)),
    registered: data(await getCollection('registeredWorks')).sort((a, b) => b.year - a.year),
    pubs: (await getCollection('publications')).sort(byYearDesc),
  };
}
type Data = Awaited<ReturnType<typeof load>>;

/* ---------- building blocks ---------- */

const section = (icon: string, title: string, body: string) =>
  `\\cvsection{\\${icon}}{${tex(title)}}\n${body}\n`;
const entries = (items: string[]) =>
  `\\begin{cventries}\n${items.filter(Boolean).join('\n')}\n\\end{cventries}`;
const item = (label: string, body: string) => `\\cventry{${label}}{${body}}`;
const lines = (texts: string[]) => texts.map((t) => `\\cvat{${t}}`).join('');
const bullets = (texts: string[]) =>
  texts.length
    ? `\\begin{cvbullets}\n${texts.map((t) => `\\item ${tex(t)}`).join('\n')}\n\\end{cvbullets}`
    : '';

/** 'a, b and c' (no serial comma, as in British usage). */
const joinAnd = (xs: string[]) =>
  xs.length > 1 ? `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}` : (xs[0] ?? '');

/**
 * 'Sep 2025 – present' (or '2025 – present' with `years`); the dash stays with the start, so a
 * wrap puts the end on line two.
 */
function when(start: string | undefined, end: string | null, years = false): string {
  const fmt = (v: string) => (years ? v.slice(0, 4) : formatYearMonth(v));
  const to = `\\mbox{${end ? fmt(end) : 'present'}}`;
  return start ? `\\mbox{${fmt(start)}}~– ${to}` : to;
}

/** 'International Conference … (DEXA)' → 'DEXA'; names without an acronym are kept whole. */
const acronym = (name: string) => /\(([^()]+)\)\s*$/.exec(name)?.[1] ?? name;

const updated = () =>
  new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(
    new Date(),
  );

/* ---------- shared parts ---------- */

function preamble(d: Data, variant: CvVariant): string {
  const compact = variant === 'one-page';
  const title = `${d.profile.name} — ${compact ? 'One-page CV' : 'Curriculum vitae'}`;
  const footer = compact
    ? `\\cvfooter{Updated ${updated()}}{Full CV and publication list: ${href(`${SITE}/cv/`, 'radiukpavlo.github.io/cv')}}{}`
    : `\\cvfooter{Updated ${updated()}}{${tex(d.profile.name)} · Curriculum vitae}{Page \\thepage\\ of \\pageref*{LastPage}}`;
  return [
    `\\documentclass[fontsize=${compact ? '8.6pt' : '9.5pt'}, paper=a4, parskip=false]{scrartcl}`,
    `\\usepackage[${compact ? 'compact' : ''}]{radiuk-cv}`,
    `\\hypersetup{pdftitle={${tex(title)}}, pdfauthor={${tex(d.profile.name)}}, pdfsubject={Curriculum vitae}, pdfkeywords={explainable AI, medical imaging, UAV inspection, smart mobility, Horizon Europe}}`,
    footer,
    '\\begin{document}',
  ].join('\n');
}

function header(d: Data): string {
  const { profile } = d;
  const links = profileLinks(profile.ids);
  const url = (key: string) => links.find((l) => l.key === key)?.href ?? SITE;
  const mail = (address = '') => href(`mailto:${address}`, tex(address));
  const cell = (icon: string, body: string) => `\\cvcontact{${icon}}{${body}}`;
  const phd = d.education.find((e) => e.degree === 'Ph.D.');
  const rows = [
    [
      cell('\\faEnvelope', mail(profile.emails[0]?.address)),
      cell('\\faOrcid', href(url('orcid'), tex(profile.ids.orcid))),
      cell('\\faResearchgate', href(url('researchgate'), 'ResearchGate')),
    ],
    [
      cell('\\faEnvelope[regular]', mail(profile.emails[1]?.address)),
      cell('\\faGoogleScholar', href(url('scholar'), 'Google Scholar')),
      cell('\\faLinkedin', href(url('linkedin'), 'LinkedIn')),
    ],
    [
      cell('\\faGlobe', href(SITE, 'radiukpavlo.github.io')),
      cell('\\aiicon{scopus}', href(url('scopus'), `Scopus ${tex(profile.ids.scopus)}`)),
      cell('\\faGithub', href(url('github'), `github.com/${tex(profile.ids.github)}`)),
    ],
    [
      cell('\\faBuildingColumns', href(url('department'), 'Department profile')),
      cell('\\aiicon{clarivate}', href(url('wos'), `Web of Science ${tex(profile.ids.wos)}`)),
      cell('\\faLocationDot', `${tex(profile.city)}, ${tex(profile.country)}`),
    ],
  ];
  return [
    `\\cvname{${tex(profile.name)}}`,
    `\\cvrole{${tex(profile.position)}${phd ? `\\cvsep ${tex(`${phd.degree} in ${phd.field}`)}` : ''}\\\\ ${tex(`${profile.department}, ${profile.faculty}, ${profile.university}, ${profile.country}`)}}`,
    '\\begin{cvcontacts}',
    rows.map((r) => r.join(' & ')).join(' \\\\\n'),
    '\\end{cvcontacts}',
  ].join('\n');
}

function positionItem(p: Position, full: boolean): string {
  if (!full) return item(when(p.start, p.end, true), `\\textbf{${tex(p.role)}}, ${tex(p.org)}`);
  const where = [p.unit, p.org, `${p.city}, ${p.country}`].filter(Boolean).join(', ');
  return item(
    when(p.start, p.end),
    `\\cvtitle{${tex(p.role)}}\\cvat{${tex(where)}}` +
      (p.summary ? `\\cvtext{${tex(p.summary)}}` : '') +
      bullets(p.highlights),
  );
}

function educationItem(e: Education, full: boolean): string {
  const inProgress = e.status === 'in-progress' && e.start && e.end;
  const range = inProgress ? `\\mbox{${e.start?.slice(0, 4)}}~– \\mbox{${e.end?.slice(0, 4)}}` : '';
  const label = inProgress
    ? full
      ? `${range}\\\\(expected)`
      : range
    : e.end
      ? formatYearMonth(e.end)
      : '';
  const honours = e.honours ? `, ${e.honours}` : '';
  if (!full) {
    // 'D.Sc. (Doctor of Science, habilitation level)' → 'D.Sc. (habilitation level)'
    const degree = e.degree.replace(/\([^()]*, ([^()]+)\)/, '($1)');
    return item(
      label,
      `\\textbf{${tex(degree)}}, ${tex(`${e.field}, ${e.institution}${honours}`)}` +
        (inProgress ? ', in progress' : ''),
    );
  }
  const advisor = e.advisor && (e.advisor.includes('(') ? e.advisor : `Supervisor: ${e.advisor}`);
  return item(
    label,
    `\\cvtitle{${tex(`${e.degree}, ${e.field}`)}}\\cvat{${tex(`${e.institution}, ${e.city}${honours}`)}}` +
      (e.thesis ? `\\cvtext{Thesis: \\textit{${tex(e.thesis)}}}` : '') +
      (advisor ? `\\cvat{${tex(advisor)}}` : ''),
  );
}

function projectItem(p: Project, full: boolean): string {
  const id = p.grantId
    ? `, ${p.euFunded ? 'grant agreement' : full ? 'state registration No.' : 'No.'}~${tex(p.grantId)}`
    : '';
  if (!full) {
    return item(
      when(p.start, p.end, true),
      `\\textbf{${tex(p.title)}${p.acronym ? ` (${tex(p.acronym)})` : ''}}, ${tex(p.role)}\\par ` +
        `${tex(p.euFunded ? p.programme : p.funder)}${id}` +
        (p.euFunded && p.disclaimer ? `\\cveu{${EU_EMBLEM}}{${tex(p.disclaimer)}}` : ''),
    );
  }
  const source = p.euFunded ? p.programme : `${p.funder}, ${p.programme.toLowerCase()}`;
  return item(
    when(p.start, p.end, !full),
    `\\cvtitle{${tex(p.title)}${p.acronym ? ` (${tex(p.acronym)})` : ''}}` +
      `\\cvat{${tex(source)}${id}}` +
      `\\cvat{\\textit{Role:} ${tex(p.role)}}` +
      (full ? `\\cvtext{${tex(p.summary)}}` : '') +
      (p.euFunded && p.disclaimer ? `\\cveu{${EU_EMBLEM}}{${tex(p.disclaimer)}}` : ''),
  );
}

/* ---------- publications ---------- */

function authors(pub: Publication['data']): string {
  return displayAuthors(pub)
    .map((a) => {
      const name = tex(a.name).replace(/\. /g, '.~');
      return (a.self ? `\\textbf{${name}}` : name) + (a.mentee ? '\\cvmentee{}' : '');
    })
    .join(', ');
}

function citation(pub: Publication['data'], withYear: boolean): string {
  const { name, rest } = venueParts(pub);
  const lang = pub.langid === 'ukrainian' ? ' (in Ukrainian)' : '';
  return `\\textit{${tex(name)}}${tex(rest)}${withYear ? `, ${pub.year}` : ''}${lang}.`;
}

/** DOI (else publisher page); the full CV adds open-access PDF and code links. */
function pubLinks(pub: Publication['data'], full: boolean): string {
  const out: string[] = [];
  if (pub.doi) out.push(href(doiUrl(pub.doi) ?? '', `doi:${breakable(tex(pub.doi))}`));
  else if (pub.url) out.push(href(pub.url, tex(new URL(pub.url).hostname.replace(/^www\./, ''))));
  if (full && pub.pdf) out.push(href(pub.pdf, 'PDF'));
  if (full && pub.code) out.push(href(pub.code, 'Code'));
  return out.length ? ` \\cvlinks{${out.join('\\cvsep ')}}` : '';
}

/** Full CV: title, byline, citation on three lines. One-page CV: byline and citation run on. */
const pubItem = (label: string, entry: Publication, full: boolean) =>
  item(
    label,
    `\\cvpubtitle{${tex(entry.data.title)}}${authors(entry.data)}.${full ? '\\par' : ''} ` +
      `${citation(entry.data, full)}${pubLinks(entry.data, full)}`,
  );

function pubCounts(d: Data): string {
  return joinAnd(
    PUB_GROUPS.map((g) => [g, d.pubs.filter((p) => p.data.pubtype === g.type).length] as const)
      .filter(([, n]) => n > 0)
      .map(([g, n]) => `${n} ${n === 1 ? g.one : g.title.toLowerCase()}`),
  );
}

const LEGEND = 'Own name in bold; \\cvmentee{} marks a mentored junior researcher.';

function metricsTable(m: Data['metrics']): string {
  const row = (cells: (string | number)[]) => `${cells.join(' & ')} \\\\`;
  return [
    '\\begin{cvmetrics}',
    row(
      ['Database', 'Documents', 'Citations', 'h-index', 'i10-index', 'As of'].map(
        (h) => `\\cvth{${h}}`,
      ),
    ) + ' \\midrule',
    row([
      'Google Scholar',
      '–',
      formatNumber(m.scholar.citations),
      m.scholar.h,
      m.scholar.i10,
      formatDate(m.scholar.asOf),
    ]),
    row([
      'Scopus',
      m.scopus.documents,
      formatNumber(m.scopus.citations),
      m.scopus.h,
      '–',
      formatDate(m.scopus.asOf),
    ]),
    row([
      'Web of Science Core Collection',
      m.wos.documents,
      formatNumber(m.wos.citations),
      m.wos.h,
      '–',
      formatDate(m.wos.asOf),
    ]),
    '\\end{cvmetrics}',
  ].join('\n');
}

function publicationsFull(d: Data): string {
  const intro =
    `\\cvintro{${d.pubs.length} works: ${pubCounts(d)}. ${LEGEND} ` +
    `Each work links to its DOI or publisher page, with open-access PDFs and code where available; ` +
    `the list with BibTeX is at ${href(`${SITE}/publications/`, 'radiukpavlo.github.io/publications')}.}` +
    `\\cvsubsection{Citation indicators}{each database counts its own coverage, so figures are not summed}` +
    metricsTable(d.metrics);
  const groups = PUB_GROUPS.map((g) => {
    const list = d.pubs.filter((p) => p.data.pubtype === g.type);
    if (!list.length) return '';
    return (
      `\\cvsubsection{${g.title}}{${list.length}}\n` +
      entries(list.map((p, i) => pubItem(`${g.prefix}${list.length - i}`, p, true)))
    );
  });
  return section('faBookOpen', 'Publications', intro + groups.join('\n'));
}

/* ---------- service, teaching, skills ---------- */

const venueYears = (s: Service) => tex(`${s.venue}, ${formatYears(s.years)}`);
const roleVenue = (s: Service) => tex(`${s.role}, ${s.venue}, ${formatYears(s.years)}`);
const roleShort = (s: Service) => tex(`${s.role}, ${s.short ?? s.venue}, ${formatYears(s.years)}`);
const latest = (s: Service) => Math.max(...s.years);
/** Most recent first; among equals, the longest-standing role first. */
const ofKind = (d: Data, kind: Service['kind']) =>
  d.service
    .filter((s) => s.kind === kind)
    .sort((a, b) => latest(b) - latest(a) || b.years.length - a.years.length);

const LEVELS = [
  ['phd', 'Ph.D.'],
  ['master', "Master's"],
  ['bachelor', "Bachelor's"],
] as const;

/* ---------- documents ---------- */

function fullCv(d: Data): string {
  const { cv, partner } = d;
  const academic = d.positions.filter((p) => p.sector !== 'industry');
  const industry = d.positions.filter((p) => p.sector === 'industry');
  return [
    `\\cvsummary{${tex(cv.summary.full)}}`,
    section(
      'faLightbulb',
      'Research interests',
      entries(cv.interests.map((i) => item(tex(i.title), tex(i.text)))),
    ),
    section(
      'faBriefcase',
      'Academic and research positions',
      entries(academic.map((p) => positionItem(p, true))),
    ),
    section(
      'faIndustry',
      'Industry experience',
      entries(industry.map((p) => positionItem(p, true))),
    ),
    section(
      'faGraduationCap',
      'Education',
      entries(d.education.map((e) => educationItem(e, true))),
    ),
    section('faFlask', 'Research projects', entries(d.projects.map((p) => projectItem(p, true)))),
    section(
      'faAward',
      'Awards',
      entries(
        d.awards.map((a) =>
          item(
            tex(a.years),
            `\\cvtitle{${tex(a.title)}}\\cvat{${tex(a.issuer)}}` +
              (a.description ? `\\cvtext{${tex(a.description)}}` : ''),
          ),
        ),
      ),
    ),
    section(
      'faUsers',
      'Service',
      entries([
        item(
          'Peer review',
          `${tex(d.metrics.reviews)} reviews for journals and conferences (Web of Science).`,
        ),
        item('Programme committees', lines(ofKind(d, 'programme-committee').map(venueYears))),
        item('Editorial', lines(ofKind(d, 'editorial').map(roleVenue))),
        item('Organising', lines(ofKind(d, 'organizing').map(roleVenue))),
        item('Doctoral defences', lines(ofKind(d, 'dissertation').map(roleVenue))),
        item(
          'Conference reviewing',
          `${ofKind(d, 'conference-reviewer').map(venueYears).join('; ')}.`,
        ),
      ]),
    ),
    section(
      'faChalkboardUser',
      'Teaching',
      entries(
        LEVELS.map(([level, label]) => {
          const courses = d.teaching.filter((c) => c.level === level);
          if (!courses.length) return '';
          const text = courses.map(
            (c) =>
              tex(c.title) +
              (c.language === 'en' ? ' (in English)' : '') +
              (c.url ? ` (${href(c.url, 'open course materials')})` : ''),
          );
          return item(tex(label), `${text.join('; ')}.`);
        }),
      ),
    ),
    section(
      'faCode',
      'Skills and languages',
      entries([
        ...cv.skills.map((g) =>
          item(tex(g.group), `\\cvtags{${g.items.map((s) => `\\cvtag{${tex(s)}}`).join(' ')}}`),
        ),
        item(
          'Languages',
          cv.languages.map((l) => `${tex(l.language)} — ${tex(l.level)}`).join('; ') + '.',
        ),
      ]),
    ),
    section(
      'faHandshake',
      'Collaboration',
      // The partner statement is third-person copy for proposals; the CV speaks in first person.
      '\\cvintro{I welcome partners for Horizon Europe, MSCA and EuroHPC proposals in these roles.}' +
        entries([
          ...partner.roles.map((r) => item(tex(r.title), tex(r.description))),
          item(
            'Organisation',
            `${tex(partner.picHolder)}, Participant Identification Code (PIC)~${tex(partner.pic ?? '')}. ` +
              `Capability statement, biographies and photograph: ${href(`${SITE}/partner-kit/`, 'radiukpavlo.github.io/partner-kit')}.`,
          ),
        ]),
    ),
    publicationsFull(d),
    section(
      'faCertificate',
      'Registered works',
      '\\cvintro{Copyright certificates registered in Ukraine.}' +
        entries(
          d.registered.map((w) =>
            item(
              String(w.year),
              `\\cvtitle{${tex(w.title)}}\\cvat{Certificate No.~${tex(w.certificate)}, ${tex(w.kind)}` +
                (w.coauthors.length ? `; with ${tex(joinAnd(w.coauthors))}` : '') +
                '.}',
            ),
          ),
        ),
    ),
    section(
      'faMicrophone',
      'Presentations',
      '\\cvintro{Papers and project results presented at conferences and meetings.}' +
        entries(
          d.talks.map((t) =>
            item(
              formatYearMonth(t.date),
              tex(`${t.event} (${t.short}), ${t.city}, ${t.country}.`) +
                (t.title ? `\\cvtext{\\textit{${tex(t.title)}}}` : ''),
            ),
          ),
        ),
    ),
  ].join('\n');
}

function onePageCv(d: Data): string {
  const { cv, metrics, partner } = d;
  // Home-university posts since 2022 and the current industry role; the rest is in the full CV.
  const recent = d.positions.filter((p) =>
    p.sector === 'industry' ? p.end === null : p.org === d.profile.university && p.start >= '2022',
  );
  const selected = d.pubs.filter((p) => p.data.selected);
  const english = d.teaching.filter((c) => c.language === 'en').length;
  const indicators = [
    `Google Scholar h-index ${metrics.scholar.h} (${formatNumber(metrics.scholar.citations)} citations)`,
    `Scopus h-index ${metrics.scopus.h}`,
    `Web of Science h-index ${metrics.wos.h}`,
  ].join('\\cvsep ');
  const award = (a: Data['awards'][number]) => {
    const short = acronym(a.issuer);
    return tex(`${a.title}${short !== a.issuer ? `, ${short}` : ''}, ${a.years}`);
  };
  return [
    `\\cvsummary{${tex(cv.summary.onePage)}}`,
    section('faBriefcase', 'Positions', entries(recent.map((p) => positionItem(p, false)))),
    section(
      'faGraduationCap',
      'Education',
      entries(d.education.filter((e) => e.cvOnePage).map((e) => educationItem(e, false))),
    ),
    section(
      'faFlask',
      'Research projects',
      entries(d.projects.filter((p) => p.cvOnePage).map((p) => projectItem(p, false))),
    ),
    section(
      'faBookOpen',
      'Selected publications',
      `\\cvintro{${d.pubs.length} works: ${pubCounts(d)}. ${indicators} (as of ${formatYearMonth(metrics.asOf)}). ${LEGEND}}` +
        entries(selected.map((p) => pubItem(String(p.data.year), p, false))),
    ),
    section(
      'faUsers',
      'Service and recognition',
      entries([
        item(
          'PC member',
          ofKind(d, 'programme-committee')
            .map((s) => tex(`${acronym(s.venue)} ${formatYears(s.years)}`))
            .join('\\cvsep '),
        ),
        item('Editorial', `${ofKind(d, 'editorial').map(roleShort).join('; ')}.`),
        item('Organising', `${ofKind(d, 'organizing').map(roleShort).join('; ')}.`),
        item(
          'Peer review',
          `${tex(metrics.reviews)} reviews for journals and conferences (Web of Science).`,
        ),
        item('Awards', `${d.awards.map(award).join('; ')}.`),
        item(
          'Teaching',
          `${d.teaching.length} current courses at bachelor's, master's and Ph.D. level` +
            (english ? `, ${english === 1 ? 'one' : english} taught in English` : '') +
            '.',
        ),
      ]),
    ),
    section(
      'faHandshake',
      'Collaboration',
      entries([
        item(
          'Partners',
          `Open to Horizon Europe, MSCA and EuroHPC consortia as ${tex(joinAnd(partner.roles.map((r) => r.title)))} ` +
            `(PIC~${tex(partner.pic ?? '')}). Partner kit: ${href(`${SITE}/partner-kit/`, 'radiukpavlo.github.io/partner-kit')}.`,
        ),
      ]),
    ),
  ].join('\n');
}

export async function renderCv(variant: CvVariant): Promise<string> {
  const d = await load();
  const body = variant === 'full' ? fullCv(d) : onePageCv(d);
  return `${preamble(d, variant)}\n${header(d)}\n${body}\n\\end{document}\n`;
}
