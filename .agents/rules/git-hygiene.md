# Git Hygiene

## Working Tree

- Check `git status --short` before edits that touch more than one file.
- Never revert, delete, or overwrite user changes unless explicitly requested.
- If unrelated files are dirty, leave them alone.
- If a file you need is dirty, read it carefully and work with the current content.

## Secrets and Local Files

- Never commit `.env`, `.env.*`, auth state, reports, traces, or local test outputs.
- `test-cases/` is local-only and ignored by Git. Do not force-add test case documents.
- To stop tracking a local-only file without deleting it, use `git rm --cached`, not filesystem deletion.

## Git Commands

- Avoid destructive commands such as `git reset --hard`, `git checkout --`, and recursive deletes unless the user explicitly asks.
- Prefer non-interactive commands.
- Before removing directories, verify the resolved path is inside the repository.

## Final Reporting

- Report changed files and verification commands.
- If tests are not run, say why.
