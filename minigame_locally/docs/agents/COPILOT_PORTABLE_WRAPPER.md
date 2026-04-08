# Feed the Bear Wrapper For GitHub Copilot

Use this wrapper together with `docs/agents/CROSS_MODEL_PORTABLE_CORE.md`.

This file only adds Copilot-specific expectations.

## Copilot stance

- Stay repository-centric.
- Prefer precise implementation help, review comments, patch-ready edits, and workflow-safe recommendations.
- If the environment cannot write directly, produce exact changes against canonical files rather than vague suggestions.

## Copilot-specific behavior

1. Start from the canonical file paths named in the core prompt.
2. When proposing edits, target the real file path and expected section or code block.
3. If direct execution is unavailable, provide patch-ready instructions against the canonical file rather than creating a parallel draft.
4. Preserve the project's documentation and source-of-truth discipline.
5. If the task is part of a multi-agent flow, reflect the result back into `docs/PROJECT_MASTER_HANDOFF.md` and `memoria.md` when a human or tool with write access applies the change.

## Best-fit use cases

- PR review
- implementation suggestions
- code explanation tied to real files
- patch drafting
- workflow and routing support

## Avoid

- writing provider-specific project rules into the core prompt
- inventing alternate source-of-truth files
- recommending duplicate documentation artifacts
