import { it,expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { parse,stringify } from 'yaml';
import { validatePublishing } from './publishing-policy';
const valid=readFileSync('.github/workflows/deploy-pages.yml','utf8');
it('accepts the scoped production publishing workflow',()=>expect(()=>validatePublishing(valid)).not.toThrow());
it.each([
  (v:any)=>{delete v.on.push.paths;},
  (v:any)=>{v.on.push.branches=['**'];},
  (v:any)=>{v.on.pull_request={};},
  (v:any)=>{v.on.push.paths.push('apps/review-desk/**');},
  (v:any)=>{delete v.jobs.deploy.needs;},
  (v:any)=>{delete v.jobs.deploy.if;},
  (v:any)=>{v.permissions={contents:'write'};},
  (v:any)=>{v.jobs.package.steps[1].with.path='.';},
  (v:any)=>{v.jobs.deploy.steps[0].uses='actions/deploy-pages@main';},
])('fails closed on unsafe publishing configuration',mutate=>{
  const value=parse(valid);mutate(value);expect(()=>validatePublishing(stringify(value))).toThrow();
});
it('rejects missing, malformed, and duplicate YAML keys',()=>{
  for(const text of ['', 'null','on: [','on: {}\non: {}'])expect(()=>validatePublishing(text)).toThrow();
});
