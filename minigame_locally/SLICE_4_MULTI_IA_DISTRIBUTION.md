# Phase 2B Slice 4: Distribución Multi-IA

---

## Status

| IA | Task | Status | Completado |
|---|---|---|---|
| CLAUDE | C1 | ✅ DONE | Extended API endpoints to accept & pass learning_bias + difficulty_scale |
| CLAUDE | C2 | ✅ DONE | Created POST /api/analyze-generation-parameters with histogram + stats |
| COPILOT | CP1 | ⏳ PENDING | Add learning_bias & difficulty_scale sliders to form |
| COPILOT | CP2 | ⏳ PENDING | Pass slider values to API fetch calls |
| CODEX | GPT1 | ⏳ PENDING | Add --learning-bias & --difficulty-scale CLI flags |
| CODEX | GPT2 | ⏳ PENDING | Route CLI parameters to service functions |
| GEMINI | GM1 | ⏳ PENDING | Write 12 comprehensive pytest test cases |
| GEMINI | GM2 | ⏳ PENDING | Create QA validation checklist |

---

## Overview

**Proyecto:** Feed the Bear Python Toolkit  
**Slice:** 4 (Procedural Tuning UI)  
**Deadline:** <3 horas ejecución  
**Distribución:** 4 IAs paralelas  
**Progress:** 2/8 tasks complete (25%)  

```
CLAUDE (Yo)
├─ Orquestación + validación final
├─ Task: Modify service layer signatures
└─ Task: Create analysis endpoint logic

COPILOT (GitHub)
├─ UI expertise (JavaScript/React)
└─ Task: Add sliders + event handlers to form

GPT-4 / CODEX (OpenAI)
├─ Backend Python
├─ Task: Implement CLI flags
└─ Task: Integrate parameters to functions

GEMINI (Google)
├─ Test generation + QA
├─ Task: Write comprehensive test suite
└─ Task: Create validation report
```

---

## TASK DISTRIBUTION

### **CLAUDE (This Session)** ✅ COMPLETE

**Responsibility:** Core architecture, parameter routing, endpoint logic  
**Estimated Time:** 40 min  
**Actual Time:** 25 min  
**Token Cost:** ~6k  
**Status:** ALL TASKS DELIVERED

#### Task C1: Extend API Endpoints ✅ COMPLETE

**Files Modified:**
- `python_toolkit/src/feed_the_bear_toolkit/ui/server.py` (lines 571-634)

**What Was Done:**
1. Modified `/api/procedural-reference-variants` endpoint to extract `learning_bias` and `difficulty_scale` from query params
2. Modified `/api/procedural-generate-raw` endpoint to extract both params and pass to `generate_level_raw()`
3. Both endpoints now include response fields for the new parameters
4. Defaults preserve backward compatibility (learning_bias=0.5, difficulty_scale=1.0)

**Input:** API endpoint implementations without parameter handling

**Output:** Full parameter extraction + passing to service functions

**Prompt Template:**
```
You are a systemic Python architect. Modify these function signatures to accept 
learning_bias and difficulty_scale parameters:

1. generate_reference_variants(path, adjustments, learning=None, count=10)
   - Add: learning_bias (float 0-1, default 0.5)
   - Add: difficulty_scale (float 0.5-1.5, default 1.0)
   - Add: seed_override (int, optional)

2. generate_level_raw(level_number, learning=None, seed_offset=0)
   - Add: learning_bias (float 0-1, default 0.5)
   - Add: difficulty_scale (float 0.5-1.5, default 1.0)

For each parameter, show:
- Where to inject it in the function body
- How it affects the algorithm (line numbers + logic)
- Testing surface area

Return as code blocks with line numbers.
```

**Acceptance Criteria:**
- Both functions accept new parameters without breaking existing calls
- Default values preserve backward compatibility
- New parameters are documented in docstrings

---

#### Task C2: Create Analysis Endpoint + Helper Functions

**File:** `python_toolkit/src/feed_the_bear_toolkit/ui/server.py` (after line 626)

**Input:** Existing endpoints structure, endpoint pattern from `/api/procedural-generate-raw`

**Output:** Complete POST /api/analyze-generation-parameters endpoint (50-70 lines)

**Prompt Template:**
```
You are implementing a statistical analysis endpoint for procedural generation.

Create POST /api/analyze-generation-parameters that:

Input JSON:
{
  "level_id": "a_1",
  "seed_offset": 50,
  "learning_bias": 0.5,
  "difficulty_scale": 1.0,
  "sample_size": 20
}

Output JSON:
{
  "success": true,
  "parameter_set": { ... },
  "ranking_histogram": {
    "buckets": [
      {"rank_range": "0-10", "count": 3, "mean_score": 87.2},
      ...
    ]
  },
  "summary_stats": {
    "mean_rank": 18.5,
    "stdev_rank": 7.2,
    "total_variants_analyzed": 20,
    "top_3_candidates": [
      {"name": "variant_1", "total_rank": 2.1, "similarity": 0.89, "learning_bias": 0.52},
      ...
    ]
  }
}

Also create helper function _build_rank_histogram(ranks, bucket_size=10).

Include:
- Parameter validation (learning_bias 0-1, difficulty_scale 0.5-1.5)
- Error handling (missing level_id, invalid level)
- Round floats to 2 decimals
- Handle empty variants gracefully

Return production-ready code ready to paste into server.py.
```

**Acceptance Criteria:**
- Returns 200 with correct structure on valid input
- Returns 400 with helpful message on invalid parameters
- Handles edge case: no variants generated
- Histogram buckets have > 0 count

---

### **COPILOT (GitHub / VS Code)**

**Responsibility:** Frontend UI/UX, event handling, form integration  
**Estimated Time:** 35 min  
**Token Cost:** ~4k  

#### Task CP1: Add Sliders to Form + Event Listeners

**File:** `python_toolkit/src/feed_the_bear_toolkit/ui/app.py` (lines 1200-1250)

**Input:** Current procedural form HTML structure, existing slider implementations for pairs/blockers/board

**Output:** Two new form controls + JavaScript event handlers

**Prompt Template:**
```
You are a frontend specialist. Add two new sliders to the procedural form in app.py.

Current state:
- Form exists at lines 1185-1229 with id="procedural-form"
- Seed offset input exists at line 1209
- Existing sliders for pairs_intent, blockers_intent, board_intent use class="slider"

Add:

1. Learning Bias Weight slider:
   - Input id: "learning-bias-slider"
   - Input name: "learning_bias"
   - Range: 0 to 1, step 0.1, default 0.5
   - Display label updates in real-time to show current value
   - Help text: "0.0 = ignore learning data, 1.0 = max learning influence"
   - Insert after seed_offset input

2. Difficulty Scale slider:
   - Input id: "difficulty-scale-slider"
   - Input name: "difficulty_scale"
   - Range: 0.5 to 1.5, step 0.1, default 1.0
   - Display label updates in real-time
   - Help text: "0.5 = easier, 1.0 = normal, 1.5 = harder"
   - Insert after learning_bias slider

JavaScript:
- Add event listeners to both sliders
- Sync display spans with input values on change
- Ensure no console errors

Return:
1. HTML block to insert (with line number context)
2. JavaScript event handler code
3. CSS class definitions if needed
```

**Acceptance Criteria:**
- Both sliders render without errors
- Dragging slider updates display label in real-time (0.5 → 0.6 → etc.)
- Default values match spec (0.5, 1.0)
- No console errors when form loads
- HTML is accessible (proper labels, for= attributes)

---

#### Task CP2: Pass Slider Values to API Calls

**File:** `python_toolkit/src/feed_the_bear_toolkit/ui/app.py` (procedural button handlers, ~lines 1250+)

**Input:** Existing fetch handlers for procedural-reference-btn and procedural-generate-raw-btn

**Output:** Modified fetch URLs that include learning_bias and difficulty_scale query params

**Prompt Template:**
```
You are integrating form values into API calls.

Current buttons:
- procedural-reference-btn: Calls /api/procedural-reference-variants
- procedural-generate-raw-btn: Calls /api/procedural-generate-raw

For BOTH buttons, modify the fetch() calls to:

1. Extract learning_bias value from #learning-bias-slider
2. Extract difficulty_scale value from #difficulty-scale-slider
3. Add both as query parameters to the fetch URL

Example current code pattern:
  const url = `/api/procedural-reference-variants?path=${path}&count=${count}`;
  
Example modified pattern:
  const url = `/api/procedural-reference-variants?path=${path}&count=${count}&learning_bias=${learningBias}&difficulty_scale=${difficultyScale}`;

Return only the modified sections with context comments showing what changed.
```

**Acceptance Criteria:**
- Fetch URLs include learning_bias and difficulty_scale as query params
- Values are correctly parsed as floats from slider inputs
- No URL encoding issues
- Works with existing API response handling

---

### **GPT-4 / CODEX (OpenAI)**

**Responsibility:** Backend Python, CLI integration, parameter plumbing  
**Estimated Time:** 35 min  
**Token Cost:** ~5k  

#### Task GPT1: Add CLI Flags for New Parameters

**File:** `python_toolkit/src/feed_the_bear_toolkit/cli.py`

**Input:** Existing procedural command group with --seed-offset flag already present

**Output:** Extended CLI with --learning-bias and --difficulty-scale flags on 2 commands

**Prompt Template:**
```
You are extending a Click CLI with new parameter flags.

Current state:
- File: python_toolkit/src/feed_the_bear_toolkit/cli.py
- Command group: @procedural
- Existing commands: procedural-reference-variants, procedural-generate-raw
- Existing flag example: @click.option('--seed-offset', type=int, default=0, ...)

Add to BOTH commands:

1. --learning-bias flag
   - Type: float
   - Range: 0.0 to 1.0
   - Default: 0.5
   - Help text: "Learning bias weight for variant generation"

2. --difficulty-scale flag
   - Type: float
   - Range: 0.5 to 1.5
   - Default: 1.0
   - Help text: "Difficulty scale multiplier (0.5=easier, 1.5=harder)"

For each command, show:
1. Exact @click.option decorators to add
2. Updated function signature
3. Where to pass these values to the service function call

Example expected CLI usage:
  python -m feed_the_bear_toolkit procedural-reference-variants \
    --path progression_a \
    --learning-bias 0.7 \
    --difficulty-scale 1.2

Return code ready to paste into cli.py.
```

**Acceptance Criteria:**
- `--help` output shows both new flags
- CLI accepts values without error
- `--learning-bias 0.7 --difficulty-scale 1.2` parses correctly
- Backward compatible: omitting flags uses defaults

---

#### Task GPT2: Route Parameters to Service Functions

**File:** `python_toolkit/src/feed_the_bear_toolkit/cli.py` + `procedural.py`

**Input:** CLI command handlers, service function calls at lines that invoke generate_reference_variants and generate_level_raw

**Output:** Parameter passing integration points

**Prompt Template:**
```
You are routing CLI parameters to service layer functions.

In cli.py procedural-reference-variants command:
- Extract learning_bias and difficulty_scale from click args
- Pass them to generate_reference_variants() call

In cli.py procedural-generate-raw command:
- Extract learning_bias and difficulty_scale from click args
- Pass them to generate_level_raw() call

Current pattern (find this in code):
  variants = generate_reference_variants(path=path, learning=learning_data, count=count)

New pattern (add parameters):
  variants = generate_reference_variants(
    path=path,
    learning=learning_data,
    count=count,
    learning_bias=learning_bias,
    difficulty_scale=difficulty_scale
  )

Show EXACT lines to modify with before/after context.
```

**Acceptance Criteria:**
- Parameters flow from CLI → service functions
- No missing arguments errors
- Service functions receive correct types (float, not string)

---

### **GEMINI (Google)**

**Responsibility:** Test coverage, validation, QA  
**Estimated Time:** 50 min  
**Token Cost:** ~4k  

#### Task GM1: Write Test Suite

**File:** `python_toolkit/tests/test_procedural_tuning_ui.py` (create new)

**Input:** Test patterns from existing test files (test_editor_history.py, test_procedural.py)

**Output:** 12 comprehensive test cases covering UI, CLI, and endpoint

**Prompt Template:**
```
You are writing pytest test cases for a procedural tuning feature.

Create file: python_toolkit/tests/test_procedural_tuning_ui.py

Write 12 test cases organized into 3 classes:

CLASS 1: TestProceduralTuningUI (4 tests)
- test_form_contains_learning_bias_slider: Assert 'learning-bias-slider' in HTML
- test_form_contains_difficulty_scale_slider: Assert 'difficulty-scale-slider' in HTML
- test_learning_bias_default_value: Assert default=0.5 in HTML
- test_difficulty_scale_default_value: Assert default=1.0 in HTML

CLASS 2: TestProceduralTuningCLI (4 tests)
- test_reference_variants_accepts_learning_bias: CLI --help shows --learning-bias
- test_reference_variants_accepts_difficulty_scale: CLI --help shows --difficulty-scale
- test_generate_raw_accepts_learning_bias: CLI gen-raw --help shows flag
- test_generate_raw_accepts_difficulty_scale: CLI gen-raw --help shows flag

CLASS 3: TestAnalysisEndpoint (4 tests)
- test_analyze_parameters_returns_success: POST returns 200 with valid payload
- test_analyze_parameters_returns_histogram: Response includes ranking_histogram.buckets
- test_analyze_parameters_returns_summary_stats: Response includes mean_rank, stdev_rank, top_3_candidates
- test_analyze_parameters_invalid_learning_bias: learning_bias > 1.0 returns 400

Use fixtures for:
- client (app.test_client())
- sample_payload (dict with valid params)

All tests must:
- Import correctly (no circular imports)
- Run with: pytest tests/test_procedural_tuning_ui.py -v
- Pass 100% (12/12)
- Use assert statements (not unittest style)

Return complete test file ready to paste.
```

**Acceptance Criteria:**
- 12 tests all pass: `pytest tests/test_procedural_tuning_ui.py`
- Tests are independent (can run in any order)
- Clear test names describe what they validate
- No fixtures with side effects

---

#### Task GM2: Create QA Validation Report Template

**File:** `docs/SLICE_4_QA_CHECKLIST.md` (create new)

**Input:** Slice 4 specification, acceptance criteria from all tasks

**Output:** Comprehensive QA checklist + bug report template

**Prompt Template:**
```
You are creating a QA checklist for procedural tuning features.

Create file: docs/SLICE_4_QA_CHECKLIST.md

Structure:

## Pre-QA Setup
- [ ] Branch checked out
- [ ] Dependencies installed
- [ ] `pytest` runs green
- [ ] Dev server starts without errors

## UI Testing
- [ ] Open http://localhost:5000 (or dev URL)
- [ ] Procedural form loads
- [ ] Learning bias slider visible, defaults to 0.5
- [ ] Difficulty scale slider visible, defaults to 1.0
- [ ] Dragging sliders updates display labels in real-time
- [ ] Form submits without console errors
- [ ] Browser DevTools → Network tab shows query params in fetch URLs

## CLI Testing
- [ ] `python -m feed_the_bear_toolkit procedural-reference-variants --help` shows --learning-bias
- [ ] `--help` shows --difficulty-scale
- [ ] Execute: `... --learning-bias 0.7 --difficulty-scale 1.2` (no errors)
- [ ] Output shows variants generated successfully

## Endpoint Testing
- [ ] POST http://localhost:5000/api/analyze-generation-parameters with valid JSON
- [ ] Response includes: parameter_set, ranking_histogram, summary_stats
- [ ] Response includes top_3_candidates with correct fields
- [ ] POST with invalid learning_bias (1.5) returns 400
- [ ] POST with missing level_id returns 400

## Edge Cases
- [ ] learning_bias = 0.0 (ignore learning data)
- [ ] learning_bias = 1.0 (max learning)
- [ ] difficulty_scale = 0.5 (easiest)
- [ ] difficulty_scale = 1.5 (hardest)
- [ ] sample_size = 1
- [ ] sample_size = 100

## Bug Report Template
If issues found:
- [ ] Describe steps to reproduce
- [ ] Expected vs actual behavior
- [ ] Screenshot/console error
- [ ] Affected task (C1, C2, CP1, CP2, GPT1, GPT2, GM1)
- [ ] Severity (critical/high/medium/low)

## Sign-Off
- Tester: __________
- Date: __________
- All checks passed: YES / NO
- Ready to merge: YES / NO
```

**Acceptance Criteria:**
- Checklist is comprehensive and testable
- No ambiguous items
- All edge cases covered
- Bug template is specific enough to unblock developers

---

## EXECUTION ORDER

```
┌─ START (Parallel Phase, 35 min)
│
├─ CLAUDE
│  ├─ Task C1: Modify service signatures (15 min)
│  └─ Task C2: Create endpoint logic (25 min)
│
├─ COPILOT
│  ├─ Task CP1: Add sliders to form (20 min)
│  └─ Task CP2: Pass values to API (15 min)
│
├─ GPT-4 / CODEX
│  ├─ Task GPT1: Add CLI flags (15 min)
│  └─ Task GPT2: Route parameters (20 min)
│
└─ GEMINI
   ├─ Task GM1: Write tests (35 min)
   └─ Task GM2: QA checklist (15 min)
        ↓
   (All tasks complete in parallel)
        ↓
┌─ INTEGRATION PHASE (30 min, Humano)
│
├─ Clone clean branch
├─ Apply C1 + C2 output to procedural.py
├─ Apply C1 output to server.py
├─ Apply CP1 + CP2 output to app.py
├─ Apply GPT1 + GPT2 output to cli.py
├─ Apply GM1 output as new test file
├─ Run: pytest (expect 12 new tests pass)
├─ Run: black . (format)
├─ Test manually via UI + CLI
├─ Apply GM2 checklist
│
└─ MERGE
   Commit: "Phase 2B Slice 4: Procedural tuning UI (learning_bias + difficulty_scale)"
   Tag: "phase-2b-slice-4-procedural-tuning-ui"
```

---

## INPUT/OUTPUT SUMMARY

| IA | Task | Input | Output | Format |
|---|---|---|---|---|
| CLAUDE | C1 | Current signatures | Modified functions | Python code |
| CLAUDE | C2 | Endpoint pattern | Endpoint + helper | Python code (~70 lines) |
| COPILOT | CP1 | Form structure | Sliders + JS handlers | HTML + JS |
| COPILOT | CP2 | Button handlers | Updated fetch URLs | JavaScript (~20 lines) |
| GPT-4 | GPT1 | CLI structure | @click decorators | Python decorators |
| GPT-4 | GPT2 | Service calls | Parameter passing | Python code (~15 lines) |
| GEMINI | GM1 | Test patterns | 12 test cases | Python pytest |
| GEMINI | GM2 | Spec | QA checklist | Markdown |

---

## VALIDATION GATES

**After all outputs received:**

```bash
# Gate 1: Code syntax
cd ~/minigame_locally/python_toolkit
black . --check  # No formatting errors

# Gate 2: Import safety
python -c "from feed_the_bear_toolkit.ui.app import get_procedural_form_html; print('OK')"

# Gate 3: Test execution
pytest tests/test_procedural_tuning_ui.py -v  # 12/12 pass

# Gate 4: CLI acceptance
python -m feed_the_bear_toolkit procedural-reference-variants --help | grep "learning-bias"

# Gate 5: Manual UI check (human)
# Open browser, test sliders, test endpoint
```

---

## COMMUNICATION PROTOCOL

**For each IA**, provide:

1. **Their task number** (C1, CP1, etc.)
2. **This markdown file** (full context)
3. **File paths** (absolute or relative from repo root)
4. **Prompt template** (copy-paste from above)

**Each IA responds with:**
- Code/output ready to paste
- Line numbers for context
- Any assumptions made
- Blockers (if any)

**Example response format:**
```
# Task C1: Modify Service Signatures

## Changes to procedural.py

### Line 776 - Update generate_reference_variants signature:
[CODE BLOCK]

### Line 562 - Integrate learning_bias into scoring:
[CODE BLOCK]

### Docstring update:
[CODE BLOCK]

## Assumptions:
- Backward compatibility must be preserved
- Default values align with spec (learning_bias=0.5, difficulty_scale=1.0)

## Blockers:
None
```

---

## Files to Share with Each IA

| IA | Files to Provide |
|---|---|
| CLAUDE | This MD + procedural.py (lines 550-860) |
| COPILOT | This MD + app.py (lines 1180-1260) |
| GPT-4 | This MD + cli.py (procedural command group) |
| GEMINI | This MD + existing test file examples |

---

## CONTINGENCY

If any IA cannot complete task:
1. Escalate to next-most-capable IA
2. Document in commit message
3. Flag for code review

**Fallback order:**
- CLAUDE (universal)
- GPT-4 (backend/CLI)
- COPILOT (UI)
- GEMINI (tests)

---

**Ready to distribute. Each IA gets their section + this full context.**
