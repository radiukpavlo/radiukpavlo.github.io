/** Profile data access and the public profile URLs derived from the stored identifiers. */
import { getEntry } from 'astro:content';

export async function getProfile() {
  const entry = await getEntry('profile', 'main');
  if (!entry) throw new Error('src/data/profile.yaml must define "main"');
  return entry.data;
}

export async function getMetrics() {
  const entry = await getEntry('metrics', 'current');
  if (!entry) throw new Error('src/data/metrics.yaml must define "current"');
  return entry.data;
}

export async function getPartner() {
  const entry = await getEntry('partner', 'main');
  if (!entry) throw new Error('src/data/partner.yaml must define "main"');
  return entry.data;
}

type Ids = Awaited<ReturnType<typeof getProfile>>['ids'];

export interface ProfileLink {
  key: string;
  label: string;
  icon: string;
  href: string;
}

export async function getCv() {
  const entry = await getEntry('cv', 'main');
  if (!entry) throw new Error('src/data/cv.yaml must define "main"');
  return entry.data;
}

export function profileLinks(ids: Ids): ProfileLink[] {
  return [
    {
      key: 'department',
      label: 'Department profile',
      icon: 'lucide:landmark',
      href: `https://kn.khmnu.edu.ua/${ids.department}/`,
    },
    {
      key: 'scholar',
      label: 'Google Scholar',
      icon: 'academicons:google-scholar',
      href: `https://scholar.google.com/citations?user=${ids.scholar}`,
    },
    {
      key: 'orcid',
      label: 'ORCID',
      icon: 'academicons:orcid',
      href: `https://orcid.org/${ids.orcid}`,
    },
    {
      key: 'scopus',
      label: 'Scopus',
      icon: 'academicons:scopus',
      href: `https://www.scopus.com/authid/detail.uri?authorId=${ids.scopus}`,
    },
    {
      key: 'wos',
      label: 'Web of Science',
      icon: 'academicons:clarivate',
      href: `https://www.webofscience.com/wos/author/record/${ids.wos}`,
    },
    {
      key: 'linkedin',
      label: 'LinkedIn',
      icon: 'simple-icons:linkedin',
      href: `https://www.linkedin.com/in/${ids.linkedin}`,
    },
    {
      key: 'researchgate',
      label: 'ResearchGate',
      icon: 'academicons:researchgate',
      href: `https://www.researchgate.net/profile/${ids.researchgate}`,
    },
    {
      key: 'github',
      label: 'GitHub',
      icon: 'simple-icons:github',
      href: `https://github.com/${ids.github}`,
    },
  ];
}
