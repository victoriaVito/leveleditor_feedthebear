# Phase 2B Backlog — Python Toolkit Evolution

**Start Date:** 2026-04-15  
**Target Completion:** 2026-05-15 (flexible; priorities can shift)  
**Status:** PLANNED

---

## Executive Summary

Phase 2A delivered **feature parity** (procedural, state machine, editor, spreadsheet boundaries). Phase 2B focuses on **data integrity**, **native integrations**, and **advanced UX**:

1. **Level JSON Normalization** (HIGH PRIORITY) — Fix ~30 legacy levels against 7-pair schema
2. **Native Sheets API** (MEDIUM PRIORITY) — Replace wrapped shell commands with Python SDK
3. **Advanced Editor Features** (MEDIUM PRIORITY) — Undo/redo, drag-and-drop variants
4. **Procedural Tuning UI** (MEDIUM PRIORITY) — Expose seed/parameter control
5. **Test Coverage** (CONTINUOUS) — Target 90%+ branch coverage
6. **Performance Optimization** (LOW PRIORITY) — Profile and optimize hot paths

---

## Slice 1: Level JSON Normalization (Priority: HIGH)

### Problem Statement

**Status:** 0/10 levels in progression_a validate against current 7-pair schema (A-G).

**Root Cause:** Schema transition from 9 pairs (A-I) to 7 pairs (A-G) in commit 663051c broke legacy levels containing:
- Invalid pair IDs (H, I) in pairs array
- Coordinate data out of bounds
- Structural inconsistencies (missing or malformed golden path, solution_count)

**Impact:** 
- ~30 levels across progressions A-F are invalid
- Progression loading fails in validation gate
- Affects QA workflows and level pack generation

**Acceptance Criteria:**
- All levels in progressions A-G pass schema validation
- Each level has correct pair IDs (A-G only)
- Golden path coordinates are within board bounds
- All required metadata fields present

### Implementation Steps

#### Step 1.1: Audit All Broken Levels

**Effort:** 1 hour  
**Output:** Detailed audit spreadsheet showing each broken level + error type

```bash
cd python_toolkit
python3.10 run_cli.py validate-levels-under 'levels/progression_a'
python3.10 run_cli.py validate-levels-under 'levels/progression_b'
# ... repeat for C-G

# Capture full error output to spreadsheet:
# | Level | Error Type | Details | Fix Strategy |
# | --- | --- | --- | --- |
# | progression_a_level3.json | Invalid pair H in golden path | goldenPath[I] = [...] | Remove H-I references, renumber to A-G |
# | progression_a_level10.json | Blocker out of bounds | blocker [1,6] on 3x4 board | Adjust to valid grid |
```

#### Step 1.2: Classification & Prioritization

**Effort:** 30 minutes  
**Categorize broken levels by fix complexity:**

- **Tier 1 (Easy):** Remove invalid pair IDs, adjust off-by-one errors
- **Tier 2 (Medium):** Restructure boards, rebalance pair placement
- **Tier 3 (Hard):** Recreate level design from scratch (if design intent unclear)

#### Step 1.3: Batch Fix Tier 1 Levels

**Effort:** 2-3 hours for ~10-15 Tier 1 levels  
**Approach:** Automated script + manual validation

```python
def normalize_level_json(level_path: str) -> dict:
    """Normalize level JSON to 7-pair schema."""
    with open(level_path) as f:
        level = json.load(f)
    
    # Remove invalid pair IDs
    valid_pairs = [p for p in level['pairs'] if p['id'] in PAIR_IDS]
    level['pairs'] = valid_pairs
    
    # Clamp golden path to valid pairs
    if 'goldenPath' in level:
        level['goldenPath'] = {
            k: v for k, v in level['goldenPath'].items()
            if k in PAIR_IDS
        }
    
    # Validate blocker coordinates
    cols, rows = level['cols'], level['rows']
    level['blockers'] = [
        b for b in level.get('blockers', [])
        if 0 <= b['x'] < cols and 0 <= b['y'] < rows
    ]
    
    return level
```

**Validation:** Re-run validation suite after each batch

#### Step 1.4: Manual Fix Tier 2–3 Levels

**Effort:** 2-4 hours for ~10-15 Tier 2–3 levels  
**Process:**
1. Load broken level in interactive Python editor
2. Visualize board using `level_inspector.py` renderer
3. Manually adjust pair placement + golden path
4. Validate + commit

#### Step 1.5: Regression Test + Sign-Off

**Effort:** 1 hour  
**Verify all progressions A-G:**

```bash
for prog in progression_a progression_b progression_c progression_d progression_e progression_f progression_g; do
  python3.10 run_cli.py validate-progression progressions/$prog.json
done
```

**Expected:** 100% pass rate for all progressions

### Files Modified

- `levels/progression_a/jsons/*.json` (10 levels)
- `levels/progression_b/jsons/*.json` (10 levels)
- ... (C-G similarly)
- **New:** `scripts/normalize_legacy_levels.py` (automation helper)

### Testing

- Unit tests for `normalize_level_json()`
- Integration test: validate-all-progressions passes
- Regression test: no valid levels broken in normalization

**Test File:** `python_toolkit/tests/test_level_normalization.py`

---

## Slice 2: Native Sheets API Integration (Priority: MEDIUM)

### Problem Statement

**Current state:** Spreadsheet sync uses wrapped shell commands (npm scripts calling Sheets API via Node.js).

**Limitation:** 
- Requires Node.js + npm in environment
- No direct Python <→ Sheets connection
- Performance overhead from subprocess calls
- Cannot use Python async patterns for parallel operations

**Goal:** Replace wrapped layer with native Python Sheets SDK.

**Acceptance Criteria:**
- `services/spreadsheet.py` uses `google-api-python-client`
- All sync/mutation operations work directly from Python
- Same data round-trip semantics (no breaking changes)
- Credentials flow uses same OAuth tokens

### Implementation Steps

#### Step 2.1: Evaluate google-api-python-client vs google-cloud-sheets

**Effort:** 30 minutes  
**Decision:**
- **google-api-python-client** (REST): Simpler auth, mature, covers 99% of use cases
- **google-cloud-sheets** (gRPC): Overkill for this project

**Recommendation:** Use `google-api-python-client`

#### Step 2.2: Add SDK Dependency

**Effort:** 15 minutes

```bash
# In python_toolkit/pyproject.toml
dependencies = [
    ...
    "google-api-python-client>=2.100.0",
    "google-auth-httplib2>=0.2.0",
    "google-auth-oauthlib>=1.2.0",
]
```

#### Step 2.3: Refactor spreadsheet.py

**Effort:** 3-4 hours  
**Replace wrapped shell calls with native SDK:**

```python
# OLD (wrapped)
def sync_progressions():
    subprocess.run(['npm', 'run', 'sync:progressions'])

# NEW (native)
def sync_progressions(service, spreadsheet_id):
    """Read progression data from Sheets using native API."""
    result = service.spreadsheets().values().get(
        spreadsheetId=spreadsheet_id,
        range='Progressions!A:Z'
    ).execute()
    values = result.get('values', [])
    return parse_progression_data(values)

def write_progression_batch(service, spreadsheet_id, data):
    """Write progression updates back to Sheets."""
    service.spreadsheets().values().update(
        spreadsheetId=spreadsheet_id,
        range='Progressions!A1',
        valueInputOption='RAW',
        body={'values': serialize_progression_data(data)}
    ).execute()
```

**Key Operations to Port:**
- Read progressions
- Write progression updates
- Read learning state batches
- Write playtest session data
- Append new rows (sessions, audit trail)

#### Step 2.4: Test Native API Calls

**Effort:** 2 hours  
**Add integration tests against test Sheets file:**

```python
# tests/test_spreadsheet_native_api.py
class TestNativeSheetsAPI:
    def test_read_progressions_from_sheet(self):
        """Verify native API reads progression data."""
        service = build('sheets', 'v4', credentials=test_creds)
        data = sync_progressions(service, TEST_SHEET_ID)
        assert len(data) == 6  # progressions A-F
    
    def test_write_progression_batch(self):
        """Verify native API writes updates."""
        service = build('sheets', 'v4', credentials=test_creds)
        write_progression_batch(service, TEST_SHEET_ID, test_data)
        # Read back and verify
```

#### Step 2.5: Deprecate Shell Wrapper

**Effort:** 1 hour  
**Actions:**
- Mark npm sync scripts as deprecated in comments
- Keep them in repo as fallback for 2 sprints
- Plan removal in Phase 2C

### Files Modified

- `python_toolkit/pyproject.toml` (add google-api dependencies)
- `python_toolkit/src/feed_the_bear_toolkit/services/spreadsheet.py` (rewrite sync layer)
- `python_toolkit/tests/test_spreadsheet_native_api.py` (new)

### Testing

- Unit tests for Sheets API read/write operations
- Integration tests against test Sheets file
- Round-trip test: read → modify → write → verify
- Regression test: all existing sync workflows still work

---

## Slice 3: Advanced Editor Features (Priority: MEDIUM)

### Problem Statement

**Current state:** Board editor supports single-session state, no history.

**Missing features:**
1. Undo/redo (user can fix mistakes)
2. Drag-and-drop variants (UX friction)
3. Copy/paste board state
4. Layer visualization (pairs vs blockers)

**Goal:** Make editor professional-grade for level designers.

### Implementation Steps

#### Step 3.1: Implement Undo/Redo Stack

**Effort:** 2-3 hours

```python
@dataclass(frozen=True)
class EditorState:
    """Snapshot of board state at a point in time."""
    board: Level
    timestamp: str
    action: str  # "add_pair_a", "remove_blocker", etc.

class EditorHistory:
    """Undo/redo manager."""
    def __init__(self):
        self.past: list[EditorState] = []
        self.present: EditorState | None = None
        self.future: list[EditorState] = []
    
    def record_action(self, state: EditorState):
        """Record new state, clear future on new action."""
        self.past.append(self.present)
        self.present = state
        self.future.clear()
    
    def undo(self) -> EditorState | None:
        if not self.past:
            return None
        self.future.append(self.present)
        self.present = self.past.pop()
        return self.present
    
    def redo(self) -> EditorState | None:
        if not self.future:
            return None
        self.past.append(self.present)
        self.present = self.future.pop()
        return self.present
```

**Key:**
- Immutable state snapshots (no mutation)
- Automatic on every board change
- Keyboard shortcuts: Ctrl+Z (undo), Ctrl+Shift+Z (redo)
- Limit history to last 50 actions (memory)

#### Step 3.2: Add Drag-and-Drop Variant Loading

**Effort:** 2 hours (UI/JS side)

**Current:** Modal click → load variant  
**Target:** Drag variant card onto board → instant load

```javascript
// ui/static/editor.js
const variantCards = document.querySelectorAll('[data-variant-id]');
variantCards.forEach(card => {
  card.addEventListener('dragstart', (e) => {
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('variant-id', card.dataset.variantId);
  });
});

const boardArea = document.getElementById('board-render');
boardArea.addEventListener('dragover', (e) => {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'copy';
  boardArea.classList.add('drag-over');
});

boardArea.addEventListener('drop', async (e) => {
  e.preventDefault();
  const variantId = e.dataTransfer.getData('variant-id');
  await fetch('/api/load-variant-into-editor', {
    method: 'POST',
    body: JSON.stringify({ variant_id: variantId })
  });
});
```

#### Step 3.3: Layer Visualization Toggle

**Effort:** 1 hour (UI only)

**Add checkbox:** Show/hide blockers  
**Add checkbox:** Show/hide grid

```javascript
// Toggle blockers
document.getElementById('toggle-blockers').addEventListener('change', (e) => {
  boardArea.classList.toggle('hide-blockers', !e.target.checked);
});
```

### Files Modified

- `python_toolkit/src/feed_the_bear_toolkit/ui/server.py` (add undo/redo endpoints)
- `python_toolkit/src/feed_the_bear_toolkit/ui/app.py` (EditorHistory class)
- `python_toolkit/ui/static/editor.js` (drag-drop, toggles)

### Testing

- Unit test: EditorHistory undo/redo logic
- Integration test: undo/redo via API
- UI test: drag-drop variant loading

---

## Slice 4: Procedural Tuning UI (Priority: MEDIUM)

### Problem Statement

**Current state:** Procedural generation uses hardcoded seed sequences and parameters.

**Missing:** No UI to explore or tune:
- Seed offset (for deterministic variation)
- Learning bias weight
- Difficulty scaling curve
- Move count target variance

**Goal:** Allow designers to experiment with procedural parameters interactively.

### Implementation Steps

#### Step 4.1: Add Parameter Control UI

**Effort:** 2 hours

**New section in Procedural view:**

```html
<div class="procedural-tuning">
  <h3>Generation Parameters</h3>
  
  <label>
    Seed Offset:
    <input type="number" id="seed-offset" value="0" min="0" max="1000" step="1">
  </label>
  
  <label>
    Learning Bias Weight:
    <input type="range" id="learning-bias" min="0" max="1" step="0.1" value="0.5">
    <span id="learning-bias-value">0.5</span>
  </label>
  
  <label>
    Difficulty Scale:
    <input type="range" id="difficulty-scale" min="0.5" max="1.5" step="0.1" value="1.0">
    <span id="difficulty-scale-value">1.0</span>
  </label>
  
  <button id="generate-with-params">Generate Batch</button>
</div>
```

#### Step 4.2: Add Parameter Routing to CLI

**Effort:** 1 hour  
**Extend existing procedural commands:**

```bash
python3 run_cli.py procedural-reference-variants \
  'levels/Progression B · Level 2.json' \
  --pairs more \
  --seed-offset 42 \
  --learning-bias 0.7 \
  --difficulty-scale 1.1 \
  --count 5
```

#### Step 4.3: Visualize Parameter Impact

**Effort:** 1.5 hours  
**Add chart showing ranking distribution:**

```python
# New endpoint: POST /api/analyze-generation-parameters
def analyze_generation_parameters(base_level, params):
    """Generate batch and visualize ranking impacts."""
    candidates = generate_reference_variants(base_level, **params)
    rankings = [c.total_rank for c in candidates]
    
    return {
        'params': params,
        'mean_rank': statistics.mean(rankings),
        'stdev_rank': statistics.stdev(rankings),
        'ranking_histogram': histogram(rankings, bins=5),
        'candidates': [asdict(c) for c in candidates]
    }
```

### Files Modified

- `python_toolkit/ui/static/procedural.html` (add parameter controls)
- `python_toolkit/src/feed_the_bear_toolkit/ui/server.py` (new endpoint)
- `python_toolkit/src/feed_the_bear_toolkit/cli.py` (extend commands)

---

## Slice 5: Test Coverage Expansion (Priority: CONTINUOUS)

### Goal: Reach 90%+ branch coverage across domain and services

**Current State:** ~70% coverage in core slices; some services untested

### Coverage Targets

| Module | Current | Target | Gap |
|--------|---------|--------|-----|
| domain/levels.py | 85% | 95% | Negative paths, edge cases |
| domain/procedural.py | 80% | 95% | Mutation edge cases |
| services/spreadsheet.py | 50% | 90% | Native API calls, error handling |
| services/procedural.py | 75% | 90% | Ranking logic, tie-breaking |
| ui/server.py | 60% | 90% | Error paths, validation |

### Implementation

**Effort:** 2-3 hours / sprint (ongoing)

**Approach:**
1. Run coverage report: `coverage run -m pytest && coverage report`
2. Identify untested branches
3. Write targeted tests for each gap
4. Aim for 90% by end of Phase 2B

**Example:** Untested error paths in spreadsheet.py

```python
def test_sync_progressions_handles_auth_error(mocker):
    """Verify graceful handling of auth failures."""
    service = mocker.Mock()
    service.spreadsheets().values().get.side_effect = HttpError(
        mocker.Mock(status=401), b'Unauthorized'
    )
    
    with pytest.raises(SpreadsheetAuthError):
        sync_progressions(service, 'fake-id')
```

---

## Slice 6: Performance Optimization (Priority: LOW)

### Problem Statement

**Current state:** No profiling data; assumed bottlenecks are:
- Procedural candidate generation (combinatorial explosion)
- Sheets API round-trip latency
- Board validation (solver calls for solution count)

### Implementation Steps (If Needed)

#### Step 6.1: Profile Hot Paths

```bash
python3 -m cProfile -s cumulative run_cli.py procedural-generate-batch 3 4 --count 10 2>&1 | head -30
```

**Expected:** Identify if solver or generation dominates

#### Step 6.2: Optimize Procedural Search

**If needed:**
- Implement candidate pool caching (same base level → same pool)
- Parallelize solver checks (one solver call per candidate in parallel)
- Reduce mutation generation attempts if pool is full

#### Step 6.3: Optimize Sheets I/O

**If needed:**
- Batch read/write operations (fewer API calls)
- Implement local write cache (queue updates, flush on idle)

---

## Delivery Schedule

### Week 1 (Apr 15–19)
- **Slice 1.1–1.2:** Audit broken levels (1.5 hours)
- **Slice 2.1:** Evaluate Sheets SDK options (0.5 hours)
- **Slice 3.1:** Implement undo/redo stack (2–3 hours)
- **Slice 5:** Expand test coverage for domain/levels.py (1.5 hours)

### Week 2 (Apr 22–26)
- **Slice 1.3:** Fix Tier 1 levels (2–3 hours)
- **Slice 2.2–2.3:** Refactor spreadsheet.py native API (3–4 hours)
- **Slice 3.2:** Add drag-drop variant loading (2 hours)
- **Slice 5:** Expand test coverage for procedural.py (1.5 hours)

### Week 3 (Apr 29–May 3)
- **Slice 1.4:** Fix Tier 2–3 levels (2–4 hours)
- **Slice 2.4:** Test native Sheets API (2 hours)
- **Slice 3.3:** Layer visualization toggles (1 hour)
- **Slice 4.1–4.2:** Procedural tuning UI (3 hours)
- **Slice 5:** Expand test coverage for spreadsheet/UI (2 hours)

### Week 4 (May 6–10)
- **Slice 1.5:** Regression test + sign-off (1 hour)
- **Slice 4.3:** Visualize parameter impact (1.5 hours)
- **Slice 5:** Continuous coverage push (2 hours)
- **Buffer:** Integration testing + fixes (4–5 hours)

### Week 5 (May 13–15)
- Final validation & sign-off
- Create Phase 2B completion tag
- Prepare Phase 2C backlog (performance + advanced features)

---

## Success Criteria

- ✅ All 30+ broken levels validate against 7-pair schema
- ✅ Native Sheets API replaces all wrapped shell calls
- ✅ Undo/redo and drag-drop working end-to-end
- ✅ Procedural tuning UI with parameter controls
- ✅ 90%+ test coverage across domain/services
- ✅ Performance baseline established (no regressions)
- ✅ Zero production impact (fallback to Phase 2A features on error)

---

## Risk & Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| Level design intent unclear for Tier 3 levels | Medium | High | Preserve original JSON, ask designer for guidance; defer to Phase 2C |
| Native Sheets API auth flow differs | Low | Medium | Test against real Sheets; keep shell scripts as fallback |
| Undo/redo memory overhead | Low | Low | Limit history to 50 snapshots; add configurable limit |
| Procedural parameter tuning introduces dominant strategies | Medium | Medium | Test with actual level designers; add guardrails (e.g., max bias weight) |

---

## Rollback Plan

If any slice encounters blockers:

1. **Level Normalization (Slice 1):** Keep Phase 2A levels valid; defer broken levels to backlog
2. **Sheets API (Slice 2):** Keep npm wrapper running; native API is additive, not destructive
3. **Editor Features (Slice 3):** Fall back to modal loading; undo/redo is optional polish
4. **Procedural UI (Slice 4):** Keep hardcoded parameters; tuning UI is optional

**All slices maintain phase-2a-complete-feature-parity tag as stable fallback.**

---

## Phase 2C Priorities (Post-2B)

Once Phase 2B is complete:

1. **Performance profiling** (if hotspots identified)
2. **Variant drag-and-drop with reordering** (advanced UX)
3. **Procedural seed explorer** (visual parameter space)
4. **Batch export to Kingfluence** (integration)
5. **Mobile/responsive UI** (if needed)

---

**Document Version:** 1.0  
**Created:** 2026-04-15  
**Last Updated:** 2026-04-15  
**Owner:** Victoria Serrano / Claude Code
