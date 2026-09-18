import { describe, expect, it } from 'vitest';
import { catalogEntrySchema, catalogSchema, findOverlaps, parseSubmission, submissionSchema } from './index';
const good = { id: 'expense-report', displayName: 'Expense report', plainDescription: 'Organizes supplied receipts into a clear expense report.', triggerHints: ['format my expenses'], compatiblePlatforms: ['claude'], sourcePackageRef: 'seed-catalog/expense-report/SKILL.md', contributedBy: null, version: '1.0.0' };
describe('catalog ingest', () => {
  it('accepts clean metadata separately from trust', () => expect(parseSubmission(good)).toEqual(good));
  it.each(['', '>-', '|', '> expense details', 'description: >-', 'Readable text >- leaked', 'line one\nline two', '<script>bad</script>'])('rejects description leakage %s', plainDescription => {
    expect(submissionSchema.safeParse({ ...good, plainDescription }).success).toBe(false);
  });
  it('rejects contributor-assigned trust', () => expect(() => parseSubmission({ ...good, trustStatus: 'verified' })).toThrow());
  it('requires distinct nonempty hints', () => {
    for (const triggerHints of [[], ['same hint', 'same hint']]) expect(submissionSchema.safeParse({ ...good, triggerHints }).success).toBe(false);
  });
  it('rejects near identical hints at ingest', () => expect(() => parseSubmission({ ...good, id: 'another-report', sourcePackageRef: 'seed-catalog/another-report/SKILL.md', triggerHints: ['please format my expenses'] }, [parseSubmission(good)])).toThrow(/overlap/));
  it('flags substantial description overlap for judgment', () => {
    const other = parseSubmission({ ...good, id: 'another-report', sourcePackageRef: 'seed-catalog/another-report/SKILL.md', triggerHints: ['prepare reimbursement worksheet'] });
    expect(findOverlaps(other, [parseSubmission(good)])[0].kind).toBe('description');
  });
  it('rejects traversal, unknown fields, unsupported platforms and mismatched paths', () => {
    for (const change of [{ sourcePackageRef: '../SKILL.md' }, { sourcePackageRef: 'seed-catalog/different/SKILL.md' }, { compatiblePlatforms: ['unknown'] }, { unexpected: true }]) expect(submissionSchema.safeParse({ ...good, ...change }).success).toBe(false);
  });
  it('validates timestamps, status and unique ids', () => {
    const entry = { ...good, trustStatus: 'verified', trustLastCheckedAt: '2026-09-18T00:00:00Z' };
    expect(catalogEntrySchema.safeParse(entry).success).toBe(true);
    expect(catalogSchema.safeParse([entry, entry]).success).toBe(false);
    expect(catalogEntrySchema.safeParse({ ...entry, trustLastCheckedAt: 'yesterday' }).success).toBe(false);
  });
});
