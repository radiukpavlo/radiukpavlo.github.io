/**
 * Dimensions citation badges, loaded lazily: the third-party script (~93 KB gzipped) is
 * requested only when a badge comes near the viewport, so pages without visible badges
 * make no request to Dimensions. Terms: free for metrics of one's own work, with
 * attribution linking to dimensions.ai on the same page.
 */
const SRC = 'https://badge.dimensions.ai/badge.js';
const SELECTOR = '.__dimensions_badge_embed__';

declare global {
  interface Window {
    __dimensions_embed?: { addBadges: () => void };
  }
}

let requested = false;

function inject(): void {
  if (requested) return;
  requested = true;
  const script = document.createElement('script');
  script.src = SRC;
  script.async = true;
  script.charset = 'utf-8';
  document.head.append(script);
}

export function loadDimensionsBadges(): void {
  const badges = document.querySelectorAll(SELECTOR);
  if (!badges.length) return;
  const observer = new IntersectionObserver(
    (entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      inject();
    },
    { rootMargin: '200px 0px' },
  );
  badges.forEach((badge) => observer.observe(badge));
}

/** Call after inserting badges dynamically (e.g., after filtering the publication list). */
export function refreshDimensionsBadges(): void {
  if (window.__dimensions_embed) window.__dimensions_embed.addBadges();
  else loadDimensionsBadges();
}
