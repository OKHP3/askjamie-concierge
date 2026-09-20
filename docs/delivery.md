# Delivery and operations

## Validation lane

Every push and pull request runs named catalog integrity, structural validation, duplication, security, publishing policy, validation smoke, and build checks. The same reusable workflow gates Pages deployment. Security reports are passed to the build by artifact; publication rechecks package digests and evidence freshness. Missing approval, unknown status, and absent artifacts fail closed. External actions are pinned to full commits.

The publishing-policy validator checks exact watched paths, main-only execution, job dependencies, public artifact scope, protected environment, and limited permissions. Its negative fixtures deliberately remove gates and widen scope.

## Publication lane

Only the concierge and its build, catalog, trust, and shared UI dependencies trigger normal publication. Review-desk-only and documentation changes do not redeploy. Manual dispatch is main-only. Only the public build is uploaded; internal review state is not part of the Pages artifact.

The generated version file identifies the source commit. A build manifest hashes every public file. Pages is configured for Actions and the github-pages environment is limited to main.

## Independent health lane

Checks run every 30 minutes and after successful or failed publication workflows finish. Superseded, cancelled, and skipped runs do not create deployment incidents. The checker discovers the actual Pages URL from the API, finds the last successful deployment workflow's source commit, and verifies the live version, manifest, and each public file's SHA-256. It does not compare to the newest unrelated main commit.

Consecutive scheduled failure counts persist in a dedicated artifact across runs. Three consecutive scheduled failures open a publish-health issue; a deploy failure opens one immediately. Successful verification resets the counter and automatically closes an open incident. An optional HTTPS secret, `PUBLISH_HEALTH_WEBHOOK_URL`, receives one JSON notification when an incident opens and one on recovery. Continuing incidents do not repeat notifications. Notification delivery failure is logged without replaying a possibly delivered message.

Health-state retrieval errors fail visibly rather than resetting the counter. Operations are serialized. GitHub schedules are best effort and may run later than the requested time.

## Scheduled re-audit lane

Every Monday at 06:15 UTC the scanner inspects every published package. Findings open deduplicated trust-review issues. High/critical findings demote the generated catalog status and remove downloads from the next publication. Medium/low findings on an unchanged, previously approved entry retain publication pending review. New admissions still block at medium.

A weekly successful audit republishes fresh evidence even when the package did not change. Scanner failure opens a tracking issue and stops publication; the public app excludes evidence older than eight days. Status is pipeline-generated and not written by contributors or a bot bypassing main protections.

## Operator commands

Scans use an operating-system-owned loopback socket as a workspace mutex. The port is derived from the canonical repository path; the listener immediately closes incoming connections and accepts no commands. Process termination releases ownership automatically. `.data/scan.lock` records the owner for diagnostics only and is replaced or removed only while holding the mutex, so an interrupted scan's leftover file does not block recovery. An occupied port fails closed before changing evidence or metadata, including a collision with an unrelated local service; the reported port must be made available before retrying.

- `pnpm scan`: run all real security checks.
- `pnpm validate`: run type checks, tests, catalog integrity and publishing policy.
- `pnpm build`: use current scan evidence to build both applications and stamp public files.
- `pnpm dev`: run the concierge locally after scan and public preparation.
- `pnpm review`: serve the built review desk and its local API.
