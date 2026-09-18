import { resolve } from 'node:path';
import { ciscoScanner } from '../packages/trust-pipeline/src/scanner';
const scan = ciscoScanner(process.cwd());
const clean = await scan(resolve('tests/fixtures/scanner-clean'));
if (clean.findings.some(f => ['MEDIUM','HIGH','CRITICAL'].includes(f.severity))) throw new Error('Known-good fixture was blocked: ' + JSON.stringify(clean.findings));
const unsafe = await scan(resolve('tests/fixtures/scanner-unsafe'));
if (!unsafe.findings.some(f => ['HIGH','CRITICAL'].includes(f.severity))) throw new Error('Known-unsafe fixture escaped detection.');
console.log('Real scanner smoke passed: clean fixture admitted; unsafe fixture blocked.');
