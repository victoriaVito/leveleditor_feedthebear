# Python Toolkit Parity Checklist
**Last Updated**: 2026-04-13  
**Status**: ACTIVE WORK  

---

## 1. Procedural Mutation/Search Orchestration Parity

### Target: `generateReferenceDrivenCandidates()` Web-to-Python Feature Parity

**Web Reference**: `app.js` lines 3369-3441

**Web Behavior**:
- Normalizes user adjustments (pairs/blockers/board mutations)
- Builds a preferred levels list ranked by reference similarity
- Executes 3-phase search:
  1. **Strict phase**: Generate candidates, validate, filter by guide issues (no relaxed)
  2. **Relaxed phase**: If pool < count, re-generate allowing relaxed guide issues
  3. **Direct mutation phase**: If still < count, use `buildMutatedReferenceCandidate()` fallback
- Deduplicates by board/pairs/blockers signature
- Ranks all candidates with `proceduralReferenceCandidateRank()`:
  - Feature distance (similarity)
  - Learning bias from historical sessions
  - Intent penalty (penalizes violations of requested mutations)
  - Move delta (absolute difference from base level moves)
- Returns top N sorted by rank.total, with full metadata (name, intent, similarity scores)

**Current Python State**: 
- ✅ Adjustment normalization exists (`normalize_reference_adjustments()`)
- ✅ Preferred levels ranking exists (`ranked_reference_generation_levels()`)
- ✅ Candidate ranking exists (`procedural_reference_candidate_rank()`)
- ✅ Learning integration exists (`load_procedural_learning_state()`)
- ❌ **Three-phase search orchestration is NOT implemented**
- ❌ **Deduplication by signature is NOT implemented**
- ❌ **Mutation fallback (`buildMutatedReferenceCandidate()` equivalent) is NOT ported**
- ❌ **Search-phase-aware logging/debugging is missing**

**Proof Command (Web)**:
```javascript
// In browser console, from Procedural Reference Lab:
const adjustments = { pairs: "more", blockers: "same", board: "same" };
const candidates = generateReferenceDrivenCandidates(state.main.baseLevel, "test.json", adjustments, 3);
console.log(candidates.length, candidates[0].similarity, candidates[0].intentPenalty);
```

**Proof Command (Python - after implementation)**:
```bash
python3 run_cli.py procedural-reference-variants 'levels/Progression B · Level 2.json' \
  --pairs more --blockers same --board same --count 3 \
  --learning-path '.local/toolkit_state/learning_state.json' \
  --verbose
# Expected: 3 candidates with similarity and intent_penalty scores matching web within 0.01
```

**Allowed Divergence**:
- Seed sequence can differ (Python uses different RNG initialization)
- Pool construction order can vary
- Feature extraction can have floating-point variance up to 0.005 (5bps)
- Ranking scores can drift ±2% due to floating-point arithmetic

---

### Target: `buildMutatedReferenceCandidate()` Port

**Web Reference**: `app.js` lines ~3000-3200 (search for buildMutatedReferenceCandidate)

**Web Behavior**:
- Takes a base level and applies direct pair/blocker/board mutations
- Used as fallback when pool exhaustion requires more aggressive generation
- Applies intent constraints (e.g., "more pairs" → increase pair density)
- Ensures mutations stay within valid board/density ranges
- Returns a Level object with mutation metadata

**Current Python State**: 
- ❌ **NOT IMPLEMENTED**

**Files to Create/Modify**:
- `python_toolkit/src/feed_the_bear_toolkit/domain/procedural.py` → add `mutate_reference_candidate()`
- `python_toolkit/src/feed_the_bear_toolkit/services/procedural.py` → expose as public method

**Proof Command**:
```bash
python3 run_cli.py procedural-mutate-candidate 'levels/Level 2.json' \
  --pairs more --blockers same --board same
# Expected: JSON with modified pairs/blockers/board, with mutation metadata
```

---

## 2. Procedural Variant Review Workflows

### Target: Richer Review State Machine

**Web Reference**: Procedural Reference Lab card UI + state.main.variants management

**Web Behavior**:
- Variant cards show: base level, candidate, similarity/intent scores, solution count diff
- Review actions: **open** (into editor), **keep** (save as approved), **discard** (mark invalid)
- State transitions:
  - pending → (open) → editor loop → (keep/discard from editor)
  - pending → (keep) → approved
  - pending → (discard) → rejected
- Selected candidate context carries through to editor
- Variant metadata persists (similarity, intent, source, date)

**Current Python State**:
- ✅ Card rendering exists (variant cards in native UI)
- ✅ Basic open/keep/discard actions exist
- ❌ **State machine transitions are implicit (not explicit)**
- ❌ **Metadata persistence is incomplete**
- ❌ **Follow-on editor integration is missing**
- ❌ **Review history/undo not available**

**Files to Modify**:
- `python_toolkit/src/feed_the_bear_toolkit/ui/native_app.py` → explicit state machine
- `python_toolkit/src/feed_the_bear_toolkit/domain/procedural.py` → variant state dataclass

**Proof Command**:
```bash
python3 run_cli.py serve-ui --host 127.0.0.1 --port 8765
# Navigate to Procedural view, load base level, generate variants
# Actions: open/keep/discard on cards
# Expected: state transitions logged, metadata saved, no web fallback needed
```

---

## 3. Spreadsheet Parity

### Target: Native Inspection/Control Beyond Wrappers

**Web Reference**: Spreadsheet sync panel + read/write/disconnect actions

**Web Behavior**:
- Status check: list available Google Sheets, OAuth state, last sync time
- Sync actions: pull levels, push updates, sync manager progressions
- Hygiene actions: disconnect OAuth, clear local cache
- Error handling: graceful fallback if auth fails

**Current Python State**:
- ✅ Wrapper layer exists (forwards to shell scripts)
- ✅ Status and hygiene actions exposed
- ❌ **Native read/write of spreadsheet data NOT implemented**
- ❌ **Direct Sheets API integration is only via wrapper**
- ❌ **Sync conflict resolution is implicit (not user-visible)**
- ❌ **Batch operations (pack sync, manager sync) are not unified**

**Scope for This Phase**:
- Explicitly document what remains wrapped vs native
- Add better error handling/logging for wrapper calls
- Do NOT rewrite Sheets API integration (Phase 2B)

**Files to Modify**:
- `python_toolkit/src/feed_the_bear_toolkit/services/spreadsheet.py` → document boundaries
- `python_toolkit/README.md` → update pending list

---

## 4. Native Editor Ergonomics

### Target: Parity-Critical Editor Actions

**Web Reference**: Editor UI + variant drag/drop, faster board editing, tool state clarity

**Web Behavior**:
- Board grid: clickable cells for pair placement, blocker toggle
- Pair tools: select pair color, draw trails, preview solutions
- Variant integration: drag/drop variant card into editor
- Save/validate loop: single keystroke or button to validate + save
- Undo/redo: revert board state changes
- Tool state: clear indicator of current tool (pair A vs B vs blocker)

**Current Python State**:
- ✅ Board editing exists (clickable grid)
- ✅ Pair/blocker placement works
- ❌ **Variant drag-and-drop integration is missing**
- ❌ **Tool state clarity (which pair selected?) is unclear**
- ❌ **Undo/redo is not available**
- ❌ **Keyboard shortcuts for save/validate are missing**

**Scope for This Phase**:
- Add tool state indicator
- Add keyboard shortcuts for common actions
- Add variant load-into-editor flow (variant card → editor)
- Do NOT add pixel-perfect polish or animation

**Files to Modify**:
- `python_toolkit/src/feed_the_bear_toolkit/ui/native_app.py` → editor view enhancements
- `python_toolkit/tests/test_native_app.py` → editor state machine tests

---

## 5. Test Suite Baseline

### Current Coverage

| Test File | Tests | Coverage |
|-----------|-------|----------|
| `test_procedural.py` | ~20 | domain logic (normalize, rank, generate) |
| `test_procedural_service.py` | ~15 | service layer (file I/O, learning state) |
| `test_native_app.py` | ~10 | UI state and rendering |
| Total | ~45 | ✅ All passing as of 2026-04-13 |

### New Tests Needed (from this parity push)

| Step | Test Target | Est. Tests |
|------|-------------|-----------|
| 2 (Orchestration) | Three-phase search, dedup, mutation fallback | +8 |
| 3 (Variant Review) | State transitions, metadata persistence | +6 |
| 4 (Editor) | Tool state, keyboard shortcuts, variant load | +5 |
| Total New | | +19 |

---

## 6. Success Criteria

### Phase Completion Gates

- [ ] **Step 1 (Checklist)**: This document is reviewed and signed off; all four bullets are now explicit parity targets with proof commands
- [ ] **Step 2 (Procedural)**: Three-phase search + dedup + mutation fully implemented; `test_procedural*.py` suite passes and covers all paths; web vs Python proof commands return same ranking order
- [ ] **Step 3 (Variant Review)**: Review state machine is explicit; variant metadata persists; daily review loop works without web fallback
- [ ] **Step 4 (Editor)**: Tool state is clear; keyboard shortcuts work; variant load integration present; editor tests pass
- [ ] **Step 5 (Spreadsheet)**: Wrapper vs native boundaries documented; hygiene actions robust
- [ ] **Step 6 (Hardening)**: Full suite passes; README updated; no "still pending" language about procedural/variant review/editor; changlog notes completion

---

## 7. Risk Register & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Procedural search expands unexpectedly | **HIGH** | HIGH | Start with a web-source-code analysis before coding; write search algorithm in pseudocode first |
| Feature distance calculation diverges from web | **MEDIUM** | MEDIUM | Unit test feature extraction against web; allow ±2% floating-point variance |
| Variant review state machine causes regression | **MEDIUM** | MEDIUM | Full regression tests before and after state refactor; use explicit state enum |
| Mutation fallback logic is incomplete | **HIGH** | MEDIUM | Copy web mutation logic directly; deterministic tests with frozen seed |
| Full suite runtime grows too long | **MEDIUM** | LOW | Use focused test file during dev; run full suite only at phase boundaries |

---

## 8. Execution Plan

| # | Paso | Owner | Est. Hours | Due |
|---|------|-------|-----------|-----|
| 1 | Write & review PARITY_CHECKLIST.md (this file) | Claude | 1 | **2026-04-13** |
| 2 | Port three-phase orchestration + dedup + mutation | Claude | 6 | 2026-04-14 |
| 3 | Strengthen variant review state machine | Claude | 3 | 2026-04-14 |
| 4 | Add editor ergonomics (tool state, shortcuts, variant load) | Claude | 3 | 2026-04-15 |
| 5 | Document spreadsheet parity boundaries | Claude | 1 | 2026-04-15 |
| 6 | Hardening pass: full suite + docs cleanup | Claude | 2 | 2026-04-15 |
| **Total** | | | **~16h** | **2026-04-15** |

---

**Generated**: 2026-04-13 by Claude Code  
**Project**: Feed the Bear Minigame Locally  
**Repository**: `/Users/victoria.serrano/Library/CloudStorage/SynologyDrive-back1/misScripts/minigame_locally`
