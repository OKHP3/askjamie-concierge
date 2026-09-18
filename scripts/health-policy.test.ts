import { it,expect } from 'vitest';
import { createHash } from 'node:crypto';
import { nextHealth,checkLiveSite,type HealthState } from './health-policy';
it('opens an incident only on the third consecutive scheduled failure',()=>{
  let prior:HealthState|undefined;
  for(let i=1;i<=3;i++){const result=nextHealth(prior,false,false,'schedule',String(i),false);expect(result.action).toBe(i===3?'open':'none');prior=result.state;}
});
it('alerts immediately for a failed deploy and only closes on recovery',()=>{
  const failure=nextHealth(undefined,false,true,'workflow_run','1',false);expect(failure.action).toBe('open');
  expect(nextHealth(failure.state,false,false,'schedule','2',true).action).toBe('none');
  const recovery=nextHealth(failure.state,true,false,'schedule','3',true);expect(recovery.action).toBe('close');expect(recovery.state.consecutiveFailures).toBe(0);
  expect(nextHealth(recovery.state,true,false,'schedule','4',false).action).toBe('none');
  expect(nextHealth(recovery.state,false,false,'schedule','3',false).action).toBe('none');
});
it('a successful check resets the consecutive failure count',()=>{
  const a=nextHealth(undefined,false,false,'schedule','1',false);
  const b=nextHealth(a.state,true,false,'schedule','2',false);
  expect(nextHealth(b.state,false,false,'schedule','3',false).state.consecutiveFailures).toBe(1);
});
const commit='a'.repeat(40),html='<title>AskJamie Concierge</title>',catalog='[]';
const digest=(v:string)=>createHash('sha256').update(v).digest('hex');
const manifest={commit,files:{'index.html':digest(html),'catalog.json':digest(catalog)}};
function mock(overrides:Record<string,string>={}):typeof fetch {
  const content:Record<string,string>={'build-manifest.json':JSON.stringify(manifest),'version.json':JSON.stringify({commit}),'index.html':html,'catalog.json':catalog,...overrides};
  return async(url)=>{const path=new URL(String(url)).pathname.split('/').pop()!;return new Response(content[path]??'',{status:path in content?200:404});};
}
it('verifies exact live commit and bytes, rejecting stale or missing assets',async()=>{
  await expect(checkLiveSite('https://example.test/concierge/',commit,mock())).resolves.toBeUndefined();
  await expect(checkLiveSite('https://example.test/concierge/','b'.repeat(40),mock())).rejects.toThrow(/commit/);
  await expect(checkLiveSite('https://example.test/concierge/',commit,mock({'index.html':'wrong bytes'}))).rejects.toThrow(/match its build/);
  await expect(checkLiveSite('https://example.test/concierge/',commit,async()=>new Response('',{status:503}))).rejects.toThrow(/unavailable/);
});
it('rejects traversal in the live manifest before requesting it',async()=>{
  await expect(checkLiveSite('https://example.test/',commit,mock({'build-manifest.json':JSON.stringify({...manifest,files:{...manifest.files,'../private':digest('x')}})}))).rejects.toThrow(/unsafe/);
});
