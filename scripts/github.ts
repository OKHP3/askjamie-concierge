const repository=process.env.GITHUB_REPOSITORY;
export function repositoryPath() {
  if(!repository || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository))throw new Error('Repository context is required.');
  return '/repos/'+repository;
}
export async function github(path:string,method='GET',body?:unknown):Promise<any> {
  const token=process.env.GH_TOKEN;
  if(!token)throw new Error('A workflow token is required.');
  const response=await fetch('https://api.github.com'+path,{method,headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28',...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(30_000)});
  if(!response.ok)throw new Error('GitHub request failed ('+response.status+').');
  return response.status===204 ? null : response.json();
}
export async function trackingIssue(label:string,title:string,body:string) {
  const base=repositoryPath();
  const issues=await github(base+'/issues?state=open&per_page=100&labels='+encodeURIComponent(label));
  const existing=issues.find((v:any)=>!v.pull_request && v.title===title);
  if(existing)return {issue:existing,created:false};
  const issue=await github(base+'/issues','POST',{title,body,labels:[label]});
  return {issue,created:true};
}
export function workflowLink(){return 'https://github.com/'+process.env.GITHUB_REPOSITORY+'/actions/runs/'+process.env.GITHUB_RUN_ID;}
