import { readFile, writeFile, rename, open, unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { submissionSchema, findOverlaps } from '@askjamie/catalog-schema';
import { decisionSchema, inspectPackage, recordDecision, fresh, findingSchema, parseAssessment, SCANNER_VERSION, type Assessment, type Decision } from '@askjamie/trust-pipeline';
export type ReviewItem = Assessment & { content:string };
export type ReviewState = { queue:ReviewItem[]; decisions:Decision[]; blocked:{id:string;reason:string}[] };
export class ReviewService {
  constructor(readonly root:string) {}
  async state():Promise<ReviewState> {
    const submissions=JSON.parse(await readFile(resolve(this.root,'seed-catalog/catalog.json'),'utf8')).map((v:unknown)=>submissionSchema.parse(v));
    const decisions:Decision[]=JSON.parse(await readFile(resolve(this.root,'catalog/reviews.json'),'utf8')).map((v:unknown)=>decisionSchema.parse(v));
    const rawAssessments:unknown=JSON.parse(await readFile(resolve(this.root,'.data/assessments.json'),'utf8'));
    if(!Array.isArray(rawAssessments))throw new Error('Assessments must be an array. Run a fresh scan.');
    const assessments=rawAssessments.map(parseAssessment);
    const queue:ReviewItem[]=[],blocked:ReviewState['blocked']=[];
    for(const entry of submissions) {
      try {
        const pkg=await inspectPackage(this.root,entry);
        const scan=assessments.find(v=>v.submission.id===entry.id);
        if(!scan || scan.digest!==pkg.digest || !fresh(scan.evidence.checkedAt) || scan.evidence.scanner!=='cisco-ai-skill-scanner' || scan.evidence.version!==SCANNER_VERSION)throw new Error('A current scan of these contents is required.');
        const findings=scan.evidence.findings.map(v=>findingSchema.parse(v));
        if(findings.some(v=>['MEDIUM','HIGH','CRITICAL'].includes(v.severity)))throw new Error('Automated security checks need resolution.');
        if(findOverlaps(entry,submissions).some(v=>v.kind==='trigger'))throw new Error('Trigger overlap must be resolved.');
        const latest=decisions.findLast(v=>v.id===entry.id && v.digest===pkg.digest);
        if(!latest)queue.push({...scan,submission:entry,mechanicalPassed:true,overlaps:findOverlaps(entry,submissions),content:pkg.content});
      } catch(error) {blocked.push({id:entry.id,reason:error instanceof Error ? error.message:'Automated checks are unavailable.'});}
    }
    return {queue,decisions,blocked};
  }
  async decide(input:unknown):Promise<Decision> {
    const lockPath=resolve(this.root,'.data/review.lock');
    let lock;
    try {lock=await open(lockPath,'wx');} catch {throw new Error('Another decision is being saved. Reload and try again.');}
    try {
      const raw=decisionSchema.omit({reviewedAt:true,reviewerKind:true}).parse(input);
      const current=await this.state();
      const item=current.queue.find(v=>v.submission.id===raw.id);
      if(!item)throw new Error('This submission is no longer ready for review. Reload the queue.');
      const {content: _content,...assessment}=item;
      const decision=recordDecision(assessment,{...raw,reviewerKind:'human',reviewedAt:new Date().toISOString()});
      const path=resolve(this.root,'catalog/reviews.json');
      await writeFile(path+'.next',JSON.stringify([...current.decisions,decision],null,2)+'\n');
      await rename(path+'.next',path);
      return decision;
    } finally {await lock.close();await unlink(lockPath);}
  }
}
