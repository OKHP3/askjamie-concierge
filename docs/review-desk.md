# Local review desk

Run the catalog scan, build the review desk, then start `apps/api/src/server.ts` with tsx from the repository root. Open http://127.0.0.1:4174. The service serves its own frontend and API on the same loopback origin.

The local session uses an HttpOnly, SameSite=Strict cookie. Host and Origin checks reject cross-site calls; state-changing requests require same-origin JSON. No reviewer service or credential is included in the public Pages artifact. This is local operator access, not enterprise identity authentication.

Only current, mechanically clean, content-matching submissions enter the judgment queue. A reviewer reads the skill and any scanner notes, assesses scope, triggering, usefulness, data handling, and attribution, and provides a rationale. Overlap requires a separate explanation. A short-lived file lock prevents concurrent writes; the decision file is replaced atomically. Changed, already-reviewed, and failed submissions cannot be approved.

Decisions persist to `catalog/reviews.json`; submit that diff in a pull request. Recording approval does not bypass CI or deploy directly. A reviewer's displayed name is self-reported and the Git author/PR history provides publication accountability.

A crashed process can leave `.data/review.lock`. Confirm no review server is writing before removing that one lock file. Keep the previous review records; never erase them to clear a queue.
