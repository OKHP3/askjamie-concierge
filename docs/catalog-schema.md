# Catalog contract

The concierge sees simplified metadata, never parsed skill frontmatter. `packages/catalog-schema/src/index.ts` is the executable contract.

Submissions contain id, displayName, plainDescription, triggerHints, compatiblePlatforms, sourcePackageRef, contributedBy, and version. Unknown fields are rejected, including contributor-assigned trust fields. Paths must be relative and match the entry id. Descriptions are clean, nonempty, single-line prose; YAML block indicators, markup, and control characters are rejected, including a bare folded scalar indicator.

The pipeline alone constructs published entries by adding trustStatus and trustLastCheckedAt. Status is verified, pending-review, flagged, or rejected. Only verified, fresh entries are recommended.

Normalized trigger token Jaccard similarity of at least 0.72 rejects ingest pending revision. Description overlap of at least 0.65 queues a judgment decision. These are conservative lexical heuristics, not semantic equivalence guarantees; reviewers also inspect scope overlap. Identity collisions never silently replace entries.
