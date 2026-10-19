/**
 * LaTeX sources of the PDF CVs. Emitted only when CV_TEX is set (scripts/cv-latex.mjs), so the
 * regular build publishes the compiled PDFs from public/cv/ and never the sources.
 */
import type { APIRoute, GetStaticPaths } from 'astro';
import { CV_FILES, renderCv, type CvVariant } from '@/lib/cv-tex';

export const getStaticPaths = (() =>
  process.env.CV_TEX
    ? Object.entries(CV_FILES).map(([file, variant]) => ({ params: { file }, props: { variant } }))
    : []) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) =>
  new Response(await renderCv(props.variant as CvVariant), {
    headers: { 'Content-Type': 'application/x-tex; charset=utf-8' },
  });
