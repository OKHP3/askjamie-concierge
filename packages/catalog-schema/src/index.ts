import { z } from 'zod';

export const platforms = ['claude', 'copilot'] as const;
export type Platform = typeof platforms[number];
export const platformNames: Record<Platform, string> = { claude: 'Claude Code', copilot: 'GitHub Copilot' };

export function isCleanProse(value: string): boolean {
  return value.trim().length >= 10
    && !/[\u0000-\u001f\u007f-\u009f\u2028\u2029]/u.test(value)
    && !/[*_`~]|!?\[[^\]]*\]\s*(?:\([^)]*\)|\[[^\]]*\])|^\s*(?:#{1,6}\s|[-+]\s|\d+[.)]\s)/u.test(value)
    && !/(^|\s)[>|][+-]?(?=\s|$)|^\s*---|\bdescription\s*:|[\u0000-\u0008\u000b\u000c\u000e-\u001f]/m.test(value)
    && !/[\n\r]|<[^>]*>|\`\`\`/.test(value);
}
const prose = z.string().refine(isCleanProse, 'Use clean, single-line prose without YAML indicators or markup.').trim().min(10).max(600);
const id = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(64);
const hint = z.string().trim().min(5).max(180);
export const submissionSchema = z.object({
  id,
  displayName: z.string().trim().min(3).max(90),
  plainDescription: prose,
  triggerHints: z.array(hint).min(1).max(12).refine(v => new Set(v.map(normalize)).size === v.length, 'Trigger hints must be distinct.'),
  compatiblePlatforms: z.array(z.enum(platforms)).min(1).refine(v => new Set(v).size === v.length),
  sourcePackageRef: z.string().regex(/^(seed-catalog|contributions)\/[a-z0-9]+(?:-[a-z0-9]+)*\/SKILL\.md$/),
  contributedBy: z.string().trim().min(1).max(100).nullable(),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
}).strict().refine(v => v.sourcePackageRef.split('/')[1] === v.id, 'Package path must match the entry id.');
export type Submission = z.infer<typeof submissionSchema>;
export const catalogEntrySchema = submissionSchema.safeExtend({
  trustStatus: z.enum(['verified', 'pending-review', 'flagged', 'rejected']),
  trustLastCheckedAt: z.iso.datetime(),
  packageSha256: z.string().regex(/^[a-f0-9]{64}$/).optional(),
});
export type CatalogEntry = z.infer<typeof catalogEntrySchema>;
export const catalogSchema = z.array(catalogEntrySchema).superRefine((items, ctx) => {
  if (new Set(items.map(v => v.id)).size !== items.length) ctx.addIssue({ code: 'custom', message: 'Catalog ids must be unique.' });
});

export function normalize(value: string): string {
  return value.normalize('NFKD').toLowerCase().replace(/\p{M}/gu, '').replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
}
const stop = new Set('a an the to of and or my me i this that help please with for into from make create use'.split(' '));
export function words(value: string): Set<string> {
  return new Set(normalize(value).split(' ').filter(v => v && !stop.has(v)).map(v => v.replace(/(ing|ed|s)$/, '')));
}
export function similarity(a: string, b: string): number {
  const left = words(a), right = words(b);
  if (!left.size || !right.size) return normalize(a).length > 0 && normalize(a) === normalize(b) ? 1 : 0;
  const common = [...left].filter(v => right.has(v)).length;
  return common / new Set([...left, ...right]).size;
}
export type Overlap = { id: string; kind: 'trigger' | 'description'; similarity: number };
export function findOverlaps(entry: Submission, existing: Submission[]): Overlap[] {
  return existing.filter(v => v.id !== entry.id).flatMap<Overlap>(other => {
    const hintScore = Math.max(...entry.triggerHints.flatMap(a => other.triggerHints.map(b => similarity(a, b))));
    const descriptionScore = similarity(entry.plainDescription, other.plainDescription);
    if (hintScore >= 0.72) return [{ id: other.id, kind: 'trigger' as const, similarity: hintScore }];
    return descriptionScore >= 0.65 ? [{ id: other.id, kind: 'description' as const, similarity: descriptionScore }] : [];
  });
}
export function parseSubmission(value: unknown, existing: Submission[] = []): Submission {
  const parsed = submissionSchema.parse(value);
  if (existing.some(v => v.id === parsed.id)) throw new Error('A catalog entry with this id already exists.');
  const collisions = findOverlaps(parsed, existing).filter(v => v.kind === 'trigger');
  if (collisions.length) throw new Error('Trigger hints overlap an existing entry; revise them before ingest.');
  return parsed;
}
