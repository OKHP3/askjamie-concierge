import { readFile, readdir, mkdir, writeFile, appendFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { parseDocument } from 'yaml';
import { actionPins, cell, newestStable, stableVersion, versionStatus, type VersionStatus } from './technology-policy';

type Row = { ecosystem: string; name: string; scope: string; current: string; latest?: string; source: string; locations: string[]; status: VersionStatus; note?: string };
const rows: Row[] = [];
const errors: string[] = [];
const cache = new Map<string, Promise<any>>();
const root = process.cwd();
const output = resolve(root, '.data/technology');
const checkedAt = new Date().toISOString();
const read = (path: string) => readFile(resolve(root, path), 'utf8');
function yaml(text: string) {
  const doc = parseDocument(text, { uniqueKeys: true });
  if (doc.errors.length) throw new Error('Invalid YAML in technology evidence.');
  return doc.toJS();
}
async function request(url: string): Promise<any> {
  if (!cache.has(url)) cache.set(url, (async () => {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const headers: Record<string, string> = { 'User-Agent': 'askjamie-technology-audit' };
        // Never send the GitHub token to package registries or release sites.
        if (new URL(url).origin === 'https://api.github.com') {
          headers['X-GitHub-Api-Version'] = '2022-11-28';
          if (process.env.GH_TOKEN) headers.Authorization = 'Bearer ' + process.env.GH_TOKEN;
        }
        const response = await fetch(url, { headers, signal: AbortSignal.timeout(20_000) });
        if (!response.ok) throw new Error('Upstream returned HTTP ' + response.status);
        return response.headers.get('content-type')?.includes('json') ? response.json() : response.text();
      } catch (error) {
        if (attempt === 2) throw error;
        await new Promise(done => setTimeout(done, 500 * (attempt + 1)));
      }
    }
  })());
  return cache.get(url);
}
async function inspect(row: Omit<Row, 'status'>, latest: () => Promise<string>) {
  try {
    row.latest = await latest();
    if (!stableVersion(row.latest)) throw new Error('Upstream did not identify a stable final version.');
    const status = versionStatus(row.current, row.latest);
    rows.push({ ...row, status });
    if (status === 'unknown') errors.push(row.name + ': current version is not verified.');
  } catch (error) {
    const note = error instanceof Error ? error.message : 'Lookup failed';
    errors.push(row.name + ': ' + note);
    rows.push({ ...row, status: 'unknown', note });
  }
}
async function parallel<T>(items: T[], work: (item: T) => Promise<void>) {
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(6, items.length) }, async () => {
    while (next < items.length) await work(items[next++]);
  }));
}
function command(program: string, args: string[]): string {
  return execFileSync(program, args, { cwd: root, encoding: 'utf8', windowsHide: true, timeout: 30_000 }).trim();
}
function npmLatest(name: string) {
  return async () => (await request('https://registry.npmjs.org/' + encodeURIComponent(name) + '/latest')).version as string;
}
function pypiLatest(name: string) {
  return async () => {
    const metadata = await request('https://pypi.org/pypi/' + encodeURIComponent(name) + '/json');
    // Release metadata can include yanked and pre-release uploads; neither is a candidate.
    return newestStable(Object.entries(metadata.releases).filter(([, files]) =>
      (files as any[]).some(file => !file.yanked)).map(([version]) => version));
  };
}

const pkg = JSON.parse(await read('package.json'));
const lock = yaml(await read('pnpm-lock.yaml'));
if (String(lock.lockfileVersion) !== '9.0' || !lock.importers || !lock.packages) throw new Error('Unsupported pnpm lockfile; update the inventory reader before upgrading pnpm.');
const direct = new Map<string, Set<string>>();
for (const [path, importer] of Object.entries(lock.importers) as [string, any][]) {
  for (const kind of ['dependencies', 'devDependencies', 'optionalDependencies']) {
    for (const name of Object.keys(importer[kind] ?? {})) {
      if (!direct.has(name)) direct.set(name, new Set());
      direct.get(name)!.add(path === '.' ? 'package.json' : path + '/package.json');
    }
  }
}
await parallel(Object.keys(lock.packages), async key => {
  const split = key.lastIndexOf('@');
  if (split < 1) throw new Error('Unsupported dependency identifier: ' + key);
  const name = key.slice(0, split), current = key.slice(split + 1);
  await inspect({ ecosystem: 'npm', name, scope: direct.has(name) ? 'direct' : 'transitive/platform', current,
    source: 'https://registry.npmjs.org/' + encodeURIComponent(name) + '/latest', locations: [...(direct.get(name) ?? ['pnpm-lock.yaml'])] }, npmLatest(name));
});

const python = process.platform === 'win32' ? '.venv/Scripts/python.exe' : '.venv/bin/python';
try {
  const installed = JSON.parse(command(resolve(python), ['-c', 'import importlib.metadata as m,json,sys; print(json.dumps({"version":".".join(map(str,sys.version_info[:3])),"packages":[{"name":d.metadata["Name"],"version":d.version} for d in m.distributions()]}))']));
  const scannerRequirements = await read('packages/trust-pipeline/requirements.txt');
  const scannerVersion = scannerRequirements.match(/^cisco-ai-skill-scanner==([^\s]+)$/m)?.[1];
  if (!scannerVersion || !installed.packages.some((item: any) => item.name === 'cisco-ai-skill-scanner' && item.version === scannerVersion)) throw new Error('Installed scanner does not match requirements.txt.');
  await parallel(installed.packages as { name: string; version: string }[], async item => inspect({ ecosystem: 'PyPI', name: item.name,
    scope: item.name === 'cisco-ai-skill-scanner' ? 'direct' : 'installed transitive/tool', current: item.version,
    source: 'https://pypi.org/pypi/' + encodeURIComponent(item.name) + '/json', locations: ['packages/trust-pipeline/requirements.txt'],
    note: 'Installed snapshot; transitive Python versions are not locked in the repository.' }, pypiLatest(item.name)));
  const pythonAction = yaml(await read('.github/actions/setup-scanner/action.yml'));
  const pythonLine = String(pythonAction.runs.steps.find((step: any) => step.uses?.startsWith('actions/setup-python@')).with['python-version']);
  const pythonVersions = async () => {
    const html = await request('https://www.python.org/downloads/');
    const versions = [...String(html).matchAll(/>Python (\d+\.\d+\.\d+)</g)].map(match => match[1]);
    return versions;
  };
  await inspect({ ecosystem: 'runtime', name: 'Python', scope: 'runtime', current: installed.version, locations: ['.github/actions/setup-scanner/action.yml'],
    source: 'https://www.python.org/downloads/', note: 'CI selects ' + pythonLine + '; this is the observed local/runner version.' }, async () => newestStable(await pythonVersions()));
  await inspect({ ecosystem: 'runtime', name: 'Python supported line', scope: 'runtime', current: installed.version, locations: ['.github/actions/setup-scanner/action.yml'],
    source: 'https://www.python.org/downloads/', note: 'Latest stable patch within configured ' + pythonLine + '.' }, async () => newestStable((await pythonVersions()).filter(v => v.startsWith(pythonLine + '.'))));
} catch (error) { errors.push('Python inventory incomplete: ' + (error instanceof Error ? error.message : 'failed')); }

const nodeAction = yaml(await read('.github/actions/setup-node/action.yml'));
const nodeLine = String(nodeAction.runs.steps.find((step: any) => step.uses?.startsWith('actions/setup-node@')).with['node-version']);
for (const channel of ['Current', 'LTS', 'supported line']) await inspect({ ecosystem: 'runtime', name: 'Node.js ' + channel, scope: 'runtime',
  current: process.versions.node, source: 'https://nodejs.org/dist/index.json', locations: ['package.json', '.github/actions/setup-node/action.yml'],
  note: 'CI selects ' + nodeLine + '; engine constraint: ' + pkg.engines.node + '. Current need not be LTS.' }, async () => {
  const releases = await request('https://nodejs.org/dist/index.json');
  return newestStable(releases.filter((r: any) => channel === 'LTS' ? r.lts : channel === 'supported line' ? r.version.startsWith('v' + nodeLine + '.') : true).map((r: any) => r.version)).replace(/^v/, '');
});
await inspect({ ecosystem: 'tool', name: 'pnpm', scope: 'toolchain', current: pkg.packageManager.split('@')[1], source: 'https://registry.npmjs.org/pnpm/latest', locations: ['package.json'],
  note: 'Repository pin; upgrade the packageManager field and regenerate the lockfile together.' }, npmLatest('pnpm'));
try {
  const apiVersion = (await read('scripts/github.ts')).match(/'X-GitHub-Api-Version':\s*'([\d-]+)'/)?.[1];
  const apiVersions = await request('https://api.github.com/versions');
  if (!apiVersion || !Array.isArray(apiVersions) || !apiVersions.length || !apiVersions.every(v => /^\d{4}-\d{2}-\d{2}$/.test(v))) throw new Error('API version evidence unavailable.');
  const latest = apiVersions.sort().at(-1)!;
  rows.push({ ecosystem: 'service', name: 'GitHub REST API', scope: 'service', current: apiVersion, latest,
    status: apiVersion === latest ? 'current' : apiVersion < latest ? 'update available' : 'ahead of stable',
    source: 'https://api.github.com/versions', locations: ['scripts/github.ts'], note: 'Review breaking changes and health/triage behavior before changing the version header.' });
} catch (error) { errors.push('GitHub API inventory incomplete: ' + (error instanceof Error ? error.message : 'failed')); }
for (const item of [{ name: 'corepack', program: 'corepack', source: 'https://registry.npmjs.org/corepack/latest', latest: npmLatest('corepack') },
  { name: 'uv', program: 'uv', source: 'https://pypi.org/pypi/uv/json', latest: pypiLatest('uv') }]) {
  try {
    const current = (process.platform === 'win32' && item.program === 'corepack'
      ? command(process.execPath, [resolve(dirname(process.execPath), 'node_modules/corepack/dist/corepack.js'), '--version'])
      : command(item.program, ['--version'])).match(/\d+\.\d+\.\d+/)?.[0];
    if (current) await inspect({ ecosystem: 'tool', name: item.name, scope: 'optional local tool', current, source: item.source, locations: ['README.md'] }, item.latest);
  } catch { /* Optional installers are not required in hosted CI. */ }
}

const actionFiles = (await readdir('.github/workflows')).filter(file => /\.ya?ml$/.test(file)).map(file => '.github/workflows/' + file);
for (const directory of await readdir('.github/actions')) actionFiles.push('.github/actions/' + directory + '/action.yml');
const actions = new Map<string, Set<string>>();
for (const file of actionFiles) for (const key of actionPins(await read(file))) {
  if (!actions.has(key)) actions.set(key, new Set());
  actions.get(key)!.add(file);
}
await parallel([...actions.entries()], async ([key, locations]) => {
  const [name, sha] = key.split('@');
  const row: Omit<Row, 'status'> = { ecosystem: 'GitHub Actions', name, scope: 'action', current: sha, source: 'https://github.com/' + name + '/releases', locations: [...locations] };
  await inspect(row, async () => {
    const release = await request('https://api.github.com/repos/' + name + '/releases/latest');
    if (release.draft || release.prerelease) throw new Error('Stable GitHub release unavailable.');
    // Resolve a full release tag from the actual pinned commit, not its nearby comment.
    for (let page = 1; page <= 10; page++) {
      const tags = await request('https://api.github.com/repos/' + name + '/tags?per_page=100&page=' + page);
      const matching = tags.filter((tag: any) => tag.commit.sha === sha && /^v?\d+\.\d+\.\d+$/.test(tag.name));
      if (matching.length) { row.current = newestStable(matching.map((tag: any) => tag.name)); break; }
      if (tags.length < 100) break;
    }
    row.note = 'Pinned commit: ' + sha;
    return release.tag_name;
  });
});

rows.sort((a, b) => (a.ecosystem + '/' + a.name + '/' + a.current).localeCompare(b.ecosystem + '/' + b.name + '/' + b.current));
const commit = command('git', ['rev-parse', 'HEAD']);
const dirty = Boolean(command('git', ['status', '--porcelain']));
const report = { checkedAt, commit, dirty, scope: 'npm lockfile including optional platforms; Python installed environment; runtime and action pins', rows, errors };
const table = (entries: Row[]) => '| Technology | In place | Latest stable | Status | Evidence |\n| --- | --- | --- | --- | --- |\n' + entries.map(row =>
  '| ' + [row.name, row.current, row.latest ?? 'unknown', row.status, '[upstream](' + row.source + ')'].map(cell).join(' | ') + ' |').join('\n');
const markdown = '# Technology version audit\n\nChecked: ' + checkedAt + '. Source commit: `' + commit + '`' + (dirty ? ' plus working changes' : '') + '.\n\n' +
  'A successful audit means the lookups completed, not that every dependency is current or safe. Newer versions are candidates, not compatibility approval. Python versions describe this environment; npm versions describe the lockfile, including optional platform packages.\n\n' +
  ['direct', 'runtime', 'toolchain', 'optional local tool', 'service', 'action', 'transitive/platform', 'installed transitive/tool'].map(scope => '## ' + scope + '\n\n' + table(rows.filter(row => row.scope === scope)) + '\n').join('\n') +
  '\n## Lookup failures\n\n' + (errors.length ? errors.map(error => '- ' + cell(error)).join('\n') : 'None.') + '\n';
await mkdir(output, { recursive: true });
await writeFile(resolve(output, 'inventory.json'), JSON.stringify(report, null, 2) + '\n');
await writeFile(resolve(output, 'inventory.md'), markdown);
if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, markdown);
console.log(JSON.stringify({ checkedAt, entries: rows.length, updates: rows.filter(row => row.status === 'update available').length, errors, output: '.data/technology' }, null, 2));
if (errors.length) process.exitCode = 1;
