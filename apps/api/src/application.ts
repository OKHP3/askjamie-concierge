import { catalogEntrySchema, platformNames, type CatalogEntry, type Platform } from '@askjamie/catalog-schema';
import { eligible } from './discovery';
export function applicationGuide(raw: CatalogEntry, platform: Platform) {
  const entry = catalogEntrySchema.parse(raw);
  if (!eligible(entry,platform)) throw new Error('This skill needs a current review before it can be used.');
  const folder = platform === 'claude' ? '.claude/skills/' : '.github/skills/';
  const path = folder + entry.id + '/SKILL.md';
  return {
    path,
    request: 'Please add the attached skill to this project as ' + path + '. Keep the file contents unchanged. Then explain when you would use it, and wait for me to provide the task material.',
    tryPrompt: 'Use the ' + entry.displayName + ' skill on the material I provide. Ask for anything missing, then prepare a result for me to review.',
    platformName:platformNames[platform],
    docsUrl:platform === 'claude' ? 'https://code.claude.com/docs/en/skills' : 'https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/customize-cloud-agent/add-skills',
  };
}
export type Outcome = 'helped' | 'partly' | 'not-yet';
export type Feedback = { skillId:string; version:string; platform:Platform; outcome:Outcome; recordedAt:string };
export const FEEDBACK_KEY = 'askjamie.feedback.v1';
type FeedbackStorage = Pick<Storage,'getItem'|'setItem'|'removeItem'>;
export function saveFeedback(storage: FeedbackStorage, entry:CatalogEntry, platform:Platform, outcome:Outcome): Feedback {
  if(!['helped','partly','not-yet'].includes(outcome) || !eligible(entry,platform))throw new Error('This feedback could not be recorded.');
  const feedback = {skillId:entry.id,version:entry.version,platform,outcome,recordedAt:new Date().toISOString()};
  let existing:Feedback[]=[];
  try {
    const raw:unknown=JSON.parse(storage.getItem(FEEDBACK_KEY) || '[]');
    if(Array.isArray(raw))existing=raw.filter((v):v is Feedback=>!!v && typeof v.skillId==='string' && typeof v.recordedAt==='string' && ['helped','partly','not-yet'].includes(v.outcome));
  } catch { /* Older or damaged browser data does not prevent a new explicit response. */ }
  storage.setItem(FEEDBACK_KEY,JSON.stringify([...existing.slice(-99),feedback]));
  return feedback;
}
export function clearFeedback(storage:FeedbackStorage) { storage.removeItem(FEEDBACK_KEY); }
