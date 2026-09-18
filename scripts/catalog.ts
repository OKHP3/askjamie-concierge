import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { submissionSchema, catalogSchema, findOverlaps, type Submission } from '../packages/catalog-schema/src/index';
import { assess, decisionSchema, inspectPackage, publish, publishReaudit, fresh, type Assessment } from '../packages/trust-pipeline/src/index';
import { ciscoScanner } from '../packages/trust-pipeline/src/scanner';

export const root = process.cwd();
export async function loadSubmissions(): Promise<Submission[]> {
  const raw = JSON.parse(await readFile(resolve(root, 'seed-catalog/catalog.json'), 'utf8'));
  if (!Array.isArray(raw) || raw.length === 0) throw new Error('Catalog must contain entries.');
  const entries = raw.map(v => submissionSchema.parse(v));
  if (new Set(entries.map(v => v.id)).size !== entries.length) throw new Error('Duplicate catalog id.');
  for (const entry of entries) {
    await inspectPackage(root, entry);
    if (findOverlaps(entry, entries).some(v => v.kind === 'trigger')) throw new Error('Trigger hints overlap: ' + entry.id);
  }
  return entries;
}
export async function scanCatalog(): Promise<Assessment[]> {
  const entries = await loadSubmissions();
  const scan = ciscoScanner(root);
  const assessments: Assessment[] = [];
  for (const entry of entries) {
    const result = await assess(root, entry, entries, scan);
    assessments.push(result);
    console.log(entry.id + ': ' + (result.mechanicalPassed ? 'automated gates passed' : 'findings require resolution'));
  }
  await mkdir(resolve(root, '.data'), { recursive: true });
  await writeFile(resolve(root, '.data/assessments.json'), JSON.stringify(assessments, null, 2) + '\n');
  return assessments;
}
export async function buildCatalog(reaudit = false) {
  const entries = await loadSubmissions();
  const decisions = JSON.parse(await readFile(resolve(root, 'catalog/reviews.json'), 'utf8')).map((v: unknown) => decisionSchema.parse(v));
  const assessments: Assessment[] = JSON.parse(await readFile(resolve(root, '.data/assessments.json'), 'utf8'));
  const published = [];
  for (const entry of entries) {
    const pkg = await inspectPackage(root, entry);
    const assessment = assessments.find(v => v.submission.id === entry.id);
    if (!assessment || assessment.digest !== pkg.digest || !fresh(assessment.evidence.checkedAt)) throw new Error('Run a fresh scan for ' + entry.id);
    const current = { ...assessment, submission:entry, overlaps:findOverlaps(entry, entries) };
    const item = (reaudit ? publishReaudit : publish)(current, decisions.findLast((v: { id:string; digest:string }) => v.id === entry.id && v.digest === pkg.digest));
    if (!reaudit && item.trustStatus !== 'verified') throw new Error('Catalog entry is not admitted: ' + entry.id + ' (' + item.trustStatus + ')');
    published.push(item);
  }
  const catalog = catalogSchema.parse(published);
  await writeFile(resolve(root, '.data/catalog.json'), JSON.stringify(catalog, null, 2) + '\n');
  console.log('Built ' + catalog.length + ' content-bound, reviewed entries.');
  return catalog;
}
const invoked = process.argv[1]?.replaceAll('\\', '/').endsWith('/scripts/catalog.ts');
if (invoked) {
  const mode = process.argv[2] ?? 'validate';
  if (mode === 'validate') { await loadSubmissions(); console.log('Catalog structure and trigger integrity passed.'); }
  else if (mode === 'scan') await scanCatalog();
  else if (mode === 'build') await buildCatalog();
  else throw new Error('Unknown catalog command.');
}
