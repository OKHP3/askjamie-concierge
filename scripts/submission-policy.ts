export type JobResult = { name: string; conclusion: string | null };
const mechanical = ['structural-validation', 'deduplication-check', 'security-scan'];
export function admissionStage(jobs: JobResult[]): 'human-review' | 'not-accepted' | 'automated-review' {
  const gates = mechanical.map(name => jobs.find(v => v.name === name || v.name.endsWith(' / '+name)));
  if (gates.some(v => v?.conclusion === 'failure')) return 'not-accepted';
  return gates.every(v => v?.conclusion === 'success') ? 'human-review' : 'automated-review';
}
