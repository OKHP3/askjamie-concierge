# AskJamie Concierge

Find a useful AI agent skill, understand what it does, and put it to work with clear guidance.

Describe a task in your own words. AskJamie Concierge recommends a strong match or a short ranked list from a small reviewed catalog, then explains how to use the skill with Claude Code or GitHub Copilot. Your goal stays in your browser.

## What is included

- Six original business skills: meeting notes, expense reports, customer email triage, code review checklists, project briefs, and spreadsheet quality checks.
- Platform-specific installation steps, downloadable skill files, and optional outcome feedback stored only in your browser.
- Strict catalog validation, real static security scanning, duplication checks, content-bound judgment decisions, and weekly re-audits.
- A tested local review desk that only admits mechanically eligible packages to its decision queue.
- Pull request validation, GitHub Pages delivery, independent live publication checks, and structured community intake.

The first catalog uses explicitly recorded **agent-assisted** judgment decisions. A clean static scan does not guarantee safety. Inspect the skill and review agent actions before using them with real information.

Matching is deterministic over plain-language metadata; this release does not send your goal to a model or execute a skill for you. The review desk runs locally. Feedback is not sent to a central analytics service.

## Run locally

Use Node.js 24.15 or later within 24.x, the pnpm version pinned in `package.json`, Python 3.12, and `uv`. CI requests the latest available patch in each supported runtime line. From the repository root:

```sh
corepack pnpm install --frozen-lockfile
uv venv --python 3.12 .venv
```

Install the scanner on Windows:

```powershell
uv pip install --python .venv/Scripts/python.exe -r packages/trust-pipeline/requirements.txt
```

On Linux or macOS:

```sh
uv pip install --python .venv/bin/python -r packages/trust-pipeline/requirements.txt
```

Then validate, scan, and build:

```sh
corepack pnpm validate
corepack pnpm exec tsx scripts/scanner-smoke.ts
corepack pnpm scan
corepack pnpm build
```

Start the concierge with `corepack pnpm dev`. After a build, start the local review desk with `corepack pnpm review` and open the loopback address printed by the server. Scan evidence is generated locally and is not committed.

## Documentation

- [Architecture and phase boundaries](docs/architecture.md)
- [Catalog schema](docs/catalog-schema.md) and [trust pipeline](docs/trust-pipeline.md)
- [Review desk](docs/review-desk.md) and [delivery operations](docs/delivery.md)
- [Community and Project operations](docs/community.md), [contribution guidance](CONTRIBUTING.md), and [copyable example](docs/examples/meeting-notes.md)
- [Brand voice](docs/brand-voice.md), [release verification](docs/release-verification.md), and [agent instructions](AGENTS.md)
- [Technology inventory](docs/technology-inventory.md) and [dependency update policy](docs/technology-maintenance.md)

Guided contribution interviews begin only after the trust process has been demonstrated with real submissions beyond the seed catalog. Enterprise deployment and billing are outside this release.

Licensed under [MIT](LICENSE). Third-party attribution is retained in [NOTICE](NOTICE).
