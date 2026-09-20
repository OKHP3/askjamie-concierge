import { describe, it, expect } from 'vitest';
import { publish, publishReaudit, recordDecision, fresh, parseAssessment, type Assessment } from './index';
import { parseScannerReport } from './scanner';
const now = new Date().toISOString();
const assessment: Assessment = {
  submission: { id:'meeting-notes', displayName:'Meeting notes', plainDescription:'Organizes meeting notes into decisions and next steps.', triggerHints:['summarize meeting notes'], compatiblePlatforms:['claude'], sourcePackageRef:'seed-catalog/meeting-notes/SKILL.md', contributedBy:null, version:'1.0.0' },
  digest: 'a'.repeat(64), evidence: { scanner:'cisco-ai-skill-scanner', version:'2.1.0', checkedAt:now, findings:[] }, overlaps:[], mechanicalPassed:true,
};
const decision = { id:'meeting-notes', digest:'a'.repeat(64), decision:'approved', reviewer:'Test reviewer', reviewerKind:'human', reviewedAt:now, rationale:'Clear, bounded scope with useful and verifiable outputs.' };
describe('trust boundaries', () => {
  it('never publishes a clean scan without a judgment decision', () => expect(publish(assessment).trustStatus).toBe('pending-review'));
  it('binds approval to the complete content digest', () => {
    expect(publish(assessment, decision).trustStatus).toBe('verified');
    expect(publish({ ...assessment, digest:'b'.repeat(64) }, decision).trustStatus).toBe('pending-review');
    expect(() => recordDecision({ ...assessment, digest:'b'.repeat(64) }, decision)).toThrow(/changed/);
  });
  it('cannot approve failed or stale automated checks', () => {
    expect(() => recordDecision({ ...assessment, mechanicalPassed:false }, decision)).toThrow();
    const stale = { ...assessment, evidence: { ...assessment.evidence, checkedAt:'2020-01-01T00:00:00Z' } };
    expect(publish(stale, decision).trustStatus).toBe('pending-review');
    expect(() => recordDecision(stale, decision)).toThrow();
  });
  it('requires an explicit overlap rationale', () => {
    const overlap = { ...assessment, overlaps:[{ id:'similar', kind:'description' as const, similarity:0.8 }] };
    expect(() => recordDecision(overlap, decision)).toThrow(/overlapping/);
    expect(publish(overlap, decision).trustStatus).toBe('pending-review');
  });
  it('records a reasoned rejection', () => expect(publish(assessment, { ...decision, decision:'rejected' }).trustStatus).toBe('rejected'));
  it('rechecks evidence and judgment instead of trusting a saved pass flag', () => {
    expect(publish({...assessment,mechanicalPassed:false,evidence:{...assessment.evidence,findings:[{ruleId:'test',severity:'HIGH',title:'Unsafe instructions'}]}},decision).trustStatus).toBe('flagged');
    expect(() => publish({...assessment,evidence:{...assessment.evidence,version:'unknown'}},decision)).toThrow(/identity/);
    expect(() => publish(assessment,{...decision,reviewedAt:new Date(Date.now()+3600_000).toISOString()})).toThrow(/future/);
  });
  it('fails closed on missing or partial scanner results', () => {
    const report = { skill_name:'meeting-notes', timestamp:now, findings_count:0, findings:[], analyzers_used:['static_analyzer'] };
    expect(parseScannerReport(report).findings).toEqual([]);
    for (const change of [{ analyzers_used:[] }, { analyzers_used:['llm'] }, { analyzers_failed:[{ error:'failed' }] }, { findings_count:1 }, { findings:[{ severity:'unknown' }] }]) expect(() => parseScannerReport({ ...report, ...change })).toThrow();
  });
  it.each([
    {mechanicalPassed:'false'}, {mechanicalPassed:null}, {digest:'invalid'}, {overlaps:null},
    {evidence:{...assessment.evidence, findings:null}},
    {evidence:{...assessment.evidence, checkedAt:42}},
    {evidence:{...assessment.evidence, findings:[{ruleId:'test',severity:'UNKNOWN',title:'Unknown'}]}},
    {overlaps:[{id:'other',kind:'unknown',similarity:0.9}]},
    {overlaps:[{id:'other',kind:'trigger',similarity:2}]},
    {unexpected:true},
  ])('rejects malformed persisted assessment at every trust boundary: %j', change => {
    const malformed = {...assessment,...change} as unknown as Assessment;
    expect(() => parseAssessment(malformed)).toThrow();
    expect(() => publish(malformed,decision)).toThrow();
    expect(() => publishReaudit(malformed,decision)).toThrow();
    expect(() => recordDecision(malformed,decision)).toThrow();
  });
  it('rejects cached pass flags inconsistent with findings', () => {
    expect(() => parseAssessment({...assessment,mechanicalPassed:false})).toThrow(/conflicts/);
    expect(() => publish({...assessment,evidence:{...assessment.evidence,findings:[{ruleId:'test',severity:'HIGH',title:'Unsafe'}]}},decision)).toThrow(/conflicts/);
  });
  it('rejects future and invalid timestamps', () => {
    expect(fresh('unknown')).toBe(false);
    expect(fresh(new Date(Date.now()+3600_000).toISOString())).toBe(false);
  });
  it('retains moderate findings only for unchanged admitted packages during re-audit', () => {
    const moderate = { ...assessment, mechanicalPassed:false, evidence:{...assessment.evidence, findings:[{ruleId:'test',severity:'MEDIUM' as const,title:'New finding'}]} };
    expect(publish(moderate,decision).trustStatus).toBe('flagged');
    expect(publishReaudit(moderate,decision).trustStatus).toBe('verified');
    expect(publishReaudit(moderate).trustStatus).toBe('flagged');
    expect(publishReaudit({...moderate,digest:'b'.repeat(64)},decision).trustStatus).toBe('flagged');
    expect(publishReaudit({...moderate,evidence:{...moderate.evidence,findings:[{ruleId:'test',severity:'HIGH',title:'New severe finding'}]}},decision).trustStatus).toBe('flagged');
  });
});
