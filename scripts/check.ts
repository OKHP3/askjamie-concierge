import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { loadSubmissions } from './catalog';
import { decisionSchema, inspectPackage } from '../packages/trust-pipeline/src/index';
import { findOverlaps } from '../packages/catalog-schema/src/index';
import { validatePublishing } from './publishing-policy';
const mode=process.argv[2];
if(mode==='publishing-trigger-check')validatePublishing(await readFile('.github/workflows/deploy-pages.yml','utf8'));
else if(mode==='catalog-integrity') {
  const entries=await loadSubmissions();
  const reviews=JSON.parse(await readFile('catalog/reviews.json','utf8')).map((v:unknown)=>decisionSchema.parse(v));
  for(const entry of entries) {
    const pkg=await inspectPackage(process.cwd(),entry);
    if(!reviews.some((v:{id:string;digest:string})=>v.id===entry.id && v.digest===pkg.digest))throw new Error('A current judgment record is required for '+entry.id);
  }
} else if(mode==='structural-validation')await loadSubmissions();
else if(mode==='deduplication-check') {
  const entries=await loadSubmissions();
  for(const entry of entries)for(const overlap of findOverlaps(entry,entries))console.log(entry.id+' overlaps '+overlap.id+'; a content-bound reviewer explanation is required.');
} else if(mode==='validation-smoke') {
  for(const args of [['node_modules/typescript/bin/tsc','--noEmit'],['node_modules/vitest/vitest.mjs','run']]) {
    const result=spawnSync(process.execPath,args,{stdio:'inherit'});
    if(result.status!==0)process.exit(result.status??1);
  }
} else if(mode==='build-output') {
  for(const app of ['concierge','review-desk']) {
    const html=await readFile(resolve('apps',app,'dist/index.html'),'utf8');
    if(!html.includes('AskJamie') || !(await readdir(resolve('apps',app,'dist/assets'))).some(v=>v.endsWith('.js')))throw new Error('Missing static app output.');
  }
  const manifest=JSON.parse(await readFile('apps/concierge/dist/build-manifest.json','utf8'));
  if(!/^[a-f0-9]{40}$/.test(manifest.commit) || !manifest.files['index.html'] || !manifest.files['catalog.json'])throw new Error('Publication provenance is missing.');
  const publicFiles=await readdir('apps/concierge/dist');
  if(publicFiles.some(v=>/review|assessment|\.env/.test(v)))throw new Error('Private review artifacts cannot be published.');
} else throw new Error('Unknown validation check.');
console.log(mode+' passed.');
