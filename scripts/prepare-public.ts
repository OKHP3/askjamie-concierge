import { mkdir, writeFile, rm } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import { execFileSync } from 'node:child_process';
import { buildCatalog } from './catalog';
import { writePublicSkill } from './public-skills';
const catalog = await buildCatalog(process.argv.includes('--reaudit'));
const target = resolve('apps/concierge/public');
await mkdir(target,{recursive:true});
const skillOutput = resolve(target, 'skills');
if (relative(target, skillOutput) !== 'skills') throw new Error('Unexpected generated skill directory.');
await rm(skillOutput, { recursive:true, force:true });
await writeFile(resolve(target,'catalog.json'),JSON.stringify(catalog));
for(const entry of catalog.filter(v=>v.trustStatus === 'verified')) {
  await writePublicSkill(process.cwd(), target, entry);
}
const commit=process.env.GITHUB_SHA || execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
if(!/^[a-f0-9]{40}$/.test(commit))throw new Error('A full source commit is required.');
await writeFile(resolve(target,'version.json'),JSON.stringify({commit,generatedAt:new Date().toISOString(),catalogSize:catalog.length}));
