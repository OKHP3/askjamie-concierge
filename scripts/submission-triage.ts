import { readFile } from 'node:fs/promises';
import { github, repositoryPath, workflowLink } from './github';
import { admissionStage, type JobResult } from './submission-policy';

const event=JSON.parse(await readFile(process.env.GITHUB_EVENT_PATH!,'utf8'));
const run=event.workflow_run;
const base=repositoryPath();
if(run?.name!=='Release validation' || run.event!=='pull_request' || run.status!=='completed') throw new Error('Unexpected triage event.');
const pulls=await github(base+'/commits/'+run.head_sha+'/pulls?per_page=100');
for(const candidate of pulls) {
  const pr=await github(base+'/pulls/'+candidate.number);
  if(pr.state!=='open' || pr.head.sha!==run.head_sha || !pr.labels.some((v:any)=>v.name==='skill-submission')) continue;
  const response=await github(base+'/actions/runs/'+run.id+'/jobs?per_page=100');
  if(response.total_count>100) throw new Error('Unexpected validation job count.');
  const stage=admissionStage(response.jobs as JobResult[]);
  const unrelated=pr.labels.map((v:any)=>v.name).filter((v:string)=>!['automated-review','human-review','not-accepted'].includes(v));
  await github(base+'/issues/'+pr.number+'/labels','PUT',{labels:[...unrelated,stage]});
  const marker='<!-- admission-run:'+run.id+':'+run.run_attempt+' -->';
  const comments=await github(base+'/issues/'+pr.number+'/comments?per_page=100');
  if(!comments.some((v:any)=>v.body.includes(marker))) {
    const explanation=stage==='human-review'
      ? 'The structural, duplication, and security jobs passed. A curator must now evaluate scope and usefulness, then record a content-bound judgment decision. Release approval is still required before publication.'
      : stage==='not-accepted'
      ? 'A required automated admission job failed. This submission is closed with its validation results linked below. Correct the reported problem and reopen or submit a revised pull request; no package has been published.'
      : 'Automated evidence is incomplete or was cancelled. This submission remains in automated review; rerun validation before a judgment decision.';
    await github(base+'/issues/'+pr.number+'/comments','POST',{body:marker+'\n\n'+explanation+'\n\n[Validation results]('+run.html_url+') · [Triage run]('+workflowLink()+')'});
  }
  if(stage==='not-accepted') await github(base+'/pulls/'+pr.number,'PATCH',{state:'closed'});
}
