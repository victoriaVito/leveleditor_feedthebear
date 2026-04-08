# Benchmark + Compare Registry

Date: 2026-03-27

This document is the canonical registry for:

- benchmark datasets (Flow Free screenshots + reconstructions)
- visual comparison pages used to validate JSON reconstructions against originals
- removal logs for benchmark/compare inputs that are no longer valid (for example, oversize grids)

Reuse this file for future additions instead of creating dated copies.

## How To View Locally

1. Start the local server:

```bash
node server.mjs
```

2. Open the compare pages (served from `http://127.0.0.1:8080/`):

- `level_toolkit_web/compare_all.html` (single entry point)
- `level_toolkit_web/benchmark_compare.html` (Flow Free screenshot vs FtB render)
- `level_toolkit_web/reconstruction_compare.html` (original vs reconstructed for editor/timestamped sets)

## Benchmark: Flow Free

**Goal:** keep a stable set of Flow Free reference screenshots and matching FtB JSON reconstructions for difficulty/design benchmarking.

**Assets**

- Source screenshots drop folder: `benchmark_flow_free/screenshots/`
- Reconstructed JSONs: `levels/benchmark_flow_free/*.json`
- Optional mirrored screenshots: `levels/benchmark_flow_free/screenshots/` (when present)

**Compare UI**

- `level_toolkit_web/benchmark_compare.html`
  - Each card shows the original screenshot next to the reconstructed JSON render.
  - Screenshot lookup falls back across multiple directories (see the code in the page).

**Analysis**

- `docs/FLOW_FREE_BENCHMARK_ANALYSIS.md`

**Oversize policy**

Some Flow Free levels and related reconstructions were removed because they exceed the current supported grid constraints for the toolkit workflows. The canonical list is:

- `docs/REMOVED_OVERSIZE_LEVELS_2026-03-27.md`

## Reconstruction Compare (Non-Benchmark)

**Goal:** validate “image to JSON” reconstruction work outside the Flow Free benchmark (editor images, timestamped variants, workshop sets).

**Tracker**

- `docs/IMAGE_RECONSTRUCTION_TRACKER.md` is the canonical status board.

**Compare UI**

- `level_toolkit_web/reconstruction_compare.html`

## Combined Compare Page

If you want one page with the main compare surfaces, use:

- `level_toolkit_web/compare_all.html`

## Removal Log

### 2026-03-27: Procedural Reference Large Levels Removed

These levels were removed because they cannot be used as procedural references due to dimension/schema incompatibilities:

- `procedular_reference_large_057`
- `procedular_reference_large_058`
- `procedular_reference_large_059`
- `procedular_reference_large_062`
- `procedular_reference_large_065`
- `procedular_reference_large_068`
- `procedular_reference_large_069`
- `procedular_reference_large_070`
- `procedular_reference_large_073`
- `procedular_reference_large_076`
- `procedular_reference_large_079`
- `procedular_reference_large_080`
- `procedular_reference_large_081`
- `procedular_reference_large_084`
- `procedular_reference_large_087`
- `procedular_reference_large_090`
- `procedular_reference_large_091`
- `procedular_reference_large_092`
- `procedular_reference_large_095`
- `procedular_reference_large_098`
- `procedular_reference_large_101`

Cleanup actions taken:

- Deleted the JSON + screenshot assets under `levels/` and `levels/screenshots/`.
- Removed any remaining references from manager/progression snapshots so they do not reappear in the Level Manager after reload.

