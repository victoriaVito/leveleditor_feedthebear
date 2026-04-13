# Python UI Premium Master Plan
Date: April 13, 2026
Status: Planned
Owner: Feed the Bear Toolkit Team

## 1. Why this plan exists
This plan defines how to evolve the Python UI from a functional shell into a premium daily-use product.

It is intentionally broader than a single "v4" visual pass. It includes:
- UX and IA redesign
- interaction and feedback systems
- operational safety for spreadsheet/Drive/Confluence workflows
- performance and accessibility
- model and sub-agent orchestration strategy
- token-aware execution workflow

## 2. Product goals
1. Make frequent tasks faster and clearer.
2. Reduce high-cost mistakes (naming drift, invalid levels, repeated colors, sync confusion).
3. Improve confidence in automation-heavy operations.
4. Keep Python toolkit as the primary operating surface.

## 3. Core UX principles
1. Task-first navigation, not feature-first navigation.
2. Progressive disclosure for advanced controls.
3. Strong visual hierarchy for status, warnings, and decisions.
4. One obvious primary action per context.
5. Stable guardrails over optional convenience.

## 4. Non-negotiable domain guardrails
These rules must remain enforced in UI, validation, and docs:
1. Canonical progression naming: `progression_<letter>_level<n>[_needs_review].json`.
2. `id` must match filename stem.
3. Max pairs per level: 7.
4. Pair colors must be unique within the level.
5. Canonical pair colors only: `red, blue, green, yellow, orange, purple, cyan`.
6. Screenshot filename must match JSON stem.

## 5. Scope architecture
## 5.1 In scope
- Python UI shell (`python_toolkit/src/feed_the_bear_toolkit/ui/app.py`)
- Python validation and progression checks
- high-signal docs and operator playbooks
- smoke checks for UI stability

## 5.2 Out of scope (this plan)
- Full replacement of every historical web-only editing feature
- New backend services unrelated to current toolkit flow
- Non-essential visual experiments that reduce clarity

## 6. Master roadmap (all phases)
## Phase 0 - Baseline and instrumentation
Goals:
- Freeze baseline screenshots and interaction notes.
- Define measurable KPIs.
- Create a rollback checklist.

Deliverables:
- `docs/ui/PYTHON_UI_BASELINE_AUDIT.md`
- `docs/ui/PYTHON_UI_KPI_TRACKER.md`
- baseline screenshots set (overview, inspector, packs, automation, sessions)

Exit criteria:
- Baseline accepted and linked in docs.

## Phase 1 - Premium foundation (already partially done)
Goals:
- Design tokens and coherent visual language.
- Theme + density controls.
- Improved cards/forms/tables/status chips.

Deliverables:
- stabilized token set in UI stylesheet
- light/dark + comfort/compact persistence

Exit criteria:
- No functional regression in main flows.

## Phase 2 - v4 workbench layout
Goals:
- Move from simple tabs to workflow workbench.
- Add sticky quick action layer and fast task routing.
- Improve spatial consistency per view.

Deliverables:
- sticky quickbar (global)
- context-sensitive quick actions
- per-view spacing/profile tokens
- high-density data readability improvements

Exit criteria:
- Operator can jump/act without hunting controls.

## Phase 3 - Information architecture and task flows
Goals:
- Reframe navigation around user intent:
  - Inspect
  - Validate
  - Generate
  - Sync
  - Review
- Reduce visible controls per screen by default.

Deliverables:
- refactored view copy and grouping
- advanced sections behind explicit toggles
- standard action hierarchy (`Primary`, `Secondary`, `Danger`)

Exit criteria:
- Reduced cognitive load in moderation sessions.

## Phase 4 - Data UX and review tooling
Goals:
- Make comparison and QA workflows first-class.
- Improve large-output readability.

Deliverables:
- table filters and fast search
- sticky headers + tabular numerals everywhere needed
- "before/after" diff blocks for level changes
- structured error/warning buckets

Exit criteria:
- Faster diagnosis and fewer re-runs.

## Phase 5 - Domain-safe editing and one-click fixes
Goals:
- Turn guardrails into actionable UI.

Deliverables:
- inline validation as user edits
- suggested fix buttons:
  - normalize filename/id
  - enforce unique colors
  - cap pairs to 7 with `_needs_review`
- review queue panel for flagged levels

Exit criteria:
- Common contract errors solved from UI in one click.

## Phase 6 - Operations cockpit
Goals:
- Centralize critical status for spreadsheet, Drive, and publishing.

Deliverables:
- auth and health panel
- dry-run preview for destructive ops
- operation logs with copy/export
- post-action summary cards

Exit criteria:
- Operator can run sync/publish actions with high confidence.

## Phase 7 - Accessibility, performance, hardening
Goals:
- Make quality sustainable.

Deliverables:
- keyboard-first navigation pass
- focus and contrast checks
- render-cost reduction for heavy views
- smoke test checklist and automation hooks

Exit criteria:
- Production-ready stability and comfort for long sessions.

## 7. AI model strategy (which model helps most)
## 7.1 Primary model by task type
1. UX architecture and critical design decisions:
- `gpt-5.4` (high reasoning)
- Why: best for tradeoffs, consistency, and system-level decisions.

2. Implementation-heavy but bounded UI edits:
- `gpt-5.4-mini` (medium reasoning)
- Why: fast, cost-efficient for iterative CSS/HTML/JS refinements.

3. Procedural/domain guardrails and validation contracts:
- `gpt-5.4` (medium/high reasoning)
- Why: correctness > speed for rules that affect data integrity.

4. Bulk mechanical updates (copy consistency, small refactors):
- `gpt-5.4-mini` (low/medium reasoning)

## 7.2 Model routing rules
1. If change touches business rules, use `gpt-5.4`.
2. If change is mostly visual and local, use `gpt-5.4-mini`.
3. If uncertain, do design pass on `gpt-5.4`, implementation on `gpt-5.4-mini`.

## 8. Sub-agent delegation strategy
Note: Sub-agents should be used only for parallel, bounded, non-overlapping tasks.

## 8.1 Recommended agent topology
1. Main agent (orchestrator)
- Owns architecture, integration, final review, and acceptance.

2. Explorer agent(s)
- Fast repo questions (where styles/actions/routes live).
- Produces concise findings, no broad rewrites.

3. Worker agent(s)
- Apply specific implementation slices with explicit file ownership.

## 8.2 Delegation matrix
1. Explorer A (read-only)
- Scope: UI structure map and action/event wiring
- Files: `ui/app.py` only
- Output: exact anchors + risk map

2. Worker A (visual system)
- Scope: tokens, theme, spacing, typography
- Files: `ui/app.py` CSS block
- Output: patch + verification notes

3. Worker B (interaction ergonomics)
- Scope: quickbar, shortcuts, microinteractions
- Files: `ui/app.py` JS and top structure
- Output: patch + interaction test list

4. Worker C (data UX)
- Scope: tables/pre/diff/readability
- Files: `ui/app.py`
- Output: patch + sample rendering sanity checks

5. Worker D (guardrails)
- Scope: validation + progression naming + unique color enforcement
- Files: `domain/validation.py`, `domain/progressions.py`, related tests
- Output: patch + test updates

## 8.3 Integration order
1. Merge guardrails first.
2. Merge layout and visual system.
3. Merge interaction extras.
4. Merge data UX improvements.
5. Run end-to-end smoke validation.

## 9. Skills strategy (what to invoke and when)
## 9.1 Primary skills
1. `toolkit-ui-patterns`
- For practical dashboard/workbench structure.

2. `frontend-skill`
- For high-quality visual composition and interaction polish.

3. `web-toolkit-performance`
- For render cost and responsiveness in heavy views.

4. `level-manager-data-contract`
- For contract-level guardrails and schema discipline.

5. `level-design-knowledge-system`
- For ensuring docs, naming, and process stay aligned.

## 9.2 Secondary skills
1. `documentation-crafting`
- For high-quality operator docs and playbooks.

2. `information-architecture-docs`
- For navigation and content hierarchy in docs.

## 10. Execution playbook (token-aware)
## 10.1 Work chunking
1. Use one bounded chunk per cycle (max ~2 files, or ~300 lines touched).
2. Compile/test after each chunk.
3. Record each chunk in `memoria.md`.

## 10.2 Token controls
1. Prefer concise file scans (`rg`, targeted `sed`).
2. Avoid re-reading whole files repeatedly.
3. Summarize intermediate reasoning, do not restate entire context.
4. Parallelize independent read operations.

## 10.3 Stop conditions
Stop and checkpoint if:
- design drift appears across views,
- validation contract fails,
- unclear ownership between UI and domain rules,
- runtime errors in core actions.

## 11. Risks and mitigations
1. Over-polish with low functional gain
- Mitigation: tie each UI change to a measurable workflow improvement.

2. Breaking operational actions while redesigning
- Mitigation: action smoke checklist after each UI batch.

3. Contract drift (filename/id/color rules)
- Mitigation: enforce in domain validators and tests, not only UI.

4. Token exhaustion in long iterations
- Mitigation: strict chunking + checkpoint commits/docs.

## 12. KPIs and acceptance criteria
## 12.1 UX KPIs
1. Time to run "inspect + validate + save" flow decreases.
2. Fewer clicks to trigger common actions.
3. Lower error rate in naming/color/pairs rule violations.

## 12.2 Quality gates
1. All affected Python tests pass.
2. No regression in key UI actions.
3. Guardrails enforced by backend validators.
4. Docs updated and linked from `docs/README.md` if needed.

## 13. Detailed phase checklist (operator-ready)
## Phase 2 (v4) checklist
- [ ] Sticky quickbar with navigation and shortcuts
- [ ] Consistent action hierarchy and button semantics
- [ ] Per-view density profiles
- [ ] Data typography improvements (tables + pre)
- [ ] Visual QA on all 5 views

## Phase 3 checklist
- [ ] Intent-based sectioning across all views
- [ ] Advanced controls behind toggles
- [ ] Copy consistency pass
- [ ] Empty/loading/error states standardized

## Phase 4 checklist
- [ ] Table filtering/search
- [ ] Structured comparison outputs
- [ ] Warning prioritization UI

## Phase 5 checklist
- [ ] Inline validation hints
- [ ] One-click fixes for naming/id/colors/pairs
- [ ] Review queue for `_needs_review`

## Phase 6 checklist
- [ ] Auth and operation health panel
- [ ] Dry-run previews for risky actions
- [ ] Execution logs + summary cards

## Phase 7 checklist
- [ ] Keyboard-only pass
- [ ] Contrast and focus QA
- [ ] Performance tuning for large outputs
- [ ] Final release checklist

## 14. Suggested first execution sequence
1. Lock contract guardrails with tests.
2. Complete v4 workbench layout and quick actions.
3. Add data UX improvements for long sessions.
4. Add one-click fixes for top 3 recurring mistakes.
5. Build operations cockpit and smoke-test flow.

## 15. Definition of done (master)
The plan is complete when:
1. UI is clearly premium and task-efficient.
2. Domain guardrails are enforced end-to-end.
3. Operations are visible, safe, and auditable.
4. Team can run daily workflow from Python UI with confidence.
