/** LaTeX escaping for the PDF CVs generated from site data (src/lib/cv-tex.ts). */

const SPECIAL: Record<string, string> = {
  '\\': '\\textbackslash{}',
  '&': '\\&',
  '%': '\\%',
  $: '\\$',
  '#': '\\#',
  _: '\\_',
  '{': '\\{',
  '}': '\\}',
  '~': '\\textasciitilde{}',
  '^': '\\textasciicircum{}',
};

/** Escapes text for LaTeX and turns straight double quotes into typographic ones. */
export function tex(text: string): string {
  return text.replace(/[\\&%$#_{}~^]/g, (c) => SPECIAL[c] ?? c).replace(/"([^"]*)"/g, '“$1”');
}

/** A hyperlink; `%` and `#` are escaped so that the URL also survives inside macro arguments. */
export function href(url: string, text: string): string {
  return `\\href{${url.replace(/[%#]/g, (c) => `\\${c}`)}}{${text}}`;
}

/** Lets long identifiers shown as text (DOIs) break after slashes and dots. */
export const breakable = (escaped: string) => escaped.replace(/([/.])/g, '$1\\allowbreak{}');
