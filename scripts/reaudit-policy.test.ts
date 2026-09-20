import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
it('requires tests, type checking and publishing policy before a scheduled re-audit can upload or deploy', () => {
  const workflow = parse(readFileSync('.github/workflows/scheduled-reaudit.yml', 'utf8'));
  const steps = workflow.jobs.audit.steps;
  const gate = steps.findIndex((step:any) => step.run?.includes('scripts/check.ts validation-smoke'));
  expect(gate).toBeGreaterThan(-1);
  expect(steps[gate]['continue-on-error']).not.toBe(true);
  expect(steps[gate].if).toBeUndefined();
  expect(steps[gate].run).toContain('scripts/check.ts publishing-trigger-check');
  expect(steps.findIndex((step:any) => step.run?.includes('scripts/prepare-public.ts'))).toBeGreaterThan(gate);
  expect(steps.findIndex((step:any) => step.uses?.startsWith('actions/upload-pages-artifact@'))).toBeGreaterThan(gate);
  expect(workflow.jobs.deploy.needs).toBe('audit');
  expect(workflow.jobs.deploy.if).toBe("github.ref == 'refs/heads/main'");
  // A security finding must still be able to remove an admitted package from the live catalog.
  expect(steps.some((step:any) => step.run?.includes('prepare-public.ts --reaudit'))).toBe(true);
});
