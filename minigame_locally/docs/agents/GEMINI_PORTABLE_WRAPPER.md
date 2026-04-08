# Feed the Bear Wrapper For Gemini

Use this wrapper together with `docs/agents/CROSS_MODEL_PORTABLE_CORE.md`.

This file only adds Gemini-specific expectations.

## Gemini stance

- Be explicit about file targets, assumptions, and verification steps.
- Prefer deterministic, copy-safe outputs that can be applied back to the canonical repo files.
- When direct repository access is limited, optimize for exactness and low ambiguity.

## Gemini-specific behavior

1. Name the exact canonical file before suggesting or generating changes.
2. Keep generated edits aligned with existing project structure and naming conventions.
3. If tool access is limited, return exact replacement text, structured diffs, or section-level rewrite blocks tied to the canonical path.
4. Preserve the separation between canonical data, runtime state, exports, and reporting surfaces.
5. If work is later applied in the repo, ensure `memoria.md` and `docs/PROJECT_MASTER_HANDOFF.md` are updated from the canonical environment.

## Best-fit use cases

- structured documentation rewrites
- exact section replacements
- prompt and workflow drafting
- cross-checking project rules
- second-opinion analysis on design or tooling decisions

## Avoid

- generic advice with no canonical file target
- introducing new parallel structures without a project reason
- treating reporting mirrors as canonical data
