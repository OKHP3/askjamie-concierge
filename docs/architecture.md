# Architecture and decisions

## Product boundary

The concierge guides a person from a task description to a reviewed skill and practical installation steps. It does not execute skills, send their task to a model, or claim universal platform support. The first release uses deterministic matching over plain-language catalog metadata. This keeps task text in the browser and needs no model API credentials.

## Workspace

| Location | Responsibility |
| --- | --- |
| `apps/concierge` | Public React/Vite application, published to GitHub Pages |
| `apps/review-desk` | Local reviewer interface with automated tests |
| `apps/api` | Shared application services and local reviewer HTTP server |
| `packages/catalog-schema` | Validated catalog and submission types |
| `packages/trust-pipeline` | Security adapter, package validation, duplication and judgment gates |
| `packages/ui-kit` | Shared tokens and accessible UI primitives |
| `seed-catalog` | Original business skills and metadata |

GitHub Pages cannot run a backend. The public app consumes a build-time, validated snapshot through a browser-safe adapter of the shared service. The review desk uses the same service over a loopback-only HTTP API. A centrally hosted API and enterprise identity integration require a later deployment decision.

Skill downloads use content-addressed public paths. The guide exposes a download
button rather than a persistent file link, checks review freshness before fetching,
and checks again after the response body arrives before saving it. Public Pages
URLs remain public: client-side checks cannot revoke a previously copied address
or an already downloaded file.

Feedback is recorded only in the user's browser in this release, with an explicit notice and a clear-history control. It is not presented as centrally collected analytics.

## Evidence and download boundaries

Starting a catalog scan invalidates the previous assessment file before input validation. Only a complete scan writes replacement evidence; concurrent scans are refused. Persisted assessments are validated at review, admission, and publication boundaries, including their scanner identity and consistency between findings and pass status.

Published instruction downloads use a SHA-256 content path. Publication checks the normalized file bytes against that hash, and the application rechecks review freshness when a person downloads or copies installation guidance. A stale page cannot silently retrieve changed instructions under the same URL.

Submission triage accepts automated admission results only when the pull request changes catalog metadata or instruction text inside the seed catalog. Changes to code, dependencies, or workflows remain in automated review until handled separately. Triage preserves unrelated labels, avoids duplicate run comments, and rechecks the pull request head before changing its state. Scheduled re-audit publication also requires tests, type checking, and the publishing-policy check while retaining the ability to remove downloads after adverse findings.

## Licensing

MIT is the repository license. Scanner licensing and attribution remain distinct in `NOTICE`.

## Sharing and GitHub features

Gists belong to accounts, not repositories; there is no repository setting to enable them. Reviewed, versioned examples live in `docs/examples/`. Issue and Discussion forms provide structured requests. Projects track contribution stages and the separate product roadmap. No empty catalog categories are created.

## Phases

1. Discovery and application against a small seed catalog; operational trust checks, reviewer decisions, scheduled auditing, and independently checked publication.
2. Contribution interviews only after trust handling is proven with real submissions beyond the seed catalog.
3. Any organization-specific hosting or identity integration needs its own proposal.
