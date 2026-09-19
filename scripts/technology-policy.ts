export type VersionStatus = 'current' | 'update available' | 'ahead of stable' | 'unknown';

// Supports stable npm versions and the numeric final releases used by PyPI.
// PyPI post releases are stable; prereleases and development builds are excluded.
export function stableVersion(value: unknown): value is string {
  return typeof value === 'string' && /^v?\d+(?:\.\d+){1,3}(?:\.post\d+)?$/.test(value);
}

export function compareVersions(a: string, b: string): number {
  if (!stableVersion(a) || !stableVersion(b)) throw new Error('A stable numeric version is required.');
  const [leftBase, leftPost] = a.replace(/^v/, '').split('.post');
  const [rightBase, rightPost] = b.replace(/^v/, '').split('.post');
  const left = leftBase.split('.').map(Number);
  const right = rightBase.split('.').map(Number);
  for (let i = 0; i < Math.max(left.length, right.length); i++) {
    const delta = (left[i] ?? 0) - (right[i] ?? 0);
    if (delta) return Math.sign(delta);
  }
  return Math.sign((leftPost === undefined ? -1 : Number(leftPost)) - (rightPost === undefined ? -1 : Number(rightPost)));
}

export function versionStatus(current: string, latest?: string): VersionStatus {
  if (!stableVersion(current) || !stableVersion(latest)) return 'unknown';
  const order = compareVersions(current, latest);
  return order < 0 ? 'update available' : order > 0 ? 'ahead of stable' : 'current';
}

export function newestStable(values: string[]): string {
  const versions = values.filter(stableVersion).sort((a, b) => compareVersions(b, a));
  if (!versions.length) throw new Error('No stable release was returned.');
  return versions[0];
}

export function scannerPin(requirements: string, declared: string): string {
  const matches = [...requirements.matchAll(/^cisco-ai-skill-scanner==(\d+\.\d+\.\d+)\s*$/gm)];
  if (matches.length !== 1 || matches[0][1] !== declared) {
    throw new Error('Scanner requirement and evidence identity must be upgraded together.');
  }
  return declared;
}

export function cell(value: string): string {
  return value.replace(/[\r\n]+/g, ' ').replace(/\|/g, '&#124;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function actionPins(text: string): string[] {
  return [...text.matchAll(/uses:\s*([^\s#]+)/g)].map(match => match[1]).filter(value => !value.startsWith('./')).map(value => {
    if (!/^[\w.-]+\/[\w.-]+@[a-f0-9]{40}$/.test(value)) throw new Error('Unsupported or unpinned external action: ' + value);
    return value;
  });
}
