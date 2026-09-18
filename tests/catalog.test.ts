import { it, expect } from 'vitest';
import { loadSubmissions } from '../scripts/catalog';
import { inspectPackage } from '../packages/trust-pipeline/src/index';
it('validates every original business skill and hashes metadata plus content', async () => {
  const entries = await loadSubmissions();
  expect(entries.length).toBeGreaterThanOrEqual(5);
  const original = await inspectPackage(process.cwd(), entries[0]);
  const edited = await inspectPackage(process.cwd(), { ...entries[0], displayName:'Changed title' });
  expect(original.digest).not.toBe(edited.digest);
  expect(original.content).toContain('## Expected result');
});
