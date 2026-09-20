import { afterEach, beforeEach, expect, it } from 'vitest';
import { mkdtemp, mkdir, readFile, writeFile, cp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { ReviewService } from './review';
import { inspectPackage, type Assessment } from '@askjamie/trust-pipeline';
import { submissionSchema } from '@askjamie/catalog-schema';
import seeds from '../../../seed-catalog/catalog.json';
let root:string,service:ReviewService,assessment:Assessment;
beforeEach(async()=>{
  root=await mkdtemp(join(tmpdir(),'concierge-review-test-'));
  await mkdir(join(root,'.data'));await mkdir(join(root,'catalog'));await mkdir(join(root,'seed-catalog'));
  await cp(resolve('seed-catalog/meeting-notes'),join(root,'seed-catalog/meeting-notes'),{recursive:true});
  const submission=submissionSchema.parse(seeds[0]);const pkg=await inspectPackage(root,submission);
  assessment={submission,digest:pkg.digest,mechanicalPassed:true,overlaps:[],evidence:{scanner:'cisco-ai-skill-scanner',version:'2.1.0',checkedAt:new Date().toISOString(),findings:[]}};
  await writeFile(join(root,'seed-catalog/catalog.json'),JSON.stringify([submission]));
  await writeFile(join(root,'catalog/reviews.json'),'[]');
  await writeFile(join(root,'.data/assessments.json'),JSON.stringify([assessment]));
  service=new ReviewService(root);
});
afterEach(async()=>{await rm(root,{recursive:true,force:true});});
function request(decision='approved'){return {id:'meeting-notes',digest:assessment.digest,decision,reviewer:'Test reviewer',rationale:'A specific, useful task with bounded inputs and inspectable outcomes.'};}
it.each(['approved','rejected'])('persists a reasoned %s decision and removes the item from the queue',async decision=>{
  expect((await service.state()).queue).toHaveLength(1);
  expect((await service.decide(request(decision))).decision).toBe(decision);
  expect((await new ReviewService(root).state()).queue).toHaveLength(0);
  expect(JSON.parse(await readFile(join(root,'catalog/reviews.json'),'utf8'))[0].reviewerKind).toBe('human');
  await expect(service.decide(request())).rejects.toThrow(/no longer/);
});
it('hides failed checks and rejects attempts to approve them',async()=>{
  assessment.mechanicalPassed=false;
  assessment.evidence.findings=[{ruleId:'test',severity:'HIGH',title:'Unsafe content'}];
  await writeFile(join(root,'.data/assessments.json'),JSON.stringify([assessment]));
  expect((await service.state()).queue).toHaveLength(0);
  expect((await service.state()).blocked).toHaveLength(1);
  await expect(service.decide(request())).rejects.toThrow();
});
it.each([
  {mechanicalPassed:'false'},
  {evidence:{scanner:'cisco-ai-skill-scanner',version:'2.1.0',checkedAt:new Date().toISOString(),findings:null}},
  {overlaps:'none'},
])('fails closed on malformed persisted evidence: %j',async change=>{
  await writeFile(join(root,'.data/assessments.json'),JSON.stringify([{...assessment,...change}]));
  await expect(service.state()).rejects.toThrow();
  await expect(service.decide(request())).rejects.toThrow();
  expect(JSON.parse(await readFile(join(root,'catalog/reviews.json'),'utf8'))).toEqual([]);
});
it('rejects a non-array assessment file before exposing a review queue',async()=>{
  await writeFile(join(root,'.data/assessments.json'),JSON.stringify(assessment));
  await expect(service.state()).rejects.toThrow(/array/);
});
it('refuses stale scans, changed packages, and injected trust fields',async()=>{
  await expect(service.decide({...request(),trustStatus:'verified'})).rejects.toThrow();
  await writeFile(join(root,'seed-catalog/meeting-notes/SKILL.md'),(await readFile(join(root,'seed-catalog/meeting-notes/SKILL.md'),'utf8'))+'\nChanged instructions.\n');
  expect((await service.state()).queue).toHaveLength(0);
  await expect(service.decide(request())).rejects.toThrow();
});
it('serializes simultaneous decisions so one review cannot overwrite another',async()=>{
  const results=await Promise.allSettled([service.decide(request()),service.decide(request('rejected'))]);
  expect(results.filter(v=>v.status==='fulfilled')).toHaveLength(1);
  expect(JSON.parse(await readFile(join(root,'catalog/reviews.json'),'utf8'))).toHaveLength(1);
});
it('blocks expired scan evidence even when its stored passed flag is true',async()=>{
  assessment.evidence.checkedAt='2020-01-01T00:00:00Z';
  await writeFile(join(root,'.data/assessments.json'),JSON.stringify([assessment]));
  expect((await service.state()).queue).toHaveLength(0);
  await expect(service.decide(request())).rejects.toThrow();
});
it('rejects executable files in an instruction-only package',async()=>{
  await writeFile(join(root,'seed-catalog/meeting-notes/setup.js'),'export const value = 1;');
  await expect(inspectPackage(root,assessment.submission)).rejects.toThrow(/instruction text only/);
  expect((await service.state()).queue).toHaveLength(0);
});
