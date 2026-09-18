# Community operations

The repository enables Issues, Projects, and Discussions. The AskJamie Concierge Project has two saved views:

- **Contribution pipeline**: a board filtered to `label:skill-submission`, with Submitted, Automated review, Human review, Published, and Not accepted.
- **Product roadmap**: a table filtered to `label:roadmap`, keeping release phases separate from admission work.

The four product Discussion categories are General, Skill requests, Show and tell, and Trust and governance questions. Existing Announcements and Polls remain available as platform defaults. Issue forms collect useful context without requesting confidential data. Gists are account-level; repository examples are versioned under `docs/examples/`.

## Admission operations

Label a package pull request `skill-submission`; native Project automation adds new or updated matching items as Submitted. The same scoped intake includes roadmap issues. Validation runs without write credentials. A separate workflow, executing only trusted default-branch code, reads completed job results for the current pull request head. It never checks out or executes submission code with its write token.

A definite structural, duplication, or security job failure closes the pull request with an explanation and `not-accepted`. Missing or cancelled evidence stays in `automated-review`. Passing mechanical jobs receives `human-review`, independently of the release build, which still needs a recorded judgment decision. A curator must review usefulness in the local desk and commit the decision.

Project field movement is curator-managed from those evidence-backed labels. The repository workflow token cannot write account-level Projects, and no additional credential is required or stored for this release. Set Human review only after the mechanical jobs pass; set Published only after live catalog verification. Rejection needs a linked explanatory comment. Native shortcuts that infer judgment or publication from merge or closure are disabled.

The board is an operational view, not the trust authority. The pipeline enforces admission even if someone moves a card incorrectly. Phase 2 remains deferred until real submission handling has been demonstrated beyond the seed catalog.
