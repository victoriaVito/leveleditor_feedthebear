---
name: ftb-doc-writer
description: >
  Feed the Bear project documentation writer, markdown quality enforcer, and
  code comment stylist. Use this skill whenever creating, editing, or reviewing
  any .md file in the Feed the Bear project — including docs, changelogs,
  coordination files, agent prompts, and memoria entries. Also use when writing
  JSDoc comments, Python docstrings, or structured comments in code files
  (app.js, server.mjs, scripts/). Trigger on any mention of "write docs",
  "update memoria", "add changelog entry", "document this", "create a README",
  "write a guide", editing any markdown file, or writing code comments. Even if
  the user doesn't mention docs explicitly, activate whenever the task involves
  writing or editing text that will be read by humans in this project. Also
  trigger when creating new scripts or modifying existing ones — every script
  needs a header comment.
---

# Feed the Bear — Doc Writer Skill

You are writing documentation for **Feed the Bear / Soda**, a mobile puzzle
game built with vibe coding and procedural level generation. The author (Vito)
is a game designer, not a programmer. Everything you write must be clear enough
for a designer to follow and precise enough for an agent to act on.

## Why this skill exists

This project has been built by multiple AI agents (Claude, Codex) across dozens
of sessions. A forensic audit on 2026-03-24 found **795 lint errors**, **11
absolute macOS paths**, **10 terminology drift instances**, and **481 files
never logged in memoria.md**. Every one of these errors came from an agent
doing the same thing the same wrong way. This skill exists so that pattern
stops here.

The error patterns below are not theoretical — they are extracted from real
mistakes in this project, with frequencies and root causes.

---

## Error Pattern 1 — Missing blank line before list (35% of all lint errors)

This was the single most common error. It happens because agents write a
paragraph or bold text and immediately start a list on the next line.

**Root cause**: agents treat bold text as a heading and forget that markdown
lists need a blank line separator from any preceding content.

**Wrong** (found 277 times across AGENTS.md, WORKFLOWS.md, LEVEL_RECOVERY_GUIDE.md):

```markdown
**Topbar (line 17-18)**
- `#reload-page-btn` → `btn-muted`
```

**Right**:

```markdown
**Topbar (line 17-18)**

- `#reload-page-btn` → `btn-muted`
```

This also applies after paragraphs, after headings, and after blockquotes.
Every list needs a blank line above its first item.

---

## Error Pattern 2 — Missing blank line around code fences (25% of lint errors)

Agents embed code blocks inside numbered steps or after colons and forget the
blank lines. This was endemic in WORKFLOWS.md (28 instances) and
LEVEL_RECOVERY_GUIDE.md (8 instances).

**Root cause**: agents prioritize content flow over formatting and treat code
fences as inline elements.

**Wrong** (found in WORKFLOWS.md, every workflow section):

```markdown
2. Run the sync:
   \`\`\`bash
   npm run sync:sheets:local
   \`\`\`
3. Check the output
```

**Right**:

```markdown
2. Run the sync:

   \`\`\`bash
   npm run sync:sheets:local
   \`\`\`

3. Check the output
```

The rule is simple: every ``` line must have a blank line both above and below
it, no exceptions, even inside numbered lists.

---

## Error Pattern 3 — Missing blank line after heading (15% of lint errors)

**Root cause**: agents write a heading and immediately start content.

**Wrong** (found in AGENTS.md, PROCEDURAL_ML_DESIGN.md):

```markdown
### Rules
- Only add `class="btn-primary"`...
```

**Right**:

```markdown
### Rules

- Only add `class="btn-primary"`...
```

---

## Error Pattern 4 — Double blank lines from over-correction (10% of lint errors)

When agents try to fix patterns 1-3, they sometimes add TWO blank lines
instead of one. This happened 23 times in AGENTS.md after the first fix pass.

**Rule**: exactly one blank line for separation. Never two or more.

---

## Error Pattern 5 — Absolute macOS paths (11 instances across 4 files)

This is the most dangerous non-lint error because it leaks machine-specific
information and breaks portability across agents and environments.

**Root cause**: agents copy paths from context or from other files that already
have absolute paths, creating a chain of contamination.

**Found in**: `paraclau_1.md` (8 paths), `AGENT_CHEATSHEET.md` (4 paths),
`memoria.md` (~50 entries), `NPM_SCRIPTS_REFERENCE.md` (7 links),
`level_toolkit_web/app.js` line 70.

**Wrong**:

```markdown
- `/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/memoria.md`
```

**Right**:

```markdown
- `memoria.md`
```

**Rule**: all paths relative to project root. If you see an absolute path in an
existing file, fix it — do not copy it.

---

## Error Pattern 6 — Terminology drift (10 instances)

Agents use bare terms instead of the canonical qualified terms. This creates
ambiguity because "progression" could mean the authored family, a mix, or a
generic sequence.

**Canonical terms** (from `FEED_THE_BEAR_GDD.md` and Notion Level Design):

| Concept | Always write | Never write |
|---|---|---|
| Authored level families A/B/C | **Original Progression(s)** | "progression", "base levels", "families" |
| Recombined editorial sets | **Live Ops Mix(es)** | "mix", "playlist", "set" |
| Slot 0 content | **Tutorial** | "intro level", "onboarding", "first level" |
| The web editor/manager | **toolkit** or **web toolkit** | "app", "frontend", "UI" |
| The HTTP server | **server.mjs** | "backend", "API server" |
| Level JSON files | **level files** or **level JSONs** | "data files", "configs" |
| The planning spreadsheet | **spreadsheet** (review surface) | "the sheet", "Google Sheet" (unless about the API) |
| Removing a generated level | **discard** (with a reason) | "reject", "delete", "remove" |

**Exception**: lowercase "progression" is fine when referring to the data
structure or a variable name in code, not the design concept.

---

## Error Pattern 7 — Memoria registration gaps (481 files never logged)

The single biggest structural issue: most files in the project were created
without being logged in `memoria.md`. This makes the memory system unreliable.

**Root cause**: the memoria registration rule was established after most files
were already created, and agents treat it as optional.

**Rule**: every time you create or significantly update a file, add a dated
entry to `memoria.md` under "Recent structural changes":

```markdown
- `2026-XX-XX`: [what changed] — [1-line reason]
```

Then add detail to the relevant `changes/*.md` file. This is not optional.

---

## Error Pattern 8 — Missing cross-references between docs (3+ major docs)

Docs were created in isolation. `FEED_THE_BEAR_GDD.md` didn't link to the
operational docs. `WORKFLOWS.md` didn't reference the server API doc. Readers
had no way to navigate between related docs.

**Rule**: when writing about something that has its own doc, link to it:

```markdown
See `docs/SERVER_API_REFERENCE.md` for the full endpoint reference.
```

When creating a new doc, add it to `docs/README.md` index.

---

## Error Pattern 9 — Sparse code comments (13+ scripts with zero headers)

Scripts in `scripts/` were created without any header comment explaining what
they do, what arguments they take, or what side effects they have.
`server.mjs` has only 3 comments in 500+ lines. `apply_sheet_level_renames.mjs`
has zero comments in 80+ lines.

**Rule for new scripts**: always include a header block:

```javascript
/**
 * apply_sheet_level_renames.mjs
 *
 * Applies staged level renames from the spreadsheet's "Level Renames" tab
 * to the canonical level JSON files on disk.
 *
 * Usage: node scripts/apply_sheet_level_renames.mjs
 * Side effects: renames files in levels/, logs to output/spreadsheet/level_rename_log.csv
 * Reads: Google Sheets API (requires OAuth)
 */
```

**Rule for existing scripts**: when modifying a script, add the header if
missing. Don't skip it because "it's just a small change."

---

## Error Pattern 10 — Untracked [VERIFY] flags (1 instance, systemic risk)

`docs/WORKFLOWS.md` has a [VERIFY] flag but no companion section that lists
all pending verifications. If nobody tracks these, they become invisible debt.

**Rule**: every doc that contains `[VERIFY]` flags must have a "Pending
[VERIFY] Flags" section at the bottom that lists them all. When a flag is
resolved, remove it from both the inline location and the summary section.

---

## Error Pattern 11 — Inconsistent memoria entry format (100% of entries)

All 120+ entries in `memoria.md` are single-line format, which works for short
notes but becomes unreadable for complex changes. One entry was 665 characters.

**Rule**: keep entries under 300 characters. If you need more detail, put the
summary in memoria.md and the full explanation in the relevant `changes/*.md`
file. Never write a memoria entry over 500 characters.

---

## Project documentation structure

| Type | Location |
|---|---|
| High-level design | `FEED_THE_BEAR_GDD.md` (single canonical GDD — extend in place) |
| Operational/technical docs | `docs/` directory |
| Agent prompts | `docs/agents/` |
| Change logs | `changes/*.md` |
| Operational memory | `memoria.md` |
| Coordination | `paraclau_1.md` |
| Archived/historical | `archive/` |
| Doc index | `docs/README.md` |
| Design voice | [Notion — Level Design](https://www.notion.so/Level-Design-3195f99a540280d8a972d22c54e12728) |

**The one-GDD rule**: never create a new overview document. Extend
`FEED_THE_BEAR_GDD.md` in place.

**Uncertainty markers**: never invent information. Mark unknowns with
`[VERIFY: description]` and add to the doc's pending section.

---

## Pre-delivery checklist

Run this mentally before finishing any doc edit:

1. Every heading has a blank line above AND below it
2. Every list has a blank line above its first item
3. Every code fence (```) has a blank line above AND below it
4. No double blank lines anywhere
5. All paths are relative to project root
6. Canonical terms used (Original Progressions, Live Ops Mixes, Tutorial, toolkit)
7. `memoria.md` updated with dated entry if substantive change
8. `changes/*.md` updated with detail
9. `docs/README.md` updated if new doc created
10. No lines over 500 chars
11. `[VERIFY]` flags tracked in pending section if any exist
12. Cross-references to related docs included
