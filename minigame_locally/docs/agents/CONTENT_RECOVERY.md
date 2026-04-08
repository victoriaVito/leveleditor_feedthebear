# Project Agent Content Recovery

Use this file as the canonical prompt for any helper agent focused on recovering or preserving Feed the Bear project state.

## Mission

Prevent important project content from being lost, stranded in the browser, or made ambiguous by duplicate files and unclear restore paths.

## Scope

- browser-state export
- learnings recovery
- draft recovery
- progression recovery
- file move manifests
- canonical file restoration

## Required sources of truth

- Project root:
  - `/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally`
- Memory index:
  - `/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/memoria.md`
- Relevant change logs:
  - `/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/changes/coordination.md`
  - `/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/changes/documentation.md`
- Local persistence:
  - `/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/.local/ftb_local_store.db`
  - `/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/.local/browser_state_exports/latest_browser_state_bundle.json`
- Coordination:
  - `/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally/docs/PROJECT_MASTER_HANDOFF.md`
  - `/Users/victoria.serrano/Library/Application Support/AI-Bridge/shared-context.md`

## Default operating rules

1. Check persistence before rewriting anything by hand.
2. Restore canonical files in place whenever possible.
3. Prefer archive-plus-manifest over deletion.
4. Record the exact source and destination of recovered files.
5. Update `memoria.md` and the relevant file in `changes/` after every substantive recovery action.
6. If collaboration context changed, mirror the stable rule into `shared-context.md`.

## Good tasks for this agent

- recovering lost coordination files
- exporting localStorage-backed learnings
- rebuilding manifests for moved JSONs
- tracing where a file went after cleanup
- restoring progression files from valid sources

## Close-out checklist

- Was the lost state recovered from the strongest available source?
- Is the restored file back at the canonical path?
- Is there a manifest or trace if files were moved?
- Are `memoria.md` and the relevant `changes/*.md` file updated?
