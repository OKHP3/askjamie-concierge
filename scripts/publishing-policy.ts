import { parseDocument } from 'yaml';
export const watchedPaths = ['apps/concierge/**','apps/api/src/discovery.ts','apps/api/src/application.ts','packages/catalog-schema/**','packages/trust-pipeline/**','packages/ui-kit/**','seed-catalog/**','catalog/**','scripts/**','package.json','pnpm-lock.yaml','pnpm-workspace.yaml','tsconfig.json','.github/actions/**','.github/workflows/deploy-pages.yml','.github/workflows/release-validation.yml'];
export function validatePublishing(text:string):void {
  const doc=parseDocument(text,{uniqueKeys:true});
  if(doc.errors.length)throw new Error('Invalid publishing YAML.');
  const value=doc.toJS() as Record<string,any>;
  if(!value || typeof value!=='object')throw new Error('A publishing workflow is required.');
  const triggers=value.on;
  if(!triggers || Object.keys(triggers).sort().join(',')!=='push,workflow_dispatch')throw new Error('Publishing triggers must be explicit.');
  if(JSON.stringify(triggers.push?.branches)!=='["main"]')throw new Error('Only main can trigger publication.');
  const paths=triggers.push?.paths;
  if(!Array.isArray(paths) || [...paths].sort().join('|')!==[...watchedPaths].sort().join('|'))throw new Error('Publishing paths must exactly cover the app and its dependencies.');
  if(value.permissions?.contents!=='read' || Object.keys(value.permissions).length!==1)throw new Error('Workflow permissions must default to read-only.');
  const jobs=value.jobs;
  if(jobs?.validation?.uses!=='./.github/workflows/release-validation.yml' || jobs.validation.if!=="github.ref == 'refs/heads/main'")throw new Error('Publication must depend on main validation.');
  if(jobs?.package?.needs!=='validation' || jobs?.deploy?.needs!=='package')throw new Error('Publishing dependencies are missing.');
  if(jobs.deploy.if!=="github.ref == 'refs/heads/main'" || jobs.deploy.environment?.name!=='github-pages')throw new Error('Protected publication environment is required.');
  if(jobs.deploy.permissions?.pages!=='write' || jobs.deploy.permissions?.['id-token']!=='write')throw new Error('Pages permissions are incomplete.');
  const upload=jobs.package.steps?.find((v:any)=>String(v.uses).startsWith('actions/upload-pages-artifact@'));
  if(upload?.with?.path!=='public-site')throw new Error('Only the public artifact can be deployed.');
  for(const job of Object.values(jobs) as any[])for(const step of job.steps??[])if(step.uses && !step.uses.startsWith('./') && !/@[a-f0-9]{40}$/.test(step.uses))throw new Error('External actions must be pinned to a commit.');
}
