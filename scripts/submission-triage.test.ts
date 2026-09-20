import { expect, it, vi } from 'vitest';
import { triageSubmissions } from './submission-triage';
const base='/repos/example/concierge';
const sha='a'.repeat(40);
const event={workflow_run:{name:'Release validation',event:'pull_request',status:'completed',head_sha:sha,id:42,run_attempt:1,html_url:'https://github.com/example/concierge/actions/runs/42'}};
function fixture() {
  const pr:any={number:7,state:'open',head:{sha},base:{ref:'main',repo:{full_name:'example/concierge'}},changed_files:1,labels:[{name:'skill-submission'},{name:'help wanted'},{name:'automated-review'}]};
  const files:any[]=[{filename:'seed-catalog/meeting-notes/SKILL.md'}];
  const comments:any[]=[];
  const jobs=['structural-validation','deduplication-check','security-scan'].map(name=>({name,conclusion:'success'}));
  const writes:{path:string;method:string;body:any}[]=[];
  let reads=0;
  const request=vi.fn(async(path:string,method='GET',body?:any):Promise<any>=>{
    if(method!=='GET'){writes.push({path,method,body});return {};}
    if(path.includes('/commits/'))return [{number:7}];
    if(path===base+'/pulls/7'){reads++;return structuredClone(pr);}
    if(path.includes('/files?')){const page=Number(new URL('https://api.github.com'+path).searchParams.get('page'));return files.slice((page-1)*100,page*100);}
    if(path.includes('/jobs?'))return {total_count:jobs.length,jobs};
    if(path.includes('/comments?')){const page=Number(new URL('https://api.github.com'+path).searchParams.get('page'));return comments.slice((page-1)*100,page*100);}
    throw new Error('Unexpected request '+path);
  });
  return {pr,files,jobs,comments,writes,request,get reads(){return reads;}};
}
const run=(f:ReturnType<typeof fixture>)=>triageSubmissions(event,base,'https://github.com/example/concierge/actions/runs/43',f.request);
it('promotes a scoped submission and preserves unrelated labels',async()=>{
  const f=fixture();await run(f);
  expect(f.writes.map(v=>v.method)).toEqual(['PUT','POST']);
  expect(f.writes[0].body.labels).toEqual(['skill-submission','help wanted','human-review']);
  expect(f.writes[1].body.body).toContain('<!-- admission-run:42:1 -->');
});
it.each(['scripts/check.ts','.github/workflows/release-validation.yml','pnpm-lock.yaml','catalog/reviews.json','seed-catalog/meeting-notes/attack.js'])('does not trust PR-controlled evidence after %s changes',async path=>{
  const f=fixture();f.files.push({filename:path});f.pr.changed_files=2;f.jobs[0].conclusion='failure';
  await run(f);
  expect(f.writes[0].body.labels).toContain('automated-review');
  expect(f.writes.some(v=>v.method==='PATCH')).toBe(false);
  expect(f.request.mock.calls.some(([path])=>path.includes('/jobs?'))).toBe(false);
});
it('checks every changed-file page and rename source before trusting gates',async()=>{
  const f=fixture();f.files.splice(0,1,...Array.from({length:100},(_,i)=>({filename:'seed-catalog/meeting-notes/ref'+i+'.md'})),{filename:'seed-catalog/meeting-notes/moved.md',previous_filename:'scripts/check.ts'});f.pr.changed_files=101;
  await run(f);expect(f.writes[0].body.labels).toContain('automated-review');
});
it('closes only a definite failure after recording its explanation',async()=>{
  const f=fixture();f.jobs[2].conclusion='failure';await run(f);
  expect(f.writes.map(v=>v.method)).toEqual(['PUT','POST','PATCH']);
  expect(f.writes[0].body.labels).toContain('not-accepted');
  expect(f.writes[2].body).toEqual({state:'closed'});
});
it('does not close incomplete or cancelled evidence',async()=>{
  const f=fixture();f.jobs[2].conclusion='cancelled';await run(f);
  expect(f.writes[0].body.labels).toContain('automated-review');
  expect(f.writes.some(v=>v.method==='PATCH')).toBe(false);
});
it('finds existing admission comments after the first page without posting duplicates',async()=>{
  const f=fixture();f.comments.push(...Array.from({length:100},()=>({body:'Other discussion'})),{body:'<!-- admission-run:42:1 -->'});
  await run(f);expect(f.writes.map(v=>v.method)).toEqual(['PUT']);
});
it.each(['closed','head','label','base','repository'])('skips ineligible PR %s state without mutations',async kind=>{
  const f=fixture();
  if(kind==='closed')f.pr.state='closed';
  if(kind==='head')f.pr.head.sha='b'.repeat(40);
  if(kind==='label')f.pr.labels=[];
  if(kind==='base')f.pr.base.ref='other';
  if(kind==='repository')f.pr.base.repo.full_name='other/repository';
  await run(f);expect(f.writes).toEqual([]);
});
it('aborts malformed events and incomplete file responses before any mutation',async()=>{
  const f=fixture();await expect(triageSubmissions({},base,'link',f.request)).rejects.toThrow('Unexpected');
  f.pr.changed_files=2;await expect(run(f)).rejects.toThrow('Incomplete changed-file');
  expect(f.writes).toEqual([]);
});
it('does not mutate after a changed head is observed during the final recheck',async()=>{
  const f=fixture();const original=f.request.getMockImplementation()!;
  f.request.mockImplementation(async(path,method,body)=>{
    if(path===base+'/pulls/7' && f.reads===1)f.pr.head.sha='b'.repeat(40);
    return original(path,method,body);
  });
  await run(f);expect(f.writes).toEqual([]);
});
it.each(['PUT','POST'])('never closes after a %s API failure',async failedMethod=>{
  const f=fixture();f.jobs[2].conclusion='failure';const original=f.request.getMockImplementation()!;
  f.request.mockImplementation(async(path,method,body)=>{
    if(method===failedMethod)throw new Error('mutation unavailable');
    return original(path,method,body);
  });
  await expect(run(f)).rejects.toThrow('mutation unavailable');
  expect(f.writes.some(v=>v.method==='PATCH')).toBe(false);
});
it('rechecks head after pagination and before closing a failed submission',async()=>{
  for(const changedAt of ['comments','POST']) {
    const f=fixture();f.jobs[2].conclusion='failure';const original=f.request.getMockImplementation()!;
    f.request.mockImplementation(async(path,method,body)=>{
      if((changedAt==='comments' && path.includes('/comments?')) || method===changedAt)f.pr.head.sha='b'.repeat(40);
      return original(path,method,body);
    });
    await run(f);
    expect(f.writes.some(v=>v.method==='PATCH')).toBe(false);
    if(changedAt==='comments')expect(f.writes).toEqual([]);
  }
});
it('rejects incomplete job responses and read failures before label mutations',async()=>{
  for(const broken of ['jobs','comments']) {
    const f=fixture();const original=f.request.getMockImplementation()!;
    f.request.mockImplementation(async(path,method,body)=>{
      if(broken==='jobs' && path.includes('/jobs?'))return {total_count:1000,jobs:f.jobs};
      if(broken==='comments' && path.includes('/comments?'))throw new Error('comments unavailable');
      return original(path,method,body);
    });
    await expect(run(f)).rejects.toThrow();expect(f.writes).toEqual([]);
  }
});
