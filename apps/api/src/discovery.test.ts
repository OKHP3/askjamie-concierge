import { describe, it, expect } from 'vitest';
import seeds from '../../../seed-catalog/catalog.json';
import { discover, fetchCatalog } from './discovery';
const catalog = seeds.map(v => ({ ...v, trustStatus:'verified', trustLastCheckedAt:new Date().toISOString() }));
describe('discovery', () => {
  it.each([
    ['Please summarize my meeting notes and find the action items','meeting-notes'],
    ['Organize receipts for reimbursement','expense-report-formatter'],
    ['Can you prioritize customer inbox messages','customer-email-triage'],
    ['Review a code change','code-review-checklist'],
    ['Write a project brief','project-brief'],
    ['Check a spreadsheet for missing values','spreadsheet-quality-check'],
  ])('matches ordinary task: %s', (goal,id) => expect(discover(catalog,goal,'claude')[0].entry.id).toBe(id));
  it('returns no matches for unrelated goals or empty input', () => {
    expect(discover(catalog,'Plan a hiking trip','copilot')).toEqual([]);
    expect(discover(catalog,'','claude')).toEqual([]);
  });
  it('excludes unsafe, stale and incompatible entries', () => {
    for (const change of [{trustStatus:'flagged'}, {trustLastCheckedAt:'2020-01-01T00:00:00Z'}, {compatiblePlatforms:['claude']}]) expect(discover(catalog.map(v=>({...v,...change})),'summarize meeting notes','copilot')).toEqual([]);
  });
  it('limits ambiguous matches and keeps ranks stable', () => {
    const query='meeting project notes brief expense report';
    expect(discover(catalog,query,'claude').length).toBeLessThanOrEqual(3);
    expect(discover(catalog,query,'claude')).toEqual(discover([...catalog].reverse(),query,'claude'));
  });
  it('handles unavailable and malformed catalog responses', async () => {
    await expect(fetchCatalog('/',async()=>new Response('',{status:503}))).rejects.toThrow(/unavailable/);
    await expect(fetchCatalog('/',async()=>Response.json([{plainDescription:'>-'}]))).rejects.toThrow();
  });
});
