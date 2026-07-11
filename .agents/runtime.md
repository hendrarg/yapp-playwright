# Agent Runtime

This directory is the provider-neutral runtime for AI agents working in this repository.

## Load Order

Before changing files or running task-specific commands, read:

1. `AGENTS.md`
2. `.agents/runtime.md`
3. `.agents/rules/code-style.md`
4. `.agents/rules/testing.md`
5. `.agents/rules/git-hygiene.md`
6. `.agents/rules/ci.md`

For task-specific work, also read the matching skill from `.agents/skills/registry.md`.

## Rules

- `.agents/rules/` contains always-on project rules.
- These rules apply to all code changes, reviews, tests, and automation work.
- If a task-specific skill conflicts with a rule, follow the rule unless the user explicitly overrides it.

## Commands

- `.agents/commands/` documents common project operations.
- Commands are references for agents and humans; they are not tied to one AI tool.
- Prefer the documented command when validating matching work.

## Skills

- `.agents/skills/` contains task workflows.
- Read a skill only when it matches the current task.
- A skill can reference another skill; read referenced skills before applying their workflow.
