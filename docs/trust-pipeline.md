# Trust pipeline

## Dependency and limits

[Cisco AI Skill Scanner](https://github.com/cisco-ai-defense/skill-scanner) 2.1.0 (Apache-2.0) provides the security detection engine. The stable TypeScript adapter invokes its CLI without a shell, requires the pinned version, validates its JSON report, rejects partial analyzer results, and fails closed on errors or timeouts. See `NOTICE` and `docs/licenses/skill-scanner-Apache-2.0.txt`.

The strict static analyzer runs without model credentials or submission uploads. No clean scan guarantees safety. Dependency vulnerability feeds, sandbox execution and optional remote analyzers are not enabled. Seed skills contain instructions only, without executable dependencies. Introducing executable packages or dependencies requires a reviewed extension of the trust policy.

## Gates

1. Strict metadata ingest rejects malformed prose, paths, duplicate identifiers, and close trigger collisions.
2. Package validation checks YAML, matching name, substantive instructions, MIT licensing, UTF-8 files, size limits, and absence of symlinks.
3. Scan every file through the upstream scanner. Medium, high, or critical findings block new admission. Low and informational findings remain visible to the reviewer.
4. Compare description overlap against the catalog. A reviewer must document why any overlap warrants a separate entry.
5. Judgment evaluates scope, trigger clarity, expected result, data handling, limitations, usefulness, and attribution. Decisions bind to a SHA-256 of all package files and metadata. Edits invalidate approval.
6. Only the pipeline assigns trust status. A clean scan alone leaves an entry pending review.

An agent-assisted bootstrap review is explicitly identified as such. It is never represented as a human decision. Ongoing reviewers use the local review desk; mechanical failures cannot enter its approval queue.

## Recurring audit policy

Run every Monday at 06:15 UTC against all catalog packages, regardless of modifications. Reports expire after eight days; the public service excludes stale entries. A high or critical finding immediately demotes the skill to flagged in the generated publication, pending review. Medium or lower new findings open a tracking issue without silently removing a previously approved skill. Scanner failure blocks a fresh publication and opens an operational issue; it never produces a clean result. Scheduled decisions and scanner evidence are preserved as workflow artifacts.

## Local scanner

Create `.venv` using Python 3.12, then install `packages/trust-pipeline/requirements.txt`. Use `uv venv --python 3.12 .venv` and `uv pip install --python .venv/Scripts/python.exe -r packages/trust-pipeline/requirements.txt` on Windows; replace the Python path with `.venv/bin/python` on Linux/macOS.

Run `pnpm exec tsx scripts/scanner-smoke.ts` to exercise the real scanner against safe and deliberately unsafe fixtures. Fixtures are never copied into public output.
