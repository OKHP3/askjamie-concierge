import { copyFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { buildCatalog } from './catalog';
const catalog = await buildCatalog();
const target = resolve('apps/concierge/public');
await mkdir(target,{recursive:true});
await writeFile(resolve(target,'catalog.json'),JSON.stringify(catalog));
for(const entry of catalog) {
  const dir=resolve(target,'skills',entry.id);
  await mkdir(dir,{recursive:true});
  await copyFile(resolve(entry.sourcePackageRef),resolve(dir,'SKILL.md'));
}
const commit=process.env.GITHUB_SHA || execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
if(!/^[a-f0-9]{40}$/.test(commit))throw new Error('A full source commit is required.');
await writeFile(resolve(target,'version.json'),JSON.stringify({commit,generatedAt:new Date().toISOString(),catalogSize:catalog.length}));
