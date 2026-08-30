# Agent Runtime

This directory is the provider-neutral runtime for every AI agent working in this
repository — Claude Code, Codex, Cursor, and OpenCode all resolve back to here.
It is the **only** place to edit agent configuration.

| Path | Contents | Reached by |
|------|----------|------------|
| `AGENTS.md` | the project guide | Codex, Cursor, OpenCode directly; Claude Code via `CLAUDE.md` |
| `.agents/runtime.md`, `.agents/rules/` | always-on rules | read on demand (see load order); Cursor and OpenCode get them wired in |
| `.agents/skills/registry.md` | which skill to read for which task | on demand |
| `.agents/domain-knowledge/` | verified Yapp product behavior (Obsidian vault canonical; repo junction) | on demand, per product area |
| `.agents/skills/*/SKILL.md` | task workflows | synced to each tool's skill path |
| `.agents/commands/*.md` | operation catalog / slash commands | synced to each tool's command path |

Tool-specific copies (`.claude/skills/`, `.claude/commands/`, `.cursor/rules/`) are
**generated** by `npm run agents:sync` and git-ignored. Editing a generated copy is
always wrong — the change is silently lost on the next sync, and the other agents
never see it. Change the file here instead, then re-run the sync.

## Load Order

Before changing files or running task-specific commands, read:

1. `AGENTS.md`
2. `.agents/runtime.md`
3. `.agents/rules/code-style.md`
4. `.agents/rules/testing.md`
5. `.agents/rules/git-hygiene.md`
6. `.agents/rules/ci.md`

For task-specific work, also read the matching skill from `.agents/skills/registry.md`, and the matching product note from `.agents/domain-knowledge/README.md`.

## Rules

- `.agents/rules/` contains always-on project rules.
- These rules apply to all code changes, reviews, tests, and automation work.
- If a task-specific skill conflicts with a rule, **follow the rule**. Task skills add procedure; they do not weaken rule requirements unless the user explicitly overrides.
- Non-overridable without explicit user request: `smartLocator` for new/touched locators, minimum `@AUT-*` test depth, locators in page objects only, API cleanup for seeded data.

## Fast Path

Single-AUT automation and small Playwright maintenance use the inline fast path from `AGENTS.md`. A new AUT gets one short, local, uncommitted test-step plan; an update to an existing AUT gets no plan. Then use context, reuse audit, minimum edit, type-check, one isolated run, and stop on pass. Do not add brainstorming, long design/implementation plans, worktrees, subagents, repeated verification, or execution-mode questions unless an extended workflow condition in `AGENTS.md` is met.

## Domain Notes

- `.agents/domain-knowledge/` records how the Yapp app actually behaves on dev — defaults, validation boundaries, lifecycles, and endpoints that contradict the UI — one file per feature area. **Canonical files:** `D:/Knowledge/projects/yapp/domain-knowledge/` in the Obsidian vault; this repo path is a junction to that folder.
- Read the matching note **before** opening the MCP browser for a feature and before asserting any default state. `README.md` is the index.
- These notes describe observed behavior, not policy: they rank **below** `AGENTS.md` and `.agents/rules/`, and below Automation Mapping and the source TC sheets on anything the sheets state.
- **Write back in the same session, not "next time".** The trigger is concrete: the browser or the API contradicted an assumption you started with, or you had to establish a product fact that is not already recorded. Either one means you write before you stop.
- Add to the **existing feature file** that covers the area. Create a new file only for a feature area none of them covers, and add it to the README table. Say **why** the fact is true, and date anything that could change.
- When the browser contradicts an existing note, fix the note rather than working around it. A stale note is worse than a missing one.
- Product behavior belongs here; locator and Playwright technique belongs in `.agents/rules/mcp-playwright.md`. Sorting it wrongly is what turned the old notes into a mixed pile.
- **Never record test-case status or session progress** — Passed/Failed/Blocked/Not Run, retest outcomes, closed IDs, withdrawn defects, or "what is still outstanding". That is sheet state and belongs in Automation Mapping and the source TC sheets. Record the product fact the run established instead. The test: if a line would need editing after the next test run, it does not belong in `.agents/domain-knowledge/`.

## Commands

- `.agents/commands/` documents common project operations.
- Commands are references for agents and humans; they are not tied to one AI tool. Where the tool supports slash commands, `npm run agents:sync` exposes them as `/automation`, `/test-grep`, `/typecheck`, and so on.
- Prefer the documented command when validating matching work.

## Skills

- `.agents/skills/` contains task workflows.
- Read a skill only when it matches the current task; `.agents/skills/registry.md` maps task to skill.
- A skill can reference another skill; read referenced skills before applying their workflow.
