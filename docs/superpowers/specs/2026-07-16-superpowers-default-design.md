# Superpowers by Default

## Goal

Make Superpowers the default workflow for agents working in this repository without vendoring or duplicating the installed plugin.

## Design

Add a repository-level section to `AGENTS.md` that requires the Superpowers bootstrap and directs agents to the relevant workflows: brainstorming, planning, TDD, debugging, verification, and code review. Existing Yapp runtime rules remain authoritative for project-specific behavior.

The repository records the design only; Superpowers skills continue to be supplied by the agent harness. This keeps plugin updates centralized and avoids a second, stale copy under version control.

## Verification

Confirm `AGENTS.md` contains the workflow and that the design file exists at this path.
