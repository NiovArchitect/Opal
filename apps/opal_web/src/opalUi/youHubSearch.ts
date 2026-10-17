/**
 * Repair #17 W5 — YOU hub settings search (SETTINGS_MAP next increment).
 *
 * Pure filter over the hub's real destinations: a row appears only when
 * the query matches its section label, title, or subtitle, and tapping a
 * result navigates to that same destination (the hub's existing
 * onClick). Search invents nothing — destinations that are hidden from
 * the hub stay unsearchable, and an empty result renders the hub's
 * honest "no settings match" state.
 */

export type YouHubSearchRow = {
  key: string;
  title: string;
  subtitle: string;
};

export type YouHubSearchSection<R extends YouHubSearchRow> = {
  id: string;
  label: string;
  rows: R[];
};

export function normalizeYouHubQuery(query: string): string {
  return query.trim().toLowerCase().replace(/\s+/g, " ");
}

export function youHubRowMatches<R extends YouHubSearchRow>(
  sectionLabel: string,
  row: R,
  normalizedQuery: string,
): boolean {
  if (!normalizedQuery) return true;
  const haystack = `${sectionLabel} ${row.title} ${row.subtitle}`.toLowerCase();
  return normalizedQuery
    .split(" ")
    .every((token) => haystack.includes(token));
}

export function filterYouHubSections<R extends YouHubSearchRow>(
  sections: YouHubSearchSection<R>[],
  query: string,
): YouHubSearchSection<R>[] {
  const q = normalizeYouHubQuery(query);
  if (!q) return sections;
  const out: YouHubSearchSection<R>[] = [];
  for (const section of sections) {
    const rows = section.rows.filter((row) => youHubRowMatches(section.label, row, q));
    if (rows.length) out.push({ ...section, rows });
  }
  return out;
}
