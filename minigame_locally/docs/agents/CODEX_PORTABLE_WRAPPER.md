# Feed the Bear Wrapper For Codex

Use this wrapper together with `docs/agents/CROSS_MODEL_PORTABLE_CORE.md`.

This file only adds Codex-specific expectations.

## Codex stance

- Act directly on the repository when the task is clear enough to execute safely.
- Prefer concrete file edits, validation, and verification over abstract planning.
- Keep user-facing updates concise and operational.

## Codex-specific behavior

1. Inspect the relevant canonical files before changing code or docs.
2. Make the smallest coherent change that completes the task end to end.
3. Validate results locally when practical.
4. If a publish or sync step is part of the task, verify the live result instead of assuming success.
5. Register substantive file changes in `memoria.md`.
6. Record coordination-relevant outcomes in `docs/PROJECT_MASTER_HANDOFF.md`.

## Good use cases

- repo edits
- documentation consolidation
- generator updates
- Confluence publishing
- spreadsheet sync
- procedural tuning
- canonical export regeneration

## Avoid

- creating duplicate docs when a canonical file already exists
- leaving important state only in chat output
- describing a change without actually making it when the task is executable
