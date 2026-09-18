import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { z } from 'zod';
import { SCANNER_VERSION, type ScanEvidence } from './index';
const exec = promisify(execFile);
const reportSchema = z.object({
  skill_name: z.string(), timestamp: z.string().datetime({ offset: true }),
  findings_count: z.number().int().nonnegative(),
  findings: z.array(z.object({ rule_id: z.string(), severity: z.enum(['INFO','LOW','MEDIUM','HIGH','CRITICAL']), title: z.string() })),
  analyzers_used: z.array(z.string()).min(1),
  analyzers_failed: z.array(z.unknown()).optional(),
});
export function parseScannerReport(raw: unknown): ScanEvidence {
  const parsed = reportSchema.parse(raw);
  if (!parsed.analyzers_used.includes('static_analyzer') || parsed.analyzers_failed?.length) throw new Error('Security analysis did not complete.');
  if (parsed.findings_count !== parsed.findings.length) throw new Error('Security report is incomplete.');
  return { scanner: 'cisco-ai-skill-scanner', version: SCANNER_VERSION, checkedAt: new Date(parsed.timestamp).toISOString(), findings: parsed.findings.map(f => ({ ruleId: f.rule_id, severity: f.severity, title: f.title })) };
}
export function ciscoScanner(root: string) {
  const command = resolve(root, process.platform === 'win32' ? '.venv/Scripts/skill-scanner.exe' : '.venv/bin/skill-scanner');
  return async (directory: string): Promise<ScanEvidence> => {
    const temporary = await mkdtemp(join(tmpdir(), 'concierge-scan-'));
    const output = join(temporary, 'report.json');
    try {
      const options = { timeout: 120_000, maxBuffer: 4_000_000, windowsHide: true, env: { PATH: process.env.PATH, SystemRoot: process.env.SystemRoot, TEMP: temporary, TMP: temporary, PYTHONUTF8: '1', PYTHONIOENCODING: 'utf-8', HOME: temporary, USERPROFILE: temporary } };
      const version = await exec(command, ['--version'], options);
      if (version.stdout.trim() !== 'skill-scanner ' + SCANNER_VERSION) throw new Error('Install the pinned scanner version.');
      await exec(command, ['scan', directory, '--policy', 'strict', '--format', 'json', '--output', output], options);
      return parseScannerReport(JSON.parse(await readFile(output, 'utf8')));
    } catch (error) {
      throw new Error('Security scan failed; nothing can be approved or published.', { cause: error });
    } finally {
      await rm(temporary, { recursive: true, force: true });
    }
  };
}
