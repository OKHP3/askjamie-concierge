# Contributing

Start with a skill request in Issues or Discussions. Describe the recurring task and useful outcome using fictional data. The guided contribution interview is a later phase.

Maintainers can propose a package and plain-language metadata through a pull request labeled `skill-submission`. Use an original, business-appropriate example, MIT licensing, and clear attribution. Do not set trust fields. Review [the schema](docs/catalog-schema.md) and [trust policy](docs/trust-pipeline.md).

Automated checks run before judgment. Structural or security failures require a corrected submission. Description overlap needs a documented judgment decision; close trigger collisions need correction. Use the local review desk after running a fresh scan, then commit its content-bound decision. The release build remains blocked until approval is present.

Use the Contribution pipeline Project view for admission and the Product roadmap view for phase planning. See [community operations](docs/community.md). Discussion categories are General, Skill requests, Show and tell, and Trust and governance questions.

Before a pull request, run `pnpm validate`, `pnpm scan`, and `pnpm build`. Keep generated scan reports and build output out of Git. Changes to the review service need meaningful automated coverage.
