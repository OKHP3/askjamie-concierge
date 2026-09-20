import { readFile } from 'node:fs/promises';
import { github, repositoryPath, workflowLink } from './github';
import { admissionStage, type JobResult } from './submission-policy';

type GithubRequest = (path:string, method?:string, body?:unknown) => Promise<any>;
type ChangedFile = { filename:string; previous_filename?:string };
function eligible(pr:any, base:string, sha:string):boolean {
  return pr.state==='open' && pr.head?.sha===sha && pr.base?.ref==='main' && '/repos/'+pr.base?.repo?.full_name===base
    && pr.labels.some((v:any)=>v.name==='skill-submission');
}
function submissionPath(path:string):boolean {
  return path === 'seed-catalog/catalog.json' || /^seed-catalog\/[a-z0-9-]+\/(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_.-]+\.(md|txt)$/.test(path);
}
async function trustedSubmissionScope(base:string, pr:any, request:GithubRequest):Promise<boolean> {
  // A submission cannot change the code, dependencies or workflows supplying its own evidence.
  if (!Number.isInteger(pr.changed_files) || pr.changed_files < 1 || pr.changed_files > 3000) throw new Error('Incomplete changed-file count.');
  const files:ChangedFile[] = [];
  for (let page = 1; files.length < pr.changed_files; page++) {
    const batch = await request(base+'/pulls/'+pr.number+'/files?per_page=100&page='+page);
    if (!Array.isArray(batch) || batch.length === 0 || batch.length > 100) throw new Error('Incomplete changed-file evidence.');
    files.push(...batch);
  }
  if (files.length !== pr.changed_files || new Set(files.map(file => file.filename)).size !== files.length) throw new Error('Changed-file evidence does not match the pull request.');
  return files.every(file => typeof file.filename === 'string' && submissionPath(file.filename)
    && (file.previous_filename === undefined || submissionPath(file.previous_filename)));
}
export async function triageSubmissions(event:any, base:string, link:string, request:GithubRequest = github):Promise<void> {
  const run=event.workflow_run;
  if(run?.name!=='Release validation' || run.event!=='pull_request' || run.status!=='completed'
    || !/^[a-f0-9]{40}$/.test(run.head_sha) || !Number.isInteger(run.id) || !Number.isInteger(run.run_attempt)) throw new Error('Unexpected triage event.');
  const pulls=await request(base+'/commits/'+run.head_sha+'/pulls?per_page=100');
  if(!Array.isArray(pulls) || pulls.length>=100) throw new Error('Incomplete pull request evidence.');
  for(const candidate of pulls) {
    const pr=await request(base+'/pulls/'+candidate.number);
    if(!eligible(pr,base,run.head_sha)) continue;
    const trusted=await trustedSubmissionScope(base,pr,request);
    let stage:ReturnType<typeof admissionStage>='automated-review';
    if(trusted) {
      const response=await request(base+'/actions/runs/'+run.id+'/jobs?per_page=100');
      if(!Array.isArray(response.jobs) || response.total_count!==response.jobs.length || response.total_count>100) throw new Error('Incomplete validation job evidence.');
      stage=admissionStage(response.jobs as JobResult[]);
    }
    const marker='<!-- admission-run:'+run.id+':'+run.run_attempt+' -->';
    const comments:any[]=[];
    for(let page=1; ; page++) {
      const batch=await request(base+'/issues/'+pr.number+'/comments?per_page=100&page='+page);
      if(!Array.isArray(batch) || batch.length>100)throw new Error('Incomplete comment evidence.');
      comments.push(...batch);
      if(batch.length<100)break;
      if(page>=100)throw new Error('Comment pagination limit exceeded.');
    }
    const current=await request(base+'/pulls/'+pr.number);
    if(!eligible(current,base,run.head_sha)) continue;
    const unrelated=current.labels.map((v:any)=>v.name).filter((v:string)=>!['automated-review','human-review','not-accepted'].includes(v));
    await request(base+'/issues/'+pr.number+'/labels','PUT',{labels:[...unrelated,stage]});
    if(!comments.some((v:any)=>typeof v.body==='string' && v.body.includes(marker))) {
      const explanation=!trusted
        ? 'This pull request changes files outside the instruction-only submission scope. Its own workflow results cannot establish trusted admission evidence. Keep it in automated review until the tooling changes are reviewed separately and validation runs again.'
        : stage==='human-review'
        ? 'The structural, duplication, and security jobs passed. A curator must now evaluate scope and usefulness, then record a content-bound judgment decision. Release approval is still required before publication.'
        : stage==='not-accepted'
        ? 'A required automated admission job failed. This submission is closed with its validation results linked below. Correct the reported problem and reopen or submit a revised pull request; no package has been published.'
        : 'Automated evidence is incomplete or was cancelled. This submission remains in automated review; rerun validation before a judgment decision.';
      await request(base+'/issues/'+pr.number+'/comments','POST',{body:marker+'\n\n'+explanation+'\n\n[Validation results]('+run.html_url+') · [Triage run]('+link+')'});
    }
    if(stage==='not-accepted' && eligible(await request(base+'/pulls/'+pr.number),base,run.head_sha)) {
      await request(base+'/pulls/'+pr.number,'PATCH',{state:'closed'});
    }
  }
}
if(process.argv[1]?.replaceAll('\\','/').endsWith('/scripts/submission-triage.ts')) {
  const event=JSON.parse(await readFile(process.env.GITHUB_EVENT_PATH!,'utf8'));
  await triageSubmissions(event,repositoryPath(),workflowLink());
}
