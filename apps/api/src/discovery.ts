import { catalogSchema, platformNames, type CatalogEntry, type Platform, words } from '@askjamie/catalog-schema';
export type Match = { entry: CatalogEntry; reason: string };
const synonyms: Record<string,string> = { receipt:'expense', reimbursement:'expense', minutes:'meeting', discussion:'meeting', inbox:'email', message:'email', patch:'code', diff:'code', table:'spreadsheet', dataset:'spreadsheet', idea:'project', scope:'project' };
function tokens(value: string) { return new Set([...words(value)].map(v => synonyms[v] ?? v)); }
export function eligible(entry: CatalogEntry, platform: Platform, now = Date.now()): boolean {
  const age = now - Date.parse(entry.trustLastCheckedAt);
  return entry.trustStatus === 'verified' && age >= -60_000 && age <= 8 * 86400_000 && entry.compatiblePlatforms.includes(platform);
}
export function discover(rawCatalog: unknown, goal: string, platform: Platform, now = Date.now()): Match[] {
  const catalog = catalogSchema.parse(rawCatalog);
  if (!Object.hasOwn(platformNames, platform)) return [];
  const query = tokens(goal.slice(0,2000));
  if (query.size === 0) return [];
  const ranked = catalog.filter(v => eligible(v, platform, now)).map(entry => {
    const title = tokens(entry.displayName);
    const hints = tokens(entry.triggerHints.join(' '));
    const all = tokens(entry.plainDescription + ' ' + entry.triggerHints.join(' ') + ' ' + entry.displayName);
    const matches = [...query].filter(v => all.has(v));
    const coverage = matches.length / query.size;
    const weight = matches.reduce((n,v) => n + (title.has(v) ? 3 : hints.has(v) ? 2 : 1), 0);
    return { entry, coverage, hits:matches.length, score:coverage * 4 + weight / Math.max(query.size,3) };
  }).filter(v => v.coverage >= 0.35 && (v.hits >= 2 || query.size === 1 && v.hits === 1));
  ranked.sort((a,b) => b.score-a.score || a.entry.id.localeCompare(b.entry.id));
  if (!ranked.length) return [];
  const strong = ranked[0].coverage >= 0.65 && (!ranked[1] || ranked[0].score >= ranked[1].score * 1.3);
  return ranked.slice(0,strong ? 1 : 3).map(({entry}) => ({ entry, reason:entry.plainDescription }));
}
export async function fetchCatalog(base: string, request: typeof fetch = fetch): Promise<CatalogEntry[]> {
  const response = await request(base + 'catalog.json', { cache:'no-store' });
  if (!response.ok) throw new Error('The skill catalog is unavailable. Please try again later.');
  return catalogSchema.parse(await response.json());
}
