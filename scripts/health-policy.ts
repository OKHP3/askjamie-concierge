import { createHash } from 'node:crypto';
export type HealthState = { consecutiveFailures:number; lastRunId:string; lastResult:'healthy'|'unhealthy'; checkedAt:string };
export function nextHealth(previous:HealthState|undefined,healthy:boolean,deployFailed:boolean,event:string,runId:string,incidentOpen:boolean) {
  if(previous?.lastRunId===runId)return {state:previous,action:'none' as const};
  const failures=healthy ? 0 : event==='schedule' ? (previous?.consecutiveFailures??0)+1 : previous?.consecutiveFailures??0;
  const action=healthy && incidentOpen ? 'close' : !healthy && !incidentOpen && (deployFailed || event!=='schedule' || failures>=3) ? 'open' : 'none';
  return {state:{consecutiveFailures:failures,lastRunId:runId,lastResult:healthy?'healthy' as const:'unhealthy' as const,checkedAt:new Date().toISOString()},action};
}
type Request=typeof fetch;
export async function checkLiveSite(base:string,expectedCommit:string,request:Request=fetch):Promise<void> {
  const url=new URL(base);
  if(url.protocol!=='https:' || !/^[a-f0-9]{40}$/.test(expectedCommit))throw new Error('Publication identity is invalid.');
  const get=async(path:string)=>{
    const target=new URL(path,url.href.endsWith('/')?url.href:url.href+'/');
    target.searchParams.set('health',Date.now().toString());
    const response=await request(target,{cache:'no-store',signal:AbortSignal.timeout(20_000)});
    if(!response.ok)throw new Error('Public file unavailable: '+path+' ('+response.status+').');
    return response;
  };
  const manifest=await (await get('build-manifest.json')).json();
  const version=await (await get('version.json')).json();
  if(manifest.commit!==expectedCommit || version.commit!==expectedCommit)throw new Error('Live source commit does not match the last successful deployment.');
  if(!manifest.files || !manifest.files['index.html'] || !manifest.files['catalog.json'] || Object.keys(manifest.files).length>100)throw new Error('Public file manifest is invalid.');
  for(const [path,digest] of Object.entries(manifest.files)) {
    if(!/^[A-Za-z0-9_./-]+$/.test(path) || path.includes('..') || path.startsWith('/') || typeof digest!=='string' || !/^[a-f0-9]{64}$/.test(digest))throw new Error('Public file manifest contains an unsafe entry.');
    const bytes=Buffer.from(await (await get(path)).arrayBuffer());
    if(createHash('sha256').update(bytes).digest('hex')!==digest)throw new Error('Public file does not match its build: '+path);
    if(path==='index.html' && !bytes.toString('utf8').includes('AskJamie Concierge'))throw new Error('The live page is not the concierge.');
  }
}
