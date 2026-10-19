/** Site-wide settings. Content data (publications, CV, talks) lives in src/data later. */
export const site = {
  url: 'https://radiukpavlo.github.io',
  name: 'Dr. Pavlo Radiuk',
  analytics: {
    /**
     * GoatCounter site code, e.g. 'radiuk' for radiuk.goatcounter.com.
     * null disables analytics entirely (no script, no Privacy-page section).
     */
    goatcounter: 'radiukpavlo' as string | null,
    /** Pinned tracker with Subresource Integrity; update both together. */
    script: 'https://gc.zgo.at/count.v5.js',
    integrity: 'sha384-atnOLvQb9t+jTSipvd75X2yginT4PjVbqDdlJAmxMm+wYElFmeR6EmLP5bYeoRVQ',
  },
};
