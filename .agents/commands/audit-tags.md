---
description: Audit Playwright tests for missing TC, feature, role, or priority tags
---

Run the tag compliance audit:

```bash
npm run audit:tags
```

Every `tag: [...]` block in spec files must include:
- one `@AUT-E2E-*` or `@AUT-FV-*` tag from Automation Mapping
- one feature tag (e.g. `@feeds`, `@products`)
- one role tag: `@buyer` or `@creator`
- one priority tag: `@smoke`, `@regression`, or `@sanity`

`@TAT-*` tags are retired and will fail the audit. Remap via `.agents/skills/migrate-unmapped-aut/SKILL.md`.

For fixes, read `.agents/skills/tag-compliance/SKILL.md`. Do not invent `@AUT-*` IDs without a validated Automation Mapping row.
