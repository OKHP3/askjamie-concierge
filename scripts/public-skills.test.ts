import { afterEach, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { catalogEntrySchema } from '../packages/catalog-schema/src/index';
import seeds from '../seed-catalog/catalog.json';
import { writePublicSkill } from './public-skills';

const roots: string[]=[];
afterEach(async()=>{await Promise.all(roots.splice(0).map(root=>rm(root,{recursive:true,force:true})));});
async function fixture(content: string) {
  const root=await mkdtemp(resolve(tmpdir(),'askjamie-public-skill-'));roots.push(root);
  const source=resolve(root,seeds[0].sourcePackageRef);
  await mkdir(resolve(source,'..'),{recursive:true});await writeFile(source,content);
  const packageSha256=createHash('sha256').update(content.replace(/\r\n/g,'\n')).digest('hex');
  const entry=catalogEntrySchema.parse({...seeds[0],trustStatus:'verified',trustLastCheckedAt:new Date().toISOString(),packageSha256});
  return {root,source,entry,target:resolve(root,'public')};
}
it('publishes the normalized reviewed bytes at immutable content paths across updates',async()=>{
  const first=await fixture('first reviewed instructions\r\n');
  const oldPath=await writePublicSkill(first.root,first.target,first.entry);
  expect(oldPath).toContain(first.entry.packageSha256);
  expect(await readFile(oldPath,'utf8')).toBe('first reviewed instructions\n');
  const next='second reviewed instructions\n';await writeFile(first.source,next);
  const updated={...first.entry,packageSha256:createHash('sha256').update(next).digest('hex')};
  const newPath=await writePublicSkill(first.root,first.target,updated);
  expect(newPath).not.toBe(oldPath);
  expect(await readFile(oldPath,'utf8')).toBe('first reviewed instructions\n');
  expect(await readFile(newPath,'utf8')).toBe(next);
});
it('refuses changed bytes and missing content binding before publication',async()=>{
  const value=await fixture('reviewed instructions\n');
  await writeFile(value.source,'unreviewed changes\n');
  await expect(writePublicSkill(value.root,value.target,value.entry)).rejects.toThrow(/changed before publication/);
  await expect(writePublicSkill(value.root,value.target,{...value.entry,packageSha256:undefined})).rejects.toThrow(/content-bound/);
});
