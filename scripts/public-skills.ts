import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { CatalogEntry } from '../packages/catalog-schema/src/index';
import { applicationGuide } from '../apps/api/src/application';

/** Publish captured, reviewed bytes at a content-addressed path. */
export async function writePublicSkill(root: string, target: string, entry: CatalogEntry) {
  const guide = applicationGuide(entry, entry.compatiblePlatforms[0]);
  const content = new TextDecoder('utf-8', { fatal: true })
    .decode(await readFile(resolve(root, entry.sourcePackageRef))).replace(/\r\n/g, '\n');
  if (createHash('sha256').update(content).digest('hex') !== entry.packageSha256) {
    throw new Error('The reviewed skill changed before publication: ' + entry.id);
  }
  const destination = resolve(target, guide.downloadPath);
  await mkdir(resolve(destination, '..'), { recursive: true });
  await writeFile(destination, content);
  return destination;
}
