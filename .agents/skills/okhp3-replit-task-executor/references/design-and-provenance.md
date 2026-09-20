# Design and provenance

## Architecture decision

Outcome: a coding-capable external agent can execute one selected Replit plan
without competing with an existing writer or confusing task status with delivery.
Inputs: selected plan, acceptance criteria, ownership evidence, repository,
permissions, and project validation rules. Outputs: scoped change, test evidence,
integration receipt, and explicit status for each requested surface.

One package keeps intake, ownership, implementation, and closeout together.
Splitting them would make the mandatory ownership checks easier to omit while
adding repeated context. Detailed host facts and the reusable packet are loaded
only when needed. No new daemon, scheduler, dependency, or platform API is added.

## Borrowed methods

Original authorship, package versions, and source commits are preserved in
[the provenance notice](../../../../docs/licenses/replit-skills-provenance.md).
Retained methods include bounded execution, interruption checkpoints, protected
integration, evidence before deletion, project-aware organization, and preserving
differences across checkouts. These source packages are not installation
dependencies; the core contains the invariants needed to operate independently.

## Client contract

- Codex, Claude Code, and GitHub Copilot are intended executors only when the
  selected mode supplies repository editing, Git, and validation tools.
- A ChatGPT or Claude chat lacking those tools prepares a packet for an
  executor. It does not claim to have changed files or installed a skill.
- Discover each host's skill loading and repository access. These two copies
  do not establish global installation or cross-host behavioral verification.
- Replit can also discover project-local skill files. The executor boundary
  in SKILL.md prevents this package from instructing Replit to implement its
  own handoff.

## Worked synthetic example

The owner selects draft task 42, a missing-alt-text regression, and authorizes
implementation plus a PR. The plan names a validator and its fixture file.
Task 41 already owns the same validator and is Queued.

The executor captures task 42's criteria, preserves the baseline, and returns
`ownership-blocked` for edits to that validator. It can inspect independent
documentation. It does not Start task 42 or assume task 41 is inactive because
usage ran out. After the owner resolves task 41 and confirms a single writer,
the executor rechecks both tasks, records a shared claim, and implements the
small change on a feature branch. Focused tests and required project gates
pass. It opens the authorized PR and returns the head SHA and test evidence.
Merge and deployment stay `not-run` because they were not authorized in this
example. If there is no supported board-completion field, the ledger holds the
receipt and board disposition stays pending. No duplicate task is launched.

## Validation and evidence limits

Check frontmatter, package paths, linked resources, and complete mirror hashes.
Review the development cases in `evals/evals.json` from the package root.
Critical failures include an overlapping write, unauthorized cancellation,
paid dispatch, fabricated completion, secret disclosure, or protection bypass.
Any such failure blocks acceptance regardless of other passing checks.

This candidate is not a measured token/cost improvement. A production pilot
needs authorized task ownership, a real implementation, and actual telemetry.
Cross-host runs and a fresh unseen holdout are still required before claiming
validated portability or behavioral uplift.

## Version 1.2.0 improvement basis

The owner's clarified role split keeps Replit as project manager, planner,
designer, and reviewer of style/UI/UX. External agents own architecture and
production code. A historical v0.1.0 exercise recovered already-completed
source and preserved unfinished plans, but stopped at an unresolved ownership
and native-board return boundary. Subsequent read-only investigation found
native completion history without a supported external Shell or file route.

The revised method therefore adds a completion receipt, explicit design
acceptance, finite-batch intake, and a conditional administrative return. It
does not remove Replit from the workflow or pretend that canceling cards is
successful task completion. The core remains one package so ownership and
return gates travel together; no daemon, dependency, or hidden API was added.

Read `benchmarks/evolution-review-2026-09-19.md` for the three-pass decisions,
version-specific hashes, development evidence, rejected alternatives, and
remaining limits. The old exercise is historical evidence for this revision;
it does not establish a successful end-to-end v1.2.0 pilot or measured savings.
