import { createHash } from 'node:crypto';
import { readdir, readFile, lstat, realpath } from 'node:fs/promises';
import { resolve, relative, isAbsolute, dirname, sep, extname } from 'node:path';
import { parseDocument } from 'yaml';
import { z } from 'zod';
import { catalogEntrySchema, submissionSchema, findOverlaps, parseSubmission, type CatalogEntry, type Submission } from '@askjamie/catalog-schema';

export const SCANNER_VERSION = '2.1.0';
export const MAX_AGE_MS = 8 * 24 * 60 * 60 * 1000;
export const findingSchema = z.object({
  ruleId: z.string(), severity: z.enum(['INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL']), title: z.string(),
}).strict();
export type Finding = z.infer<typeof findingSchema>;
export type ScanEvidence = { scanner: string; version: string; checkedAt: string; findings: Finding[] };
export type Assessment = { submission: Submission; digest: string; evidence: ScanEvidence; overlaps: ReturnType<typeof findOverlaps>; mechanicalPassed: boolean };
export const assessmentSchema = z.object({
  submission: submissionSchema,
  digest: z.string().regex(/^[a-f0-9]{64}$/),
  evidence: z.object({
    scanner: z.string(), version: z.string(), checkedAt: z.iso.datetime(),
    findings: z.array(findingSchema),
  }).strict(),
  overlaps: z.array(z.object({
    id: z.string().min(1), kind: z.enum(['trigger', 'description']), similarity: z.number().min(0).max(1),
  }).strict()),
  mechanicalPassed: z.boolean(),
}).strict();
export function parseAssessment(value: unknown): Assessment {
  const parsed = assessmentSchema.parse(value);
  if (parsed.evidence.scanner !== 'cisco-ai-skill-scanner' || parsed.evidence.version !== SCANNER_VERSION) throw new Error('Unexpected scanner identity.');
  const mechanicalPassed = !parsed.evidence.findings.some(v => ['MEDIUM', 'HIGH', 'CRITICAL'].includes(v.severity));
  if (parsed.mechanicalPassed !== mechanicalPassed) throw new Error('Assessment pass flag conflicts with validated findings.');
  return { ...parsed, mechanicalPassed };
}
export const decisionSchema = z.object({
  id: z.string(), digest: z.string().regex(/^[a-f0-9]{64}$/),
  decision: z.enum(['approved', 'rejected']), reviewer: z.string().trim().min(2),
  reviewerKind: z.enum(['human', 'agent-assisted']), reviewedAt: z.iso.datetime(),
  rationale: z.string().trim().min(30), overlapRationale: z.string().trim().min(30).optional(),
}).strict();
export type Decision = z.infer<typeof decisionSchema>;
export type Scanner = (directory: string) => Promise<ScanEvidence>;

export async function inspectPackage(root: string, entry: Submission): Promise<{ directory: string; digest: string; content: string }> {
  const base = await realpath(root);
  const file = resolve(base, entry.sourcePackageRef);
  const directory = dirname(file);
  const rel = relative(base, directory);
  if (rel.startsWith('..') || isAbsolute(rel)) throw new Error('Package must stay inside the repository.');
  for (const part of rel.split(sep).reduce<string[]>((all, item) => [...all, all.length ? resolve(all.at(-1)!, item) : resolve(base, item)], [])) {
    if ((await lstat(part)).isSymbolicLink()) throw new Error('Symlinked package paths are not admitted.');
  }
  const files: { path: string; text: string }[] = [];
  async function visit(folder: string, depth = 0) {
    if (depth > 4) throw new Error('Package folders exceed the review depth limit.');
    for (const item of (await readdir(folder, { withFileTypes: true })).sort((a,b) => a.name.localeCompare(b.name))) {
      const path = resolve(folder, item.name);
      if (item.isSymbolicLink()) throw new Error('Symlinked package files are not admitted.');
      if (item.isDirectory()) await visit(path, depth + 1);
      else {
        if (!['.md', '.txt'].includes(extname(item.name).toLowerCase())) throw new Error('This release admits instruction text only; executable or dependency files need a policy review.');
        if (files.length >= 30 || (await lstat(path)).size > 100_000) throw new Error('Package exceeds the review size limit.');
        const bytes = await readFile(path);
        const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes).replace(/\r\n/g, '\n');
        if (text.includes('\0')) throw new Error('Binary package content is not supported.');
        files.push({ path: relative(directory, path).split(sep).join('/'), text });
      }
    }
  }
  await visit(directory);
  const content = files.find(v => v.path === 'SKILL.md')?.text;
  if (!content) throw new Error('SKILL.md is required.');
  const match = /^---\n([\s\S]*?)\n---\n([\s\S]+)$/.exec(content);
  if (!match) throw new Error('Skill frontmatter and instructions are required.');
  const yaml = parseDocument(match[1], { uniqueKeys: true });
  if (yaml.errors.length) throw new Error('Skill frontmatter must be valid YAML.');
  const frontmatter = z.object({
    name: z.string().max(64), description: z.string().trim().min(10).max(1024), license: z.literal('MIT'),
  }).strict().parse(yaml.toJS({ maxAliasCount: 0 }));
  if (frontmatter.name !== entry.id || !/^#[^\n]+/m.test(match[2]) || match[2].trim().length < 100) throw new Error('Skill identity or instructions are incomplete.');
  // Hash all package files and metadata. Changes invalidate the judgment decision.
  const digest = createHash('sha256').update(JSON.stringify({ entry, files })).digest('hex');
  return { directory, digest, content };
}
export async function assess(root: string, candidate: unknown, existing: Submission[], scanner: Scanner): Promise<Assessment> {
  const submission = parseSubmission(candidate, existing.filter(v => v.id !== (candidate as Submission)?.id));
  const pkg = await inspectPackage(root, submission);
  const evidence = await scanner(pkg.directory);
  if (evidence.scanner !== 'cisco-ai-skill-scanner' || evidence.version !== SCANNER_VERSION) throw new Error('Unexpected scanner identity.');
  if (!fresh(evidence.checkedAt)) throw new Error('Scanner evidence is stale or from the future.');
  const findings = evidence.findings.map(v => findingSchema.parse(v));
  return { submission, digest: pkg.digest, evidence: { ...evidence, findings }, overlaps: findOverlaps(submission, existing), mechanicalPassed: !findings.some(v => ['MEDIUM', 'HIGH', 'CRITICAL'].includes(v.severity)) };
}
export function fresh(checkedAt: string, now = Date.now()): boolean {
  const age = now - Date.parse(checkedAt);
  return Number.isFinite(age) && age >= -60_000 && age <= MAX_AGE_MS;
}
export function publish(assessment: Assessment, rawDecision?: unknown): CatalogEntry {
  return publishWithPolicy(assessment, rawDecision, false);
}
function publishWithPolicy(assessment: Assessment, rawDecision: unknown, retainModerate: boolean): CatalogEntry {
  assessment = parseAssessment(assessment);
  const decision = rawDecision === undefined ? undefined : decisionSchema.parse(rawDecision);
  const evidence = assessment.evidence;
  if (evidence.scanner !== 'cisco-ai-skill-scanner' || evidence.version !== SCANNER_VERSION) throw new Error('Unexpected scanner identity.');
  const findings = evidence.findings.map(v => findingSchema.parse(v));
  const prohibited = findings.some(v => (retainModerate ? ['HIGH', 'CRITICAL'] : ['MEDIUM', 'HIGH', 'CRITICAL']).includes(v.severity));
  if (decision && Date.parse(decision.reviewedAt) > Date.now() + 60_000) throw new Error('Review time cannot be in the future.');
  let trustStatus: CatalogEntry['trustStatus'] = 'pending-review';
  if ((!assessment.mechanicalPassed && !retainModerate) || prohibited) trustStatus = 'flagged';
  else if (decision?.digest === assessment.digest && decision.id === assessment.submission.id) {
    if (decision.decision === 'rejected') trustStatus = 'rejected';
    else if (!assessment.overlaps.length || decision.overlapRationale) trustStatus = 'verified';
  }
  if (!fresh(assessment.evidence.checkedAt)) trustStatus = 'pending-review';
  return catalogEntrySchema.parse({ ...assessment.submission, trustStatus, trustLastCheckedAt: assessment.evidence.checkedAt });
}
export function recordDecision(assessment: Assessment, input: unknown): Decision {
  assessment = parseAssessment(assessment);
  if (!assessment.mechanicalPassed || !fresh(assessment.evidence.checkedAt)) throw new Error('Current automated gates must pass before judgment review.');
  const decision = decisionSchema.parse(input);
  if (decision.id !== assessment.submission.id || decision.digest !== assessment.digest) throw new Error('The package changed. Reload before reviewing.');
  if (decision.decision === 'approved' && assessment.overlaps.length && !decision.overlapRationale) throw new Error('Explain why the overlapping capability should be admitted.');
  if (Date.parse(decision.reviewedAt) > Date.now() + 60_000) throw new Error('Review time cannot be in the future.');
  return decision;
}

export function publishReaudit(assessment: Assessment, rawDecision?: unknown): CatalogEntry {
  assessment = parseAssessment(assessment);
  const decision = rawDecision === undefined ? undefined : decisionSchema.parse(rawDecision);
  const previouslyApproved = decision?.decision === 'approved' && decision.digest === assessment.digest && decision.id === assessment.submission.id;
  const severe = assessment.evidence.findings.some(v => ['HIGH', 'CRITICAL'].includes(v.severity));
  // Only an unchanged, previously admitted package may retain status while a medium finding is reviewed.
  const retained = previouslyApproved && !severe && fresh(assessment.evidence.checkedAt);
  return publishWithPolicy(assessment, decision, retained);
}
