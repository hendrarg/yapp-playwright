---
description: Audit page objects for fragile locators and specs for inline locators
---

Run the locator audit script:

```bash
npm run audit:locators
```

Findings include:
- CSS/XPath-only locators in `src/pages/`
- Page objects with locators but no `smartLocator`
- Inline locators in spec files (forbidden)

Upgrade findings to `smartLocator` when touching those files. See `.agents/skills/generate-locators-mcp/SKILL.md` for browser-driven locator generation.
