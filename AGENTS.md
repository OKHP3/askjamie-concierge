# Working on AskJamie Concierge

- Read `docs/architecture.md` and `docs/brand-voice.md` before making changes.
- Use only the AskJamie identity. Do not import unrelated project content, personal branding, historical names, or internal codenames. Use portable relative paths and derive repository coordinates from the runtime environment.
- Adapt approved third-party development tools to AskJamie guidance. Preserve required upstream attribution in license notices and clearly label retained upstream evaluation records as historical evidence, never current validation. These records are not runtime instructions or public catalog entries.
- Keep the product conversational. Recommend a strong match or a ranked shortlist, after asking which supported agent the person uses.
- Catalog metadata is separate from skill frontmatter. Contributions cannot assign trust status. Never publish without current mechanical evidence and a content-bound judgment decision.
- Scanner failure, missing evidence, malformed prose, stale approval, and unknown status fail closed. Review actions must be covered by tests from their first implementation.
- Use pnpm workspaces. Make small pull requests; run relevant tests, type checking, and build checks. Keep runtime artifacts and machine-specific configuration out of version control.
- Keep public Pages output separate from the private review service. Never place reviewer credentials in a frontend build.
- First-release scope excludes contribution interviews, organization-specific deployment, and billing. Document any proposed expansion before implementation.
- Preserve existing work. Start by checking Git status and refs. Do not rewrite published history or delete uncertain work.
- Review copy for calm, professional language. Do not imply that scanning guarantees safety or that an automated review was performed by a person.
