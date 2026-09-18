import { it, expect } from 'vitest';
import seeds from '../../../seed-catalog/catalog.json';
import { catalogEntrySchema } from '@askjamie/catalog-schema';
import { applicationGuide, saveFeedback, clearFeedback, FEEDBACK_KEY } from './application';
const entry=catalogEntrySchema.parse({...seeds[0],trustStatus:'verified',trustLastCheckedAt:new Date().toISOString()});
it('wires the same skill to each supported platform and blocks expired guidance',()=>{
  expect(applicationGuide(entry,'claude').path).toBe('.claude/skills/meeting-notes/SKILL.md');
  expect(applicationGuide(entry,'copilot').path).toBe('.github/skills/meeting-notes/SKILL.md');
  expect(()=>applicationGuide({...entry,trustStatus:'flagged'},'claude')).toThrow();
});
it('persists only bounded outcome metadata and permits clearing it',()=>{
  const data=new Map<string,string>();
  const storage={getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>{data.set(k,v);},removeItem:(k:string)=>{data.delete(k);}};
  for(let i=0;i<105;i++)saveFeedback(storage,entry,'claude','helped');
  const saved=JSON.parse(data.get(FEEDBACK_KEY)!);
  expect(saved).toHaveLength(100);
  expect(Object.keys(saved[0]).sort()).toEqual(['outcome','platform','recordedAt','skillId','version']);
  clearFeedback(storage);expect(data.size).toBe(0);
});
it('reports storage write failure instead of claiming feedback was saved',()=>{
  expect(()=>saveFeedback({getItem:()=>null,setItem:()=>{throw new Error('Storage blocked');},removeItem:()=>{}},entry,'claude','partly')).toThrow(/Storage blocked/);
});
