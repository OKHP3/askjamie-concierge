import { it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { actionPins, stableVersion, compareVersions, newestStable, versionStatus, scannerPin } from './technology-policy';
import { SCANNER_VERSION } from '../packages/trust-pipeline/src/index';

it('compares numeric versions without lexicographic or prerelease mistakes', () => {
  expect(compareVersions('10.10.0', '10.9.9')).toBe(1);
  expect(compareVersions('v2.1.0', '2.1')).toBe(0);
  expect(compareVersions('2.1.0.post1', '2.1.0')).toBe(1);
  expect(newestStable(['3.15.0rc1', '3.14.7', '3.12.14', '3.15.0-beta.1'])).toBe('3.14.7');
  for (const value of ['latest', 'v7', '1.0.0-rc.1', '1.0.dev1', '1.0.0+build', '', undefined]) expect(stableVersion(value)).toBe(false);
  expect(() => newestStable(['3.15.0rc1'])).toThrow();
});

it('does not interpret unknown or ahead-of-registry versions as current', () => {
  expect(versionStatus('2.0.0', '2.0.0')).toBe('current');
  expect(versionStatus('2.0.0', '3.0.0')).toBe('update available');
  expect(versionStatus('3.0.0', '2.0.0')).toBe('ahead of stable');
  expect(versionStatus('2.0.0')).toBe('unknown');
  expect(versionStatus('a'.repeat(40), '2.0.0')).toBe('unknown');
});

it('does not silently omit an action after an unsupported pin change', () => {
  const pinned = 'actions/checkout@' + 'a'.repeat(40);
  expect(actionPins('- uses: ' + pinned + ' # v7\n- uses: ./.github/actions/setup-node')).toEqual([pinned]);
  for (const value of ['actions/checkout@v7', 'actions/checkout@main', 'docker://example:latest']) expect(() => actionPins('- uses: ' + value)).toThrow();
});

it('blocks scanner-only upgrades that would mislabel or reject security evidence', () => {
  const requirements = readFileSync('packages/trust-pipeline/requirements.txt', 'utf8');
  expect(scannerPin(requirements, SCANNER_VERSION)).toBe(SCANNER_VERSION);
  expect(() => scannerPin('cisco-ai-skill-scanner==99.0.0\n', SCANNER_VERSION)).toThrow(/together/);
  expect(() => scannerPin(requirements + requirements, SCANNER_VERSION)).toThrow();
  expect(() => scannerPin('cisco-ai-skill-scanner>=2\n', SCANNER_VERSION)).toThrow();
});

it('covers workspace packages, the scanner and both composite action directories', () => {
  const config = parse(readFileSync('.github/dependabot.yml', 'utf8'));
  expect(config.version).toBe(2);
  expect(config.updates.find((v: any) => v['package-ecosystem'] === 'npm').directory).toBe('/');
  expect(config.updates.find((v: any) => v['package-ecosystem'] === 'pip').directory).toBe('/packages/trust-pipeline');
  expect(config.updates.find((v: any) => v['package-ecosystem'] === 'github-actions').directories).toEqual(['/', '/.github/actions/setup-node', '/.github/actions/setup-scanner']);
  for (const update of config.updates) expect(update.schedule.interval).toBe('daily');
});

it('runs real release gates on scheduled runtime updates without publication permissions', () => {
  const workflow = parse(readFileSync('.github/workflows/technology-watch.yml', 'utf8'));
  expect(workflow.permissions).toEqual({ contents: 'read' });
  expect(Object.keys(workflow.on).sort()).toEqual(['pull_request', 'schedule', 'workflow_dispatch']);
  expect(workflow.jobs.validation.uses).toBe('./.github/workflows/release-validation.yml');
  expect(workflow.jobs.validation.if).toBe("github.event_name != 'pull_request'");
  expect(workflow.jobs.inventory.steps.find((step: any) => step.run)?.run).toBe('pnpm technology:audit');
  for (const file of ['setup-node', 'setup-scanner']) {
    const action = parse(readFileSync('.github/actions/' + file + '/action.yml', 'utf8'));
    expect(action.runs.steps.find((step: any) => step.with?.['check-latest'])?.with['check-latest']).toBe(true);
  }
});
