# Feed the Bear Cross-Model Portable Core

Use this file as the canonical cross-model instruction core when the same project context needs to run in Codex, GitHub Copilot, Gemini, or another coding assistant.

This file is intentionally provider-neutral. Platform-specific wrappers should stay thin and point back here instead of duplicating the same project rules.

## Mission

Help with Feed the Bear work without drifting away from the project's canonical files, source-of-truth rules, or documentation discipline.

## Canonical project surfaces

Read these first when resuming work:

- `docs/PROJECT_MASTER_HANDOFF.md`
- `docs/README.md`
- `AGENTS.md`
- `memoria.md`

Read these when the task touches their area:

- `docs/agents/API_GUARDIAN.md`
- `docs/agents/CONTENT_RECOVERY.md`
- `docs/agents/PROCEDURAL_DESIGN_CRITIC.md`
- `docs/COMMUNICATION_ROUTER.md`

## Core operating rules

1. Prefer the existing canonical file for a deliverable over creating a new versioned copy.
2. Treat checked-in repo files as the canonical source of truth unless the project docs explicitly say otherwise.
3. Keep the distinction between:
   - canonical data
   - runtime or browser-local state
   - exported artifacts
   - reporting surfaces
4. If a task changes an external surface, record what changed and whether the live destination now matches the repo.
5. After substantive edits, update `memoria.md`.
6. If the work affects collaboration, coordination, or routing, update `docs/PROJECT_MASTER_HANDOFF.md`.
7. Do not silently invent new design rules when the project already has a canonical design voice.

## Required source-of-truth behavior

- For general project context, use `docs/PROJECT_MASTER_HANDOFF.md`.
- For design intent, use the project docs and the linked Notion design reference described in `docs/README.md`.
- For procedural quality decisions, use `docs/PROCEDURAL_ML_DESIGN.md` plus `docs/agents/PROCEDURAL_DESIGN_CRITIC.md`.
- For sync, API, Confluence, or spreadsheet work, use `docs/agents/API_GUARDIAN.md`.
- For missing state, recovery, or browser-only artifacts, use `docs/agents/CONTENT_RECOVERY.md`.

## Writing and editing expectations

- Prefer concise, operational documentation over vague summaries.
- Keep file paths explicit.
- Preserve naming conventions already used in the repo.
- Avoid duplicate "final", "v2", or dated copies unless the task explicitly requires a separate artifact.
- If a file is generated from canonical inputs, update the generator or the canonical source first whenever practical.

## Output contract

When finishing a task, make the outcome easy to verify:

- what changed
- which canonical file now owns the result
- whether any live surface was updated
- whether any follow-up is still pending

## Portability rule

If this prompt family is moved to another model or tool:

- keep this file as the shared core
- create a thin wrapper for the target tool
- keep provider-specific instructions in the wrapper only
- do not fork the project rules into multiple drifting copies

## Close-out checklist

- Did I edit the canonical file instead of creating drift?
- Did I preserve the repo's source-of-truth model?
- Did I update `memoria.md` after substantive changes?
- Did I update `docs/PROJECT_MASTER_HANDOFF.md` if coordination changed?
- Would another model be able to continue from the same canonical files?
