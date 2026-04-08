# Communication Router

This document is the canonical design for the Feed the Bear coordination router: the lightweight system that should make `docs/PROJECT_MASTER_HANDOFF.md` behave like a stable communication hub instead of a loose handoff note.

## Why This Exists

The project already has multiple coordination surfaces:

- `docs/PROJECT_MASTER_HANDOFF.md`
- AI-Bridge files
- Zapier routing scripts
- local task-router services

Those surfaces are useful, but they currently mix two different jobs:

- canonical state
- message transport

The router should separate them cleanly.

## Core Principle

`docs/PROJECT_MASTER_HANDOFF.md` is the canonical coordination file.

Everything else is transport, automation, visibility, or recovery.

That means:

- new work should be described in `docs/PROJECT_MASTER_HANDOFF.md`
- routing decisions should be derived from `docs/PROJECT_MASTER_HANDOFF.md`
- dashboards and bridges should read from that source
- responses should be merged back into that source or linked from it

## Intended User Experience

The ideal experience for Vito is:

1. Write or review a task in one place.
2. See who should handle it.
3. See whether it is pending, in progress, blocked, or done.
4. Avoid wondering whether the latest truth lives in Bridge, Zapier logs, or chat memory.

The ideal experience for agents is:

1. Read the same task card format every time.
2. Know whether the task is for Claude, Codex, Copilot, or auto-routing.
3. Know the expected success condition.
4. Write the result back into the same coordination system.

## Canonical Surfaces

- `docs/PROJECT_MASTER_HANDOFF.md`: source of truth for task intent and state
- `docs/COMMUNICATION_ROUTER.md`: source of truth for the coordination model
- `scripts/lib/coordination_routing.mjs`: shared routing rules
- `scripts/paraclau_router.mjs`: queue parser and report generator
- `output/coordination/paraclau_router_status.json`: generated machine-readable snapshot
- `output/coordination/paraclau_router_report.md`: generated human-readable routing report

## Router Queue Format

The machine-readable queue lives inside `docs/PROJECT_MASTER_HANDOFF.md` under `## Router Queue`.

Each task should use this format:

```md
### ROUTE-001
- Status: pending
- Owner: auto
- Type: documentation
- Priority: high
- Depends On: none
- Source: paraclau_1
- Title: Audit canonical docs for missing gameplay-facing gaps
- Summary: Review the current canonical docs and identify what still belongs in the set before gameplay work resumes.
- Success: Produce a concise gap audit with must add now / should add soon / can leave as-is findings.
```

## Supported Routing Types

- `code_generation`
- `design_critique`
- `level_validation`
- `validation`
- `api_integration`
- `documentation`
- `strategic_planning`
- `testing`
- `debugging`

If a type is unknown, the router falls back to `strategic_planning`.

## Pipeline

### Phase 1: Canonical authoring

- a task card is added or updated in `docs/PROJECT_MASTER_HANDOFF.md`
- the card is the only place where the task intent is authored

### Phase 2: Routing

- `scripts/paraclau_router.mjs` parses the queue
- the script assigns a recommended agent using shared routing rules
- the script emits JSON and Markdown snapshots under `output/coordination/`

### Phase 3: Transport

- optional tools such as AI-Bridge, Zapier, or webhook-based routers can read the generated snapshot
- they should not become the source of truth

### Phase 4: Completion

- the task card status is updated in `docs/PROJECT_MASTER_HANDOFF.md`
- follow-up notes or blockers are recorded back in the coordination file

## Task States

- `pending`: ready to route or already routed but not started
- `in_progress`: someone is actively working on it
- `blocked`: cannot proceed without input or another dependency
- `done`: complete
- `cancelled`: intentionally dropped

## Owner Field

`Owner` expresses intent, not just a log value.

Supported values:

- `auto`: let the router choose based on task type
- `claude`
- `codex`
- `copilot`

If `Owner` is explicit, the router keeps that assignment.

## MVP Implemented Now

The current implementation already provides:

- a canonical router design doc
- a machine-readable queue section in `docs/PROJECT_MASTER_HANDOFF.md`
- a shared routing-rules module
- a queue parser and report generator
- JSON and Markdown snapshots for dashboards or automation

## Next Steps

### Phase 2

- connect the watcher so `docs/PROJECT_MASTER_HANDOFF.md` changes regenerate router outputs automatically
- teach the task-router server to import queue cards directly
- add task-history persistence beyond in-memory runtime state

### Phase 3

- build a lightweight dashboard on top of `output/coordination/` plus `/tasks` and `/stats`
- add callback hooks so completed tasks can update queue state
- add validation for malformed task cards

## Related Docs

- [Agent Cheatsheet](../AGENT_CHEATSHEET.md)
- [Documentation Index](./README.md)
- [Spreadsheet Control Panel](./SPREADSHEET_CONTROL_PANEL.md)
- [API Guardian](./agents/API_GUARDIAN.md)
- [Coordination Handoff](./PROJECT_MASTER_HANDOFF.md)
