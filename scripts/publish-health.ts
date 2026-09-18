import { mkdir,readFile,writeFile } from 'node:fs/promises';
import { unzipSync,strFromU8 } from 'fflate';
import { github,repositoryPath,trackingIssue,workflowLink } from './github';
import { nextHealth,checkLiveSite,type HealthState } from './health-policy';

const base=repositoryPath(),runId=process.env.GITHUB_RUN_ID;
if(!runId)throw new Error('A workflow run id is required.');
const event=JSON.parse(await readFile(process.env.GITHUB_EVENT_PATH!,'utf8'));
const deployFailed=process.env.GITHUB_EVENT_NAME==='workflow_run' && ['failure','timed_out','action_required'].includes(event.workflow_run?.conclusion);
async function previousState():Promise<HealthState|undefined> {
  const runs=await github(base+'/actions/workflows/publish-health-check.yml/runs?per_page=30&status=completed');
  for(const run of runs.workflow_runs) {
    if(String(run.id)===runId)continue;
    const artifacts=await github(base+'/actions/runs/'+run.id+'/artifacts?per_page=100');
    const artifact=artifacts.artifacts.find((v:any)=>v.name==='publish-health-state' && !v.expired);
    if(!artifact)continue;
    const response=await fetch('https://api.github.com'+base+'/actions/artifacts/'+artifact.id+'/zip',{headers:{Authorization:'Bearer '+process.env.GH_TOKEN,Accept:'application/vnd.github+json'},signal:AbortSignal.timeout(30_000)});
    if(!response.ok)throw new Error('Previous health state could not be loaded.');
    const files=unzipSync(new Uint8Array(await response.arrayBuffer()));
    const bytes=files['health-state.json'];
    if(!bytes)throw new Error('Previous health state is incomplete.');
    const value=JSON.parse(strFromU8(bytes));
    if(!Number.isInteger(value.consecutiveFailures)||value.consecutiveFailures<0||typeof value.lastRunId!=='string')throw new Error('Previous health state is invalid.');
    return value;
  }
}
async function deployedCommit():Promise<string> {
  // Compare to the last successful deploy, not to main: unrelated commits need no redeploy.
  const workflows=['deploy-pages.yml','scheduled-reaudit.yml'];
  const candidates=(await Promise.all(workflows.map(name=>github(base+'/actions/workflows/'+name+'/runs?branch=main&status=success&per_page=10')))).flatMap(v=>v.workflow_runs);
  candidates.sort((a,b)=>Date.parse(b.updated_at)-Date.parse(a.updated_at));
  if(!candidates[0])throw new Error('No successful public deployment has been recorded.');
  return candidates[0].head_sha;
}
const previous=await previousState();
const issues=await github(base+'/issues?state=open&per_page=100&labels=publish-health');
const incident=issues.find((v:any)=>!v.pull_request && v.title==='Publication health incident');
let healthy=false,detail='';
try {
  if(deployFailed)throw new Error('The publication workflow failed.');
  const [pages,commit]=await Promise.all([github(base+'/pages'),deployedCommit()]);
  await checkLiveSite(pages.html_url,commit);healthy=true;detail='The live site matches the last successful deployment and all published file hashes.';
} catch(error) {detail=error instanceof Error ? error.message:'The public site could not be verified.';}
const {state,action}=nextHealth(previous,healthy,deployFailed,process.env.GITHUB_EVENT_NAME!,runId,!!incident);
await mkdir('.data',{recursive:true});
await writeFile('.data/health-state.json',JSON.stringify(state,null,2)+'\n');
let issueUrl:string|undefined;
if(action==='open') {
  const result=await trackingIssue('publish-health','Publication health incident',detail+'\n\nConsecutive scheduled failures: '+state.consecutiveFailures+'\n\n[Inspection run]('+workflowLink()+')');
  if(result.created)issueUrl=result.issue.html_url;
} else if(action==='close') {
  await github(base+'/issues/'+incident.number+'/comments','POST',{body:'Publication recovered. '+detail+'\n\n[Verification run]('+workflowLink()+')'});
  await github(base+'/issues/'+incident.number,'PATCH',{state:'closed',state_reason:'completed'});
  issueUrl=incident.html_url;
}
const webhook=process.env.PUBLISH_HEALTH_WEBHOOK_URL;
if(issueUrl && webhook) {
  const url=new URL(webhook);if(url.protocol!=='https:')throw new Error('The notification webhook must use HTTPS.');
  const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:action==='open'?'AskJamie Concierge publication needs attention.':'AskJamie Concierge publication recovered.',url:issueUrl}),signal:AbortSignal.timeout(15_000)});
  if(!response.ok)console.warn('The incident was recorded, but its one-time notification could not be delivered.');
}
console.log(JSON.stringify({healthy,detail,consecutiveFailures:state.consecutiveFailures,incidentAction:action}));
