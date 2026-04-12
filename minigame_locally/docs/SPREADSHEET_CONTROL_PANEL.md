# Spreadsheet Control Panel

This document is the canonical implementation plan for the Google Sheets control panel layer that will sit above the existing local-first spreadsheet sync.

## Confluence-ready executive summary

- The spreadsheet strategy is local-first: canonical ownership stays in repo files (`levels/`, `progressions/`, `bundles/`).
- Google Sheets is an operational mirror for review and planning, not the authoring source of truth.
- The canonical sync flow is: rebuild workbook/payload from local canonical state, then push to the live sheet.
- The primary command is `npm run sync:sheets:local`; `sync:sheets:push` is push-only and lower-level.
- Generated tabs and system-owned fields stay protected; only explicit editorial surfaces are manually editable.
- Key staging surfaces are `All Progressions` review fields, `Mix Planner`, and `Level Renames`.
- Spreadsheet-staged edits never become canonical automatically; they require named local actions (for example apply renames, materialize mixes).
- The Apps Script sidebar is the UX/control layer and should reuse local toolkit endpoints instead of creating a second ownership path.
- The MVP architecture is hybrid: Apps Script for panel UX + local toolkit server for canonical repo actions.
- Success criteria: spreadsheet remains operational and clear, while canonical data integrity stays in the local repository workflow.

## Confluence-ready visual block

**Status**
- Strategy: `Active`
- Ownership model: `Local-first canonical repo + Google Sheets mirror`
- Recommended command: `npm run sync:sheets:local`

**Expand: Source of truth (copy block)**
- Canonical: checked-in files in `levels/`, `progressions/`, `bundles/`
- Operational state: toolkit save flows, manager state, playtest artifacts
- Reporting mirrors: local workbook + live Google Sheet
- Staging surfaces: `All Progressions` review fields, `Mix Planner`, `Level Renames`
- Rule: staged spreadsheet values do not become canonical until a named local action is executed

**Expand: Operating model (copy block)**
- Rebuild workbook and payload from canonical local data
- Push payload to Google Sheets
- Keep generated/system-owned columns protected
- Allow edits only in explicit editorial surfaces
- Execute staged actions via local endpoints/scripts (renames, materialization, validation, backup)

**Operational Table**

| Area | What users can edit | How it becomes canonical |
|---|---|---|
| `All Progressions` | Review/editorial fields only | Through named local workflows and sync |
| `Mix Planner` | Proposal/staging rows | `materialize-mixes` action + canonical sync |
| `Level Renames` | Target names and staging fields | `apply-level-renames` action + canonical sync |
| Generated tabs | No manual authoring | Rebuilt from canonical local sources |

## Confluence storage format (XML macros)

```xml
<ac:structured-macro ac:name="status">
  <ac:parameter ac:name="title">Spreadsheet Strategy</ac:parameter>
  <ac:parameter ac:name="colour">Green</ac:parameter>
  <ac:parameter ac:name="subtle">false</ac:parameter>
</ac:structured-macro>
<p><strong>Ownership model:</strong> Local-first canonical repo + Google Sheets mirror</p>
<p><strong>Recommended command:</strong> <code>npm run sync:sheets:local</code></p>

<ac:structured-macro ac:name="expand">
  <ac:parameter ac:name="title">Source of truth</ac:parameter>
  <ac:rich-text-body>
    <ul>
      <li>Canonical: checked-in files in <code>levels/</code>, <code>progressions/</code>, <code>bundles/</code></li>
      <li>Operational state: toolkit save flows, manager state, playtest artifacts</li>
      <li>Reporting mirrors: local workbook + live Google Sheet</li>
      <li>Staging surfaces: <code>All Progressions</code>, <code>Mix Planner</code>, <code>Level Renames</code></li>
      <li>Rule: staged spreadsheet values are not canonical until a named local action runs</li>
    </ul>
  </ac:rich-text-body>
</ac:structured-macro>

<ac:structured-macro ac:name="expand">
  <ac:parameter ac:name="title">Operating model</ac:parameter>
  <ac:rich-text-body>
    <ul>
      <li>Rebuild workbook and payload from canonical local data</li>
      <li>Push payload to Google Sheets</li>
      <li>Keep generated/system-owned columns protected</li>
      <li>Allow edits only in explicit editorial surfaces</li>
      <li>Run named local actions for renames, materialization, validation, and backups</li>
    </ul>
  </ac:rich-text-body>
</ac:structured-macro>

<table>
  <tbody>
    <tr>
      <th>Area</th>
      <th>What users can edit</th>
      <th>How it becomes canonical</th>
    </tr>
    <tr>
      <td><code>All Progressions</code></td>
      <td>Review/editorial fields only</td>
      <td>Through named local workflows and sync</td>
    </tr>
    <tr>
      <td><code>Mix Planner</code></td>
      <td>Proposal/staging rows</td>
      <td><code>materialize-mixes</code> action + canonical sync</td>
    </tr>
    <tr>
      <td><code>Level Renames</code></td>
      <td>Target names and staging fields</td>
      <td><code>apply-level-renames</code> action + canonical sync</td>
    </tr>
    <tr>
      <td>Generated tabs</td>
      <td>No manual authoring</td>
      <td>Rebuilt from canonical local sources</td>
    </tr>
  </tbody>
</table>
```

## Why This Exists

The current spreadsheet is already useful as a review and planning surface, but it still behaves like a passive report in too many places.

The goal of the control panel is to make the spreadsheet feel operational without turning it into the source of truth.

The control panel should:

- explain the sheet structure and editing rules clearly
- surface the most important local actions from the spreadsheet
- guide the user through mix, playtest, and progression workflows
- keep generated tabs protected and editorial tabs explicit

The control panel should not:

- silently replace canonical repo files without a named action
- let generated tabs become ad hoc authoring surfaces
- pretend that Google Sheets is the canonical level database

## Priority

Apps Script is the current spreadsheet priority.

The sidebar and control-panel layer should be treated as the next major spreadsheet milestone, ahead of secondary spreadsheet polish.

## Source Of Truth Model

The control panel must respect the existing contract:

1. Canonical data
   - checked-in level files
   - checked-in progression and bundle outputs
2. Operational state
   - toolkit save flows
   - manager state
   - playtest artifacts
3. Reporting mirrors
   - local workbook
   - live Google Sheet
4. Spreadsheet-side staging
   - review columns in `All Progressions`
   - `Mix Planner`
   - `Level Renames`

Spreadsheet-side actions may stage or trigger work, but they must not silently impersonate canonical file ownership.

## Current Foundation

The existing repo already provides these local actions through `server.mjs`:

- `sync-spreadsheet`
- `force-sync`
- `generate-payload`
- `apply-level-renames`
- `materialize-mixes`
- `backup-progressions`
- `validate-levels`
- `open-toolkit`
- `export-progression`

The local toolkit server also exposes:

- `GET /api/progressions` for progression inventory and bundle/export state
- `GET /api/playtest-summary` for the canonical local playtest summary snapshot

Those actions are currently exposed as local URLs under `http://127.0.0.1:8080/api/action/...`.

The Apps Script layer should reuse that route first instead of creating a second independent control path.

## Technical Constraint

Google Apps Script cannot reliably act as a full replacement for the local toolkit server.

That means:

- the sidebar can drive spreadsheet-native actions directly
- the sidebar can open local toolkit action URLs in the browser
- the sidebar should not assume it can safely perform localhost-only backend work entirely from server-side Apps Script

Because of that, the MVP should use a hybrid model:

- Apps Script for sidebar UX, context, and spreadsheet-native commands
- local toolkit server for canonical repo actions

## Panel Structure

The control panel should be one sidebar with internal tabs:

- `README`
- `Links`
- `Mix`
- `Playtest`
- `Progression`

This is better than multiple independent sidebars because it keeps one stable entry point and one predictable mental model.

## Sidebar Behavior

The sidebar should:

- open automatically on `onOpen()`
- also be reopenable from a custom menu
- remember the last selected internal tab
- detect the active sheet and highlight the matching panel

The sidebar should not depend on being literally impossible to close. Google Sheets does not guarantee that.

## MVP Scope

### 1. README panel

- explain the spreadsheet tab groups
- explain what is editable vs generated
- explain when to use Force Sync

### 2. Links panel

- playable build
- team board
- toolkit entry point
- core spreadsheet actions

### 3. Mix panel

- open `Mix Planner`
- `Force Sync`
- `Materialize approved mixes`
- `Backup progressions`
- `Validate levels`

### 4. Progression panel

- open `All Progressions`
- open `Level Renames`
- `Apply staged renames`
- `Force Sync`

### 5. Playtest panel

The initial panel can already surface live summary metrics from the canonical local playtest export.

What is still missing is the spreadsheet-native operational layer.

The first real playtest milestone should add:

- `Playtest All`
- `Playtest Summary`
- tester-scoped session tabs or views
- level tweak recommendations

## Current Supported Vs Planned

Current supported behavior:

- the Apps Script scaffold exists in `apps_script/`
- the sidebar can already expose `README`, `Links`, `Mix`, `Progression`, and `Playtest` views
- progression inventory can be read from `GET /api/progressions`
- progression ZIP export can be opened through `GET /api/action/export-progression`
- the playtest panel can already read the canonical local summary snapshot
- the spreadsheet remains a review and planning surface, not the canonical authoring source

Planned behavior:

- spreadsheet-native playtest operations with tester-scoped tabs or views
- richer bulk rename and editorial controls from the sidebar
- more direct progression export and Drive-oriented actions from the same panel
- a fuller rollout of the control panel once the Google Apps Script project is linked and deployed
- a stronger operational split between protected generated tabs and intentionally editable staging tabs

## Planned Phase 2

### Mix-specific exports

Add dedicated backend endpoints for:

- per-progression ZIP export
- per-progression download links
- optional Drive upload per progression or mix output

Progression ZIP export is now available through the local server and can already be surfaced from the sidebar.

### Progression bulk rename

Do not unlock generated identity columns directly.

Instead:

- use sidebar forms or bulk rules
- write staged rename rows into `Level Renames`
- apply them through the canonical rename action

### Playtest reporting

Add a canonical spreadsheet export for playtest data derived from:

- `playtest/latest_play_session.json`
- `playtest/playtest_events.jsonl`

The repo now already emits a canonical `output/playtest/playtest_summary.json` snapshot and embeds that summary in the spreadsheet payload under `playtestSummary`.

The export should produce:

- a protected aggregate tab
- tester-specific operational tabs or filtered views
- level-level recommendation outputs such as `needs tweak`, `too easy`, `invalid`, or `review blocker logic`

## Files

The Apps Script layer currently lives in:

- `apps_script/appsscript.json`
- `apps_script/Code.gs`
- `apps_script/Sidebar.html`

The local helper scripts currently live in:

- `scripts/clasp_env.sh`
- `scripts/clasp_set_project.sh`
- `scripts/clasp_login_no_localhost.sh`
- `scripts/clasp_status.sh`
- `scripts/clasp_push_force.sh`
- `scripts/clasp_pull.sh`
- `scripts/add_clasp_aliases.sh`

## Setup Workflow

1. Install the repo dependencies.
2. Run `npm run gas:env`.
3. Log into Apps Script with `npm run gas:login`.
4. Create or choose the target Apps Script project in Google.
5. Link the project with `npm run gas:set-project -- <SCRIPT_ID>`.
6. Push with `npm run gas:push:force`.
7. Open the spreadsheet and verify the sidebar opens on load.

## Open Questions

- Should tester-specific playtest sessions be separate sheets, filtered views, or named ranges?
- Which progression export actions should write to Drive directly versus local filesystem first?
- Should temporary unlock be implemented at all, or should all edits flow through explicit staging forms?
- How much spreadsheet-side mutation is acceptable before the control panel becomes too close to an authoring tool?

## Related Docs

- [docs/WORKFLOWS.md](./WORKFLOWS.md)
- [docs/PLAYTEST_SYSTEM.md](./PLAYTEST_SYSTEM.md)
- [docs/BUNDLES_AND_MIXES.md](./BUNDLES_AND_MIXES.md)
- [docs/SERVER_API_REFERENCE.md](./SERVER_API_REFERENCE.md)
- [PARALLEL_APIS_README.md](../PARALLEL_APIS_README.md)
