import { readFile } from 'node:fs/promises';
import { trackingIssue,workflowLink } from './github';
import type { Assessment } from '../packages/trust-pipeline/src/index';
if(process.env.SCAN_OUTCOME!=='success') {
  await trackingIssue('trust-review','Catalog re-audit could not complete','The scheduled scanner did not complete. No fresh trust status or publication was produced. Investigate before the existing evidence expires.\n\n[Audit run]('+workflowLink()+')');
} else {
  const assessments:Assessment[]=JSON.parse(await readFile('.data/assessments.json','utf8'));
  for(const assessment of assessments) {
    if(!assessment.evidence.findings.length)continue;
    const high=assessment.evidence.findings.some(v=>['HIGH','CRITICAL'].includes(v.severity));
    await trackingIssue('trust-review','Catalog review: '+assessment.submission.id,
      (high?'This skill is automatically flagged and excluded from public recommendations pending review.':'This skill remains published pending review of the new findings.')+
      '\n\n'+assessment.evidence.findings.map(v=>'- '+v.severity+': '+v.title+' ('+v.ruleId+')').join('\n')+
      '\n\nContent digest: '+assessment.digest+'\n\n[Audit run]('+workflowLink()+')');
  }
}
