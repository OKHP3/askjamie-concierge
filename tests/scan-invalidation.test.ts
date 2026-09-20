import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { scanCatalog } from '../scripts/catalog';
import { SCANNER_VERSION, type ScanEvidence } from '../packages/trust-pipeline/src/index';
import { ReviewService } from '../apps/api/src/review';
let root: string;
const clean = (): ScanEvidence => ({ scanner:'cisco-ai-skill-scanner', version:SCANNER_VERSION, checkedAt:new Date().toISOString(), findings:[] });
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'concierge-scan-test-'));
  await cp(resolve('seed-catalog'), join(root, 'seed-catalog'), { recursive:true });
  await mkdir(join(root, 'catalog'));
  await writeFile(join(root, 'catalog/reviews.json'), '[]');
  await scanCatalog(root, async () => clean());
});
afterEach(async () => { await rm(root, { recursive:true, force:true }); });
it('invalidates prior evidence on scanner failure and refuses review until a complete new run', async () => {
  const scan = vi.fn().mockResolvedValueOnce(clean()).mockRejectedValue(new Error('scanner unavailable'));
  await expect(scanCatalog(root, scan)).rejects.toThrow('scanner unavailable');
  await expect(readFile(join(root, '.data/assessments.json'))).rejects.toMatchObject({ code:'ENOENT' });
  await expect(new ReviewService(root).state()).rejects.toThrow();
  await scanCatalog(root, async () => clean());
  expect((await new ReviewService(root).state()).queue.length).toBeGreaterThan(0);
});
it('invalidates evidence even when catalog validation fails before scanning', async () => {
  await writeFile(join(root, 'seed-catalog/catalog.json'), '{');
  const scan = vi.fn();
  await expect(scanCatalog(root, scan)).rejects.toThrow();
  expect(scan).not.toHaveBeenCalled();
  await expect(readFile(join(root, '.data/assessments.json'))).rejects.toMatchObject({ code:'ENOENT' });
});
it('serializes scans and never exposes a partially completed run', async () => {
  let release!: () => void;
  let entered!: () => void;
  const ready = new Promise<void>(done => { entered = done; });
  const pause = new Promise<void>(done => { release = done; });
  const first = scanCatalog(root, async () => { entered(); await pause; return clean(); });
  await ready;
  try {
    await expect(readFile(join(root, '.data/assessments.json'))).rejects.toMatchObject({ code:'ENOENT' });
    await expect(scanCatalog(root, async () => clean())).rejects.toMatchObject({ code:'EEXIST' });
  } finally { release(); await first; }
  expect(JSON.parse(await readFile(join(root, '.data/assessments.json'), 'utf8')).length).toBeGreaterThan(0);
});
