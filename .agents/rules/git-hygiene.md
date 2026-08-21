# Git Hygiene

## Working Tree

- Check `git status --short` before edits that touch more than one file.
- Never revert, delete, or overwrite user changes unless explicitly requested.
- If unrelated files are dirty, leave them alone.
- If a file you need is dirty, read it carefully and work with the current content.

## Secrets and Local Files

- Never commit `.env`, `.env.*`, auth state, reports, traces, or local test outputs.
- To stop tracking a local-only file without deleting it, use `git rm --cached`, not filesystem deletion.

## Pre-commit Hook

- `.githooks/pre-commit` runs typecheck, ESLint, the agent-adapter sync check, and the
  AUT-order audit as **blocking** checks; the tag and locator audits report as advisory.
- It is opt-in per clone: `git config core.hooksPath .githooks`. Never assume a
  contributor has it enabled — CI is the real gate.
- `SKIP_HOOKS=1 git commit ...` bypasses it. Only for a commit that genuinely cannot
  satisfy a check, and say so in the commit message.

## Git Commands

- Avoid destructive commands such as `git reset --hard`, `git checkout --`, and recursive deletes unless the user explicitly asks.
- Prefer non-interactive commands.
- Before removing directories, verify the resolved path is inside the repository.

## Final Reporting

- Report changed files and verification commands.
- If tests are not run, say why.
