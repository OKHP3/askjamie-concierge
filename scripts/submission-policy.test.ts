import { describe, expect, it } from 'vitest';
import { admissionStage } from './submission-policy';
const passed = ['structural-validation','deduplication-check','security-scan'].map(name => ({name,conclusion:'success'}));
describe('submission triage', () => {
  it('allows judgment before a release build has a recorded decision', () => {
    expect(admissionStage([...passed,{name:'build-verification',conclusion:'failure'}])).toBe('human-review');
  });
  it('closes only a definite mechanical failure', () => {
    expect(admissionStage([...passed.filter(v=>v.name!=='security-scan'),{name:'security-scan',conclusion:'failure'}])).toBe('not-accepted');
  });
  it('never turns absent or cancelled evidence into an approval or rejection', () => {
    expect(admissionStage([])).toBe('automated-review');
    expect(admissionStage(passed.map(v=>({...v,conclusion:'cancelled'})))).toBe('automated-review');
  });
});
