### 1. PROJECT OVERVIEW
- Project name: `Feed the Bear`; the published package name is `feed-the-bear-level-generator`, while the root README describes the repository as `Feed the Bear Level Toolkit`.
- Tech stack: plain browser UI (`HTML`, `CSS`, vanilla `JavaScript`) served by a local Node HTTP server; a separate TypeScript library in `src/` exposes generator and solution-counter helpers; tests use `Vitest`.
- Primary interactive entry point: `server.mjs`, which serves `level_toolkit_web/index.html` on `http://127.0.0.1:8080`.
- Secondary library entry point: `src/index.ts`.
- Platform target: web browser with local filesystem-assisted save/export through the Node server. NOT FOUND IN CODEBASE: Electron, mobile, native app packaging.
- Build system and dependencies:
  - `package.json` scripts: `start:web`, `build`, `test`, `test:watch`, `lint`
  - Direct dev dependencies: `typescript`, `vitest`, `playwright`
  - No app bundler script is defined; the web toolkit is served as static files.
- Directory structure (max 2 levels deep, annotated):
```text
.
├── src/                      — TypeScript generator + solution counter library scaffold
├── tests/                    — generator-only automated tests
├── level_toolkit_web/        — actual browser toolkit UI and runtime game/editor logic
│   ├── app.js                — main runtime, editor, manager, play-session, import/export logic
│   ├── index.html            — single-page toolkit UI shell
│   ├── styles.css            — toolkit styles
│   ├── workshop_jsons/       — runtime mirror of level JSON files
│   ├── workshop_jsons_game_unique/ — alternate/runtime-import level mirror
│   └── workshop_progressions/ — runtime mirror of progression/workspace JSON files
├── levels/                   — canonical standalone level catalog plus tutorial/legacy carryovers
├── progressions/             — progression bundles, workspace presets, imported configs, catalog index
├── playtest/                 — saved play-session wrappers and catalog index
├── schemas/                  — JSON schema for generated levels
├── scripts/                  — maintenance/import/export/catalog utilities
├── bundles/                  — exported progression assets (JSON, screenshots, PNG summaries, ZIPs)
├── reports/                  — prior audit/reorg reports
├── level_toolkit_py/         — separate Python toolkit packaging/app work
├── google_sheets_sync/       — Apps Script sync scaffold
├── server.mjs                — local HTTP server and save/export endpoints
├── package.json              — Node scripts and dependencies
└── README.md                 — repository-level operating model and source-of-truth notes
```
- ⚠️ The repo contains two overlapping implementations:
  - `src/` is a simplified generator library.
  - `level_toolkit_web/app.js` is the actual, richer runtime used by the toolkit.

### 2. GAME MECHANICS — CURRENT STATE
- Core loop:
  - The player interacts with a grid board and draws orthogonal paths between matching endpoint pairs (`A`-`E`).
  - Paths cannot pass through blockers and cannot occupy cells already occupied by another pair.
  - The game is considered solved when every pair has a path whose first cell is one endpoint and whose last cell is the opposite endpoint.
- What the bear does:
  - NOT FOUND IN CODEBASE.
  - The runtime does not implement a bear entity, movement system, feeding animation, or bear AI. The “bear” exists in naming/theme only.
- Input method:
  - Editor board: click to place blockers/nodes/debug marks when play mode is off.
  - Play mode: pointer/click and pointer-drag on a canvas. A path must start from an endpoint.
  - Keyboard gameplay controls: NOT FOUND IN CODEBASE.
- Win condition as implemented:
  - `evaluatePlayWin()` checks that every pair path reaches the opposite endpoint.
  - Normal play does not require full-board coverage.
- Lose condition as implemented:
  - NOT FOUND IN CODEBASE.
  - Invalid moves are simply rejected; there is no timer loss, move-limit failure, or fail-state transition.
- Timer logic:
  - NOT FOUND IN CODEBASE.
- Move counter logic:
  - `moves` is stored in level JSON and shown/edited in the UI.
  - `recommendedMoves()` estimates moves as sum of endpoint Manhattan distances plus blocker count.
  - Procedural generation stores `moves` as the total edge count of the generated golden paths.
  - ⚠️ Play mode does not consume, decrement, or enforce the stored `moves` value.

### 3. LEVEL SYSTEM
- Level definition formats found:
  - Canonical JSON level objects in `levels/` with fields such as `board_size` or `board_width`/`board_height`, `pairs`, `blockers`, `moves`, `solution_count`, `target_density`, `difficulty`, `golden_path`, `validation`, `meta`.
  - Legacy JSON level objects with `gridSize`, `difficultyTier`, `pairs[].a/b`, object-based blockers, and no precomputed `solution_count`.
  - Embedded level objects inside progression bundle files.
  - Play-session wrappers embedding full level objects plus player path/history state.
- Counts observed from the files read:
  - `levels/` contains 120 JSON files total.
  - `levels/catalog_index.json` lists 109 canonical levels.
  - 9 level files still use the legacy schema.
  - 3 canonical levels are rectangular: `lvl_060_p_10_a.json` (`6x7`), `lvl_070_p_3_c.json` (`6x5`), `lvl_106_rect_test_7x8.json` (`7x8`).
- Fields present per canonical level (observed variants):
  - Common core: `level`, `grid`, `pairs`, `blockers`, `solution_count`, `target_density`, `golden_path`, `validation`, `meta`
  - Usually present: `moves`
  - Sometimes present: `difficulty`, `board_width`, `board_height`, `board_size`
  - Optional toggle in runtime/editor only: `decal`
- Fields present per legacy level:
  - `id`, `name`, `source`, `tested`, `difficultyTier`, `gridSize`, `moves`, `pairs`, `blockers`, `meta`
- How levels are loaded:
  - Direct level import goes through `toPlayableLevel()`.
  - Canonical payloads are cloned directly.
  - Legacy payloads are normalized by `normalizeLegacyLevel()` into the canonical runtime shape.
  - Progression imports are handled in Level Manager through `expandManagerImportPayload()`.
- How levels are sequenced:
  - Progression bundles use ordered `slots` arrays.
  - Play Sessions can load a progression in slot order into a queue.
  - Procedural generation can build a fixed 10-level episode in memory.
- Difficulty curve existence:
  - Yes, but only partially enforced.
  - Procedural generation uses a 10-level curve keyed by target solution-density, board-size options, pair ranges, and blocker ranges.
  - Manager progressions also track per-slot difficulty labels.
  - Catalog reality is inconsistent: many stored levels omit `difficulty`, 23 canonical levels are marked unsolvable, and 40 canonical levels have `validation.density_match: false`.
- Progression format types found in `progressions/`:
  - Slot-reference configs: `{ name, slots[] }`
  - Slot bundles with reserved tutorial slot: `{ name, tutorial_level_file, slots[] }`
  - Embedded bundles with actual `level` payloads per slot
  - Workspace presets: `{ name, all_level_files, progressions, default_session_progression, ... }`
  - Extra bucket: `{ name, levels[] }`
- ⚠️ `progressionA_bundle.json` assigns `levels/lvl_107_susanne_level_4_manager_ok.json` to both slot 4 and slot 5; the same duplicate assignment appears in the workshop workspace.

### 4. PATHFINDING / ROUTING LOGIC
- Algorithm used:
  - Recursive depth-first search over orthogonal neighbors.
  - For each pair, the code enumerates candidate paths first.
  - Then it recursively assigns pair paths in pair order while carrying an occupied-cell set.
  - Memoization hashes `(pairIndex, sortedOccupiedCells)` to avoid some repeated subproblems.
- Where it exists:
  - `level_toolkit_web/app.js` contains the runtime version used by validation/import/export and supports rectangular boards.
  - `src/solution-counter.ts` contains a separate TypeScript implementation that only takes a single `boardSize`.
- How routes are computed:
  - Orthogonal moves only: up, down, left, right.
  - Blocked cells are preoccupied.
  - Endpoint start cells are occupied before exploration; end cells are allowed as terminal cells.
  - Paths cannot cross or overlap other occupied cells.
- Solution validation:
  - Yes.
  - `validateLevel()` checks level bounds, pair counts, endpoint overlap, blocker overlap, non-negative moves, solvability, and optional decal/full-cover requirement.
- Solution counting:
  - Yes.
  - `countSolutions()` counts all valid pair assignments up to a cap of `20` total solutions.
  - Pair-path enumeration per pair is also capped locally at `200` paths.
  - This is brute-force search with memoization, not BFS, not shortest-path routing, and not a SAT/constraint solver.
- Full-cover / decal validation:
  - `hasFullCoverSolution()` runs a similar DFS search and returns whether any solution covers all free cells.
  - ⚠️ No canonical level file currently includes `validation.decal_required` / `validation.decal_pass`; the feature exists in runtime code but is absent from the audited catalog payloads.
- Known visible edge cases / bugs:
  - ⚠️ The runtime and the library diverge. `src/generator.ts` hardcodes `solution_count` from `LEVEL_TARGET_COUNTS`, while `level_toolkit_web/app.js` computes it by search.
  - ⚠️ `src/solution-counter.ts` is square-board-only, while the active web runtime supports rectangular boards.
  - ⚠️ `src/solution-counter.ts` declares `usedStarts` but never uses it.
  - ⚠️ Search complexity is exponential and only controlled by caps (`20` and `200`), so higher-complexity boards can become expensive or undercount once caps are hit.
  - Pair order is fixed as stored; there is no pair-order optimization or canonical reordering before search.

### 5. DIFFICULTY ANALYSIS
- Board size as a difficulty lever:
  - Yes.
  - Procedural curve uses `[4]`, `[5]`, or `[5, 6]` board options in the active generator.
  - The catalog also contains many handcrafted `7x7`, `8x8`, and a few rectangular boards.
- Pair count as a difficulty lever:
  - Yes.
  - Procedural curve raises pair ranges from `2` up to `4`.
  - App validation accepts `2..5` pairs.
  - Catalog distribution among canonical-format levels read: 29 levels with 2 pairs, 64 with 3 pairs, 17 with 4 pairs.
- Solution density used or tracked:
  - Yes.
  - `solution_count`, `target_density`, `density_match`, and difficulty-to-density mappings are present.
  - Manager scoring also uses solution count as a feature when comparing reference levels.
- Min/max solution count constraints per level:
  - Procedural curve uses density ranges:
    - `HIGH: 6..20`
    - `MEDIUM-HIGH: 3..5`
    - `MEDIUM: 2..4`
    - `MEDIUM-LOW: 2..3`
    - `LOW: 2`
    - `VERY-LOW: 2`
    - `SINGLE: 1`
    - `LOW-MEDIUM: 2..4`
  - Validation checks whether a generated/imported level’s solution count matches the target density.
  - There is no global hard stop preventing invalid catalog entries from existing in `levels/`.
- Other difficulty levers found:
  - Blocker count ranges in the procedural curve.
  - Manual `difficulty` labels and manager `slotDifficulty`.
  - Learned-reference similarity scoring (`boardWidth`, `boardHeight`, `pairs`, `blockers`, `moves`, `solutions`).
- Current rating: `RUDIMENTARY`
  - Reason: the codebase clearly tracks difficulty inputs and outputs, but the stored catalog is not consistently validated against them, and progression quality still depends on manual curation.

### 6. GAMEPLAY ISSUES — VISIBLE FROM CODE
- ⚠️ No explicit bear gameplay exists. The shipped gameplay is an abstract endpoint-connection puzzle.
- ⚠️ The canonical catalog contains 23 canonical-format level files with `validation.solvable: false` and `solution_count: 0`.
  - This includes `levels/tutorial_level.json` and `levels/lvl_109_tutorial_level.json`.
- ⚠️ `progressionExtra_bundle.json` explicitly labels four entries as unsolvable or partially occluded:
  - `lvl_030_image21_level_editor.json`
  - `lvl_022_image13_level_editor.json`
  - `lvl_042_image33_level_editor.json`
  - `lvl_043_image34_level_editor.json`
- ⚠️ Progression A duplicates the same level in two adjacent slots (`lvl_107_susanne_level_4_manager_ok.json` in slots 4 and 5).
- ⚠️ Difficulty data is inconsistent:
  - 80 audited level files have empty or missing `difficulty`.
  - 40 canonical-format levels have `validation.density_match: false`.
- ⚠️ Level format consistency is poor:
  - 9 legacy JSON files remain in the canonical `levels/` folder.
  - Some levels use `board_size` only, some use both `board_size` and `board_width`/`board_height`, and some rectangular levels use width/height only.
- ⚠️ `moves` consistency is poor:
  - 10 level files omit `moves` entirely.
  - Even when present, moves are metadata only; play mode does not enforce them.
- ⚠️ Stored validation can be stale or contradictory across wrappers.
  - Example: playtest snapshots and embedded progression bundles include level payloads whose `validation.solvable` is already false.
- UI/UX issues visible from component structure:
  - Canvas-first play/editor has no keyboard-control path.
  - There is only one explicit `aria-live` region; broader accessibility semantics are minimal.
  - Validation is manual (`Validate` button / session validation), so an editor snapshot can hold outdated `solution_count` and validation flags until revalidated.
  - The monolithic single-page toolkit mixes procedural generation, editing, play, sessions, manager, settings, and spreadsheet sync in one 5,360-line file.

### 7. MISSING FEATURES (vs. common expectations for this genre)
- Solution counter:
  - Present in code and stored in level JSON.
- Level editor:
  - Present in code.
- Undo/redo:
  - NOT FOUND IN CODEBASE.
- Analytics or telemetry:
  - NOT FOUND IN CODEBASE.
- Sound/haptics hooks:
  - NOT FOUND IN CODEBASE.
- Save/load state:
  - Present, but mostly for toolkit/workspace persistence rather than end-user game progression.
  - Local browser storage is used for learning data, play sessions, editor draft, workspace state, and settings.
  - Node server endpoints save JSON, PNG, ZIP, and spreadsheet outputs into the project.
- Accessibility considerations:
  - Minimal.
  - One `aria-live="polite"` loading section exists.
  - NOT FOUND IN CODEBASE: keyboard gameplay controls, focus-management system, screen-reader labels for the canvas board, reduced-motion handling, high-contrast mode, audio alternatives.

### 8. TECHNICAL DEBT & CODE QUALITY
- Hardcoded values that should be configurable:
  - Absolute `PROJECT_ROOT`
  - Default spreadsheet workbook path
  - Default Google Spreadsheet ID
  - Fixed 10-slot progression model
  - Fixed level range `1..10`
- Magic numbers in logic:
  - Solution cap `20`
  - Local path enumeration cap `200`
  - Generator attempts `12`
  - Learned-batch max attempts `safeCount * 20`
  - Board bounds `4..8`
  - Pair count bounds `2..5`
  - Manager page size `24`
- Missing / weak error handling:
  - Save/export endpoints return generic 500 responses with raw error messages.
  - Workspace persistence is best-effort and silently swallows failures.
  - Catalog integrity is not enforced at load time; invalid/unsolvable levels can remain in canonical folders and even in embedded progression payloads.
- Modules doing too much:
  - ⚠️ `level_toolkit_web/app.js` contains almost all runtime concerns: generation, routing, validation, editor, play, sessions, manager, persistence, screenshot/export, spreadsheet sync, and settings.
- Schema / contract drift:
  - ⚠️ `schemas/level-output.schema.json` only allows `board_size` up to `6`, max `4` pairs, and square coordinates bounded to `0..5`.
  - The live toolkit and catalog support `7x7`, `8x8`, rectangular boards, and up to `5` pairs.
- Implementation drift:
  - ⚠️ Root `README.md` says the toolkit uses a local Node server.
  - ⚠️ `level_toolkit_web/README.md` says “Browser-only toolkit (no backend)”, which is no longer true for the active save/export flow.
- Test coverage:
  - Present but very narrow.
  - Only `tests/generator.test.ts` exists, with five tests covering the simplified `src/` generator scaffold.
  - NOT FOUND IN CODEBASE: tests for `level_toolkit_web/app.js`, `server.mjs`, level normalization, progression import/export, play-state logic, or catalog validation.

### 9. RECOMMENDED NEXT STEPS
1. **What**: Clean the canonical catalog and progression bundles so no published tutorial/progression entry is unsolvable or duplicated.
   **Why**: The current source of truth already includes invalid tutorial data, unsolvable level files, and at least one duplicated progression slot, which undermines documentation, playtests, and any future balancing work.
   **Effort**: MEDIUM
2. **What**: Define and enforce one canonical level schema, then migrate or quarantine the 9 legacy files and align `schemas/level-output.schema.json` with actual runtime support.
   **Why**: The repo currently mixes incompatible shapes (`board_size`, `board_width`/`board_height`, `gridSize`, legacy endpoint objects), which makes tooling and documentation brittle.
   **Effort**: MEDIUM
3. **What**: Unify the generator/solution-counter implementation so `src/` and `level_toolkit_web/app.js` describe the same rules and difficulty model.
   **Why**: The repo currently has two overlapping implementations with different capabilities and different `solution_count` behavior, which invites drift and bad documentation.
   **Effort**: HIGH
4. **What**: Add an automated catalog audit step to CI or a script-backed release gate.
   **Why**: Without a hard gate, unsolvable levels, stale validation flags, empty difficulty fields, and duplicate progression assignments can keep re-entering the source-of-truth folders.
   **Effort**: MEDIUM
5. **What**: Make difficulty rules explicit and measurable at the progression level.
   **Why**: Difficulty levers exist, but the current system is only partially enforced and many stored levels do not cleanly map to the intended curve.
   **Effort**: MEDIUM
6. **What**: Split `level_toolkit_web/app.js` into focused modules.
   **Why**: The current monolith makes auditing, testing, and future maintenance unnecessarily hard.
   **Effort**: HIGH
7. **What**: Decide whether `moves` is editorial metadata or an actual gameplay rule, then implement consistently.
   **Why**: Right now moves are authored, exported, and displayed, but they do not affect play outcomes.
   **Effort**: LOW to MEDIUM
8. **What**: Add basic accessibility and input fallbacks for the canvas-based play flow.
   **Why**: Current interaction is pointer-first and minimally annotated, which limits usability and makes the toolkit harder to test and demo.
   **Effort**: MEDIUM

### 10. PRODUCT IMPROVEMENT NOTES — REFERENCE: FLOW FREE+ (APPLE ARCADE)
- Reference verified on March 12, 2026:
  - The provided App Store link resolves to `Flow Free+` by Big Duck Games on Apple Arcade.
  - App Store positioning: puzzle game, Apple Arcade catalog title, no ads, no in-app purchases.
  - Publicly stated core loop: connect matching colors, cover the full board, and prevent crossing/overlap.
- Why this reference matters for Feed the Bear:
  - It is the same puzzle family as the current codebase: connect endpoint pairs on a grid under non-crossing constraints.
  - It shows a clearer product framing than the current repository: pure puzzle loop first, progression and challenge systems second.
- Mechanics from the reference product that are relevant here:
  - Full-board coverage is part of the core solve condition in `Flow Free+`.
  - Board completion and non-crossing rules are communicated as the main source of challenge, not as secondary validation metadata.
  - The App Store copy emphasizes a very wide puzzle volume, daily puzzles, and a range from easy to extreme.
  - The non-Arcade `Flow Free` App Store listing also exposes a broader challenge structure: multiple board sizes, daily puzzles, time-trial variants, completion tracking, and efficiency/speed goals.
- Comparison against the audited Feed the Bear codebase:
  - Feed the Bear currently validates only pair completion as the normal win state; full-board coverage exists only as the optional `decal` rule.
  - Feed the Bear stores `moves`, `solution_count`, `difficulty`, and validation flags, but these systems are not yet presented as a clean player-facing challenge model.
  - Feed the Bear has editor, manager, and play-session tooling, but the actual player loop is less clearly productized than the reference game.
- Difficulty understanding in the reference game:
  - Difficulty is legible because the player can quickly see the variables: board size, number of pairs, path congestion, and whether the board must be fully covered.
  - The challenge also scales through content architecture: many handcrafted levels, daily content, and named challenge formats such as time trial in the non-Arcade version.
  - The App Store copy frames difficulty as a spectrum from relaxing/easy to extreme, which is useful because it sets expectation before the player enters a level.
- Difficulty understanding in the current Feed the Bear codebase:
  - Difficulty is primarily understood internally, not externally.
  - Internally, the code uses board size, pair count, blocker count, solution density, and optional full-cover validation.
  - Externally, the player-facing runtime does not yet explain why one level is easy, medium, or hard.
  - Because `moves` are not enforced and full-cover is optional, the current player challenge can feel weaker than the editorial metadata suggests.
- Design implication for improvements:
  - The game should make its challenge model explicit to the player, not only to the toolkit.
  - If Feed the Bear wants to feel closer to a polished puzzle product, difficulty should be communicated through visible levers:
    - board size
    - pair count
    - blocker density
    - whether full-board coverage is required
    - whether move efficiency matters
  - Challenge modes should be separated clearly:
    - main progression
    - hard challenge levels
    - daily or rotating content
    - optional efficiency goals
- Notes on hints and monetization:
  - Verified fact: the Apple Arcade version `Flow Free+` states `No ads` and `No in-app purchases`, so hint monetization is not part of that specific product version.
  - Verified fact: the non-Arcade `Flow Free` listing is `Free` and `Offers In-App Purchases`.
  - Verified fact: the non-Arcade listing publicly emphasizes additional purchasable level packs; the App Store text reviewed does not explicitly state that hints are the monetized item.
  - Inference for product planning: if Feed the Bear is intended for a non-Arcade free-to-play model, hints are a much more genre-aligned monetization lever than selling access to the core rule system.
  - Inference for product planning: hint monetization only works well if the puzzle game first establishes trust that levels are fair, handcrafted or well-curated, and meaningfully difficult.
  - Inference for product planning: to monetize hints well, the game needs:
    - reliable solvability
    - a clean difficulty ramp
    - moments of productive friction
    - a hint system that escalates from light guidance to stronger intervention
- Suggested improvement themes to carry into the future documentation:
  - Reframe Feed the Bear as a player-facing puzzle product, not only a toolkit.
  - Make difficulty visible and understandable in the game UX.
  - Decide whether full-board coverage is a core rule or a premium challenge modifier.
  - Add explicit challenge layers beyond “solve / not solved”:
    - completion
    - efficiency
    - daily challenge
    - extreme challenge
  - If the business model will rely on hints, prioritize curation quality and difficulty trust before implementing the hint economy.
- Additional design conclusions from collaborative playtests and level-design review:
  - After reviewing the prototype together with level designers, building levels collaboratively, and revisiting the current design rules, the main risk is no longer theoretical: difficulty is currently easier to perceive as frustration than as satisfying mastery.
  - In the current prototype, losing a level does not create a strong feeling of learning or reward. The move system mainly becomes meaningful when the player is already blocked, so failure reads as punitive rather than motivating.
  - The interaction feel also matters. In the reference game, drag feedback appears more fluid and permissive while the player is routing, which makes experimentation feel less punishing and more readable moment to moment.
  - Another important difference is that the player can leave a route partially drawn, switch to another pair, and return later to continue the unfinished path. This creates a more flexible planning loop and supports exploration across multiple local problems on the board.
  - Reference games in this genre create a much stronger emotional loop because success is tied to filling the whole board. When the player covers every square, the outcome feels cleaner, more complete, and more rewarding than simply connecting endpoints.
  - This is a major design implication for Feed the Bear: full-board coverage should be reinforced as a required core rule, not only as an optional validation flag. The challenge should tend toward painting the board, not merely joining points.
  - The rightmost reference screenshot also shows structural board segmentation through internal bars or partitions. These act as routing constraints and balancing tools even when the board does not use hole-style blockers like the current prototype.
  - This suggests a cleaner balancing direction for Feed the Bear:
    - use structural partitions and shape constraints
    - increase board size gradually
    - increase routing length and planning depth
    - increase objective complexity over time
  - Larger boards matter not only because they create more possible routes, but because they change how players read space. As in maze design, the eye starts projecting candidate paths very early; longer routes create a different planning problem and a stronger sense of control.
  - The reference products also manage content duration well through mode structure: daily challenges, weekly challenges, time-based modes, and free play reduce the need to constantly ship only handcrafted linear content.
  - For Feed the Bear, this points toward a more scalable content model:
    - main progression for onboarding and mastery
    - daily/weekly challenges for retention
    - time-limited or performance modes for advanced players
    - free or endless procedural play for long-tail engagement
  - Accessibility should be improved by moving away from color-only identity. The most robust direction is to use distinct shapes or symbols instead of relying primarily on color, especially for color-blind players.
  - Those shapes should ideally not be confused with in-world game objects or thematic entities. They should work as neutral puzzle markers, so that the player reads them as interaction logic rather than narrative decoration.
  - A longer-term progression could also expand objective structure beyond simple endpoint pairs. One possible extension would be levels that require connecting three linked points instead of only two, creating longer and more strategic path commitments.
  - Monetization direction:
    - The strongest monetizable moment in this puzzle family is doubt, not failure itself.
    - Hints are the most natural monetization lever because they support the player exactly when uncertainty appears.
    - This only works if the game first earns trust that the puzzle is fair, readable, and genuinely solvable.
  - Positive performance framing:
    - The reference experience does not center challenge around a punitive move limit.
    - Instead, it gives positive feedback through visible progress and performance stats such as connected pairs, total steps taken, and relative standing through record/ranking-style comparisons.
    - This is a healthier motivational model because it rewards optimization after comprehension, rather than punishing the player before mastery is established.
  - Endless-content direction:
    - A promising long-term model would be effectively “infinite” levels through procedural generation plus curation feedback.
    - This would reduce pressure on manual level production and allow the game to scale through modular level generation.
    - To make that viable, the game would need tracking and learning loops so player behavior can be used to evaluate level quality, detect frustration points, and improve future generation.
  - Tracking and learning requirements implied by this direction:
    - track start/completion/abandon events per level
    - track time-to-first-move, total solve time, resets, undo usage, and hint usage
    - track path rewrites, backtracks, dead-end frequency, and the point at which the player abandons
    - track win rate by level, board size, pair count, blocker/partition pattern, and objective type
    - track whether difficulty comes from productive exploration or repeated confusion
  - Procedural learning system direction:
    - generate modular level candidates from reusable board patterns and objective templates
    - validate solvability and estimated difficulty automatically
    - collect live player data on perceived and actual difficulty
    - identify levels that are too trivial, too frustrating, or misleading
    - feed corrected labels and rejected patterns back into generation rules or an ML-assisted ranking model
  - Level-correction loop direction:
    - flag levels with high abandon rates, high reset frequency, or excessive hint dependency
    - compare editorial difficulty expectations with real player outcomes
    - either adjust the level manually or downgrade/remove the pattern from the procedural pool
    - preserve successful patterns as reusable modules for future generation
- Source note:
  - This comparison is based on the App Store pages reached from the provided link and on the public App Store listing for the non-Arcade `Flow Free` product.

### 11. EXECUTIVE DESIGN SYNTHESIS
#### Design Risks
- The current prototype risks producing difficulty mainly through frustration rather than through satisfying spatial mastery.
- The move system currently becomes meaningful mostly when the player is already blocked, so failure can feel punitive instead of motivating.
- The game currently does not translate its internal difficulty variables into a clear player-facing challenge language.
- The core puzzle loop is weaker than in comparable games because endpoint connection is enough to win, while full-board coverage is optional.
- Color-based pair identity creates avoidable accessibility risk for color-blind players.

#### Design Direction
- The most important mechanical shift is to make full-board coverage mandatory, so that the goal is not only to connect points but to paint and resolve the whole board.
- Interaction should feel more fluid while drawing:
  - better live drag feedback
  - lower friction while exploring candidate paths
  - support for leaving a path unfinished and resuming it later
- Allowing the player to pause one route, work on another pair, and then return to the first route would create a more strategic and less frustrating planning experience.
- Difficulty should be shaped through readable spatial levers:
  - larger boards
  - longer routes
  - structural partitions
  - objective complexity
  - full-board occupation pressure
- Structural bars, partitions, or board-shape changes appear to be a cleaner balancing tool than relying only on the current blocker model.
- Visual identity for puzzle goals should move from color-first logic to shape/symbol-first logic, with markers that are neutral and not confused with thematic game objects.
- A longer-term extension could introduce more complex routing goals, including levels that connect three linked points instead of only two.

#### Content Strategy
- The game should not rely only on a finite handcrafted linear progression.
- A stronger structure would combine:
  - core progression
  - daily challenges
  - weekly challenges
  - time-based challenge modes
  - free or endless procedural play
- This reduces pressure on handcrafted content volume while increasing retention and perceived freshness.
- Larger boards and recurring challenge formats can make the game last longer without requiring a proportional increase in manually authored levels.

#### Monetization Strategy
- The most natural monetization point in this puzzle genre is doubt, not punishment.
- Hints are the strongest monetizable feature because they support the player exactly when uncertainty appears.
- A hint economy only works if the game first establishes trust that:
  - levels are fair
  - levels are solvable
  - difficulty is legible
  - failure teaches something
- If the game keeps generating frustration without clear mastery, hint monetization will feel extractive instead of supportive.
- The current move-limit framing is weaker than positive performance framing.
- A better system would emphasize:
  - pairs completed
  - total steps used
  - board coverage/completion quality
  - records, rankings, or comparison against prior bests
- This creates a more motivating performance loop and gives the player reasons to replay a solved level without relying on punishment.

#### Tracking Requirements
- To support procedural content, balancing, and future monetization, the game should track:
  - level start, completion, abandon
  - solve time
  - time to first move
  - resets
  - undo usage
  - hint usage
  - backtracks and path rewrites
  - dead-end frequency
  - win rate by board type and objective type
  - completion rate by difficulty label
- These signals are necessary to distinguish productive challenge from avoidable confusion.

#### Procedural and Learning System Direction
- A scalable long-term strategy would be to create effectively infinite content through procedural generation plus curation feedback.
- Levels should be built from modular board patterns, objective templates, and constraint combinations.
- Each generated level should be:
  - validated for solvability
  - estimated for difficulty
  - measured against live player outcomes
- Player telemetry should then be used to:
  - identify trivial levels
  - identify frustrating or misleading levels
  - compare editorial expectations against real player behavior
  - improve generator rules
  - support ML-assisted ranking or selection of better candidates
- A correction loop should remove or downgrade patterns that generate excessive abandon, resets, or hint dependency, while preserving successful patterns as reusable modules.

#### Strategic Conclusion
- Feed the Bear should evolve from a toolkit-centered puzzle prototype into a player-facing puzzle product with a clearer mastery loop.
- The strongest path forward is:
  - mandatory full-board coverage
  - accessibility through shapes instead of color-only coding
  - richer board structure through partitions and larger spaces
  - layered challenge modes
  - hint-led monetization
  - procedural content supported by telemetry and learning loops

### 12. FILES INVENTORY
- Special files read directly:
```text
package.json                              — Node scripts and direct dependencies for the repo.
README.md                                 — repository purpose, source-of-truth rules, and runtime structure.
server.mjs                                — local HTTP server plus save/export/sync endpoints.
tsconfig.json                             — TypeScript compiler configuration.
src/index.ts                              — TypeScript library export surface.
src/config.ts                             — simplified procedural difficulty curve and density constants.
src/types.ts                              — TypeScript types for generated levels.
src/generator.ts                          — simplified library generator implementation.
src/solution-counter.ts                   — separate TypeScript solution-counting implementation.
src/seeded-rng.ts                         — seeded RNG helpers for the library generator.
tests/generator.test.ts                   — generator-only automated tests.
level_toolkit_web/README.md               — older web-toolkit README with runtime summary.
level_toolkit_web/index.html              — single-page toolkit UI shell.
level_toolkit_web/styles.css              — toolkit styling.
level_toolkit_web/app.js                  — active browser runtime for generation, editor, play, sessions, manager, persistence, and exports.
schemas/level-output.schema.json         — declared target JSON schema for generated levels.
levels/README.md                          — canonical level-catalog folder rules.
levels/catalog_index.json                 — canonical level index and metadata summary.
progressions/catalog_index.json           — canonical progression index and metadata summary.
progression_levels_reference_config.json  — root slot-reference progression config sample.
progressions/progressionA_bundle.json     — slot-based progression A bundle.
progressions/progressionB_bundle.json     — slot-based progression B bundle.
progressions/progressionC_bundle.json     — slot-based progression C bundle.
progressions/progressionExtra_bundle.json — extra-bucket bundle with explicit reason strings.
progressions/workshop_workspace.json      — workspace preset combining all workshop progressions.
progressions/progressionImportedClean_bundle.json — embedded progression bundle with inline level payloads.
playtest/play_011_play_session_level_1_validate.json — sample play-session wrapper with embedded level and player path history.
levels/tutorial_level.json                — root-level tutorial copy marked unsolvable.
levels/lvl_106_rect_test_7x8.json         — rectangular canonical level example.
levels/lvl_110_progression_b_slot_7.json  — legacy-format canonical level example.
levels/lvl_111_progression_b_slot_8.json  — legacy-format canonical level example.
levels/lvl_112_progression_b_slot_10.json — legacy-format canonical level example.
progressions/progressiona_workshop_2.json — embedded progression payload sample showing stale/invalid level data.
progressions/progressionb_workshop_2.json — embedded progression payload sample showing stale/invalid level data.
progressions/progressionc_workshop_2.json — embedded progression payload sample showing stale/invalid level data.
```
- Bulk-audited level files read:
```text
levels/lvl_001_hard_10_2.json                 — standalone level JSON audited for format, validation flags, solvability metadata, and progression fit.
levels/lvl_002_hard_large_01_7x7.json         — standalone level JSON audited for format, validation flags, solvability metadata, and progression fit.
levels/lvl_003_hard_large_02_8x8.json         — standalone level JSON audited for format, validation flags, solvability metadata, and progression fit.
levels/lvl_004_hard_large_03_7x7.json         — standalone level JSON audited for format, validation flags, solvability metadata, and progression fit.
levels/lvl_005_hard_large_04_8x8.json         — standalone level JSON audited for format, validation flags, solvability metadata, and progression fit.
levels/lvl_006_hard_large_05_7x7.json         — standalone level JSON audited for format, validation flags, solvability metadata, and progression fit.
levels/lvl_007_hard_large_06_8x8.json         — standalone level JSON audited for format, validation flags, solvability metadata, and progression fit.
levels/lvl_008_hard_large_07_7x7.json         — standalone level JSON audited for format, validation flags, solvability metadata, and progression fit.
levels/lvl_009_hard_large_08_8x8.json         — standalone level JSON audited for format, validation flags, solvability metadata, and progression fit.
levels/lvl_010_hard_large_09_7x7.json         — standalone level JSON audited for format, validation flags, solvability metadata, and progression fit.
levels/lvl_011_hard_large_10_8x8.json         — standalone level JSON audited for format, validation flags, solvability metadata, and progression fit.
levels/lvl_012_image02_level_editor.json      — standalone level JSON audited for format, validation flags, solvability metadata, and progression fit.
levels/lvl_013_image03_level_editor.json      — standalone level JSON audited for format, validation flags, solvability metadata, and progression fit.
levels/lvl_014_image04_level_editor.json      — standalone level JSON audited for format, validation flags, solvability metadata, and progression fit.
levels/lvl_015_image05_level_editor.json      — standalone level JSON audited for format, validation flags, solvability metadata, and progression fit.
levels/lvl_016_image07_level_editor.json      — standalone level JSON audited for format, validation flags, solvability metadata, and progression fit.
levels/lvl_017_image08_level_editor.json      — standalone level JSON audited for format, validation flags, solvability metadata, and progression fit.
levels/lvl_018_image09_level_editor.json      — standalone level JSON audited for format, validation flags, solvability metadata, and progression fit.
levels/lvl_019_image10_level_editor.json      — standalone level JSON audited for format, validation flags, solvability metadata, and progression fit.
levels/lvl_020_image11_level_editor.json      — standalone level JSON audited for format, validation flags, solvability metadata, and progression fit.
levels/lvl_021_image12_level_editor.json      — standalone level JSON audited for format, validation flags, solvability metadata, and progression fit.
levels/lvl_022_image13_level_editor.json      — standalone level JSON audited for format, validation flags, solvability metadata, and progression fit.
levels/lvl_023_image14_level_editor.json      — standalone level JSON audited for format, validation flags, solvability metadata, and progression fit.
levels/lvl_024_image15_level_editor.json      — standalone level JSON audited for format, validation flags, solvability metadata, and progression fit.
levels/lvl_025_image16_level_editor.json      — standalone level JSON audited for format, validation flags, solvability metadata, and progression fit.
levels/lvl_026_image17_level_editor.json      — standalone level JSON audited for format, validation flags, solvability metadata, and progression fit.
levels/lvl_027_image18_level_editor.json      — standalone level JSON audited for format, validation flags, solvability metadata, and progression fit.
levels/lvl_028_image19_level_editor.json      — standalone level JSON audited for format, validation flags, solvability metadata, and progression fit.
levels/lvl_029_image20_level_editor.json      — standalone level JSON audited for format, validation flags, solvability metadata, and progression fit.
levels/lvl_030_image21_level_editor.json      — standalone level JSON audited for format, validation flags, solvability metadata, and progression fit.
levels/lvl_031_image22_level_editor.json      — standalone level JSON audited for format, validation flags, solvability metadata, and progression fit.
levels/lvl_032_image23_level_editor.json      — standalone level JSON audited for format, validation flags, solvability metadata, and progression fit.
levels/lvl_033_image24_level_editor.json      — standalone level JSON audited for format, validation flags, solvability metadata, and progression fit.
levels/lvl_034_image25_level_editor.json      — standalone level JSON audited for format, validation flags, solvability metadata, and progression fit.
levels/lvl_035_image26_level_editor.json      — standalone level JSON audited for format, validation flags, solvability metadata, and progression fit.
levels/lvl_036_image27_level_editor.json      — standalone level JSON audited for format, validation flags, solvability metadata, and progression fit.
levels/lvl_037_image28_level_editor.json      — standalone level JSON audited for format, validation flags, solvability metadata, and progression fit.
levels/lvl_038_image29_level_editor.json      — standalone level JSON audited for format, validation flags, solvability metadata, and progression fit.
levels/lvl_039_image30_level_editor.json      — standalone level JSON audited for format, validation flags, solvability metadata, and progression fit.
levels/lvl_040_image31_level_editor.json      — standalone level JSON audited for format, validation flags, solvability metadata, and progression fit.
levels/lvl_041_image32_level_editor.json      — standalone level JSON audited for format, validation flags, solvability metadata, and progression fit.
levels/lvl_042_image33_level_editor.json      — standalone level JSON audited for format, validation flags, solvability metadata, and progression fit.
levels/lvl_043_image34_level_editor.json      — standalone level JSON audited for format, validation flags, solvability metadata, and progression fit.
levels/lvl_044_level_01.json                  — standalone level JSON audited for format, validation flags, solvability metadata, and progression fit.
levels/lvl_045_level_02.json                  — standalone level JSON audited for format, validation flags, solvability metadata, and progression fit.
levels/lvl_046_level_03.json                  — standalone level JSON audited for format, validation flags, solvability metadata, and progression fit.
levels/lvl_047_level_04.json                  — standalone level JSON audited for format, validation flags, solvability metadata, and progression fit.
levels/lvl_048_level_05.json                  — standalone level JSON audited for format, validation flags, solvability metadata, and progression fit.
levels/lvl_049_level_06.json                  — standalone level JSON audited for format, validation flags, solvability metadata, and progression fit.
levels/lvl_050_level_07.json                  — standalone level JSON audited for format, validation flags, solvability metadata, and progression fit.
levels/lvl_051_level_08.json                  — standalone level JSON audited for format, validation flags, solvability metadata, and progression fit.
levels/lvl_052_level_09.json                  — standalone level JSON audited for format, validation flags, solvability metadata, and progression fit.
levels/lvl_053_level_1.json                   — standalone level JSON audited for format, validation flags, solvability metadata, and progression fit.
levels/lvl_054_level_10.json                  — standalone level JSON audited for format, validation flags, solvability metadata, and progression fit.
levels/lvl_055_level3_with_moves.json         — standalone level JSON audited for format, validation flags, solvability metadata, and progression fit.
levels/lvl_056_new_level1_a.json              — standalone level JSON audited for format, validation flags, solvability metadata, and progression fit.
levels/lvl_057_new_level3_a.json              — standalone level JSON audited for format, validation flags, solvability metadata, and progression fit.
levels/lvl_058_new_level6_a.json              — standalone level JSON audited for format, validation flags, solvability metadata, and progression fit.
levels/lvl_059_new_level8_a.json              — standalone level JSON audited for format, validation flags, solvability metadata, and progression fit.
levels/lvl_060_p_10_a.json                    — standalone level JSON audited for format, validation flags, solvability metadata, and progression fit.
levels/lvl_061_p_2_2.json                     — standalone level JSON audited for format, validation flags, solvability metadata, and progression fit.
levels/lvl_062_p_2_4.json                     — standalone level JSON audited for format, validation flags, solvability metadata, and progression fit.
levels/lvl_063_p_2_5.json                     — standalone level JSON audited for format, validation flags, solvability metadata, and progression fit.
levels/lvl_064_p_2_6.json                     — standalone level JSON audited for format, validation flags, solvability metadata, and progression fit.
levels/lvl_065_p_2_9.json                     — standalone level JSON audited for format, validation flags, solvability metadata, and progression fit.
levels/lvl_066_p_2_a.json                     — standalone level JSON audited for format, validation flags, solvability metadata, and progression fit.
levels/lvl_067_p_2_b.json                     — standalone level JSON audited for format, validation flags, solvability metadata, and progression fit.
levels/lvl_068_p_3_a.json                     — standalone level JSON audited for format, validation flags, solvability metadata, and progression fit.
levels/lvl_069_p_3_b.json                     — standalone level JSON audited for format, validation flags, solvability metadata, and progression fit.
levels/lvl_070_p_3_c.json                     — standalone level JSON audited for format, validation flags, solvability metadata, and progression fit.
levels/lvl_071_p_4_a.json                     — standalone level JSON audited for format, validation flags, solvability metadata, and progression fit.
levels/lvl_072_p_4_c.json                     — standalone level JSON audited for format, validation flags, solvability metadata, and progression fit.
levels/lvl_073_p_5_a.json                     — standalone level JSON audited for format, validation flags, solvability metadata, and progression fit.
levels/lvl_074_p_6_a.json                     — standalone level JSON audited for format, validation flags, solvability metadata, and progression fit.
levels/lvl_075_p_7_a.json                     — standalone level JSON audited for format, validation flags, solvability metadata, and progression fit.
levels/lvl_076_p_8_a.json                     — standalone level JSON audited for format, validation flags, solvability metadata, and progression fit.
levels/lvl_077_p_9_3.json                     — standalone level JSON audited for format, validation flags, solvability metadata, and progression fit.
levels/lvl_078_p_9_a.json                     — standalone level JSON audited for format, validation flags, solvability metadata, and progression fit.
levels/lvl_079_p_medium_2_a.json              — standalone level JSON audited for format, validation flags, solvability metadata, and progression fit.
levels/lvl_080_p_tutorial.json                — standalone level JSON audited for format, validation flags, solvability metadata, and progression fit.
levels/lvl_081_play_session_level_1_validate_10_level.json — standalone level JSON audited for format, validation flags, solvability metadata, and progression fit.
levels/lvl_082_play_session_level_1_validate_4_level.json — standalone level JSON audited for format, validation flags, solvability metadata, and progression fit.
levels/lvl_083_play_session_level_1_validate_5_level.json — standalone level JSON audited for format, validation flags, solvability metadata, and progression fit.
levels/lvl_084_play_session_level_1_validate_7_level.json — standalone level JSON audited for format, validation flags, solvability metadata, and progression fit.
levels/lvl_085_play_session_level_1_validate_8_level.json — standalone level JSON audited for format, validation flags, solvability metadata, and progression fit.
levels/lvl_086_play_session_level_2_validate_level.json — standalone level JSON audited for format, validation flags, solvability metadata, and progression fit.
levels/lvl_087_play_session_level_3_validate_level.json — standalone level JSON audited for format, validation flags, solvability metadata, and progression fit.
levels/lvl_088_play_session_level_4_validate_level.json — standalone level JSON audited for format, validation flags, solvability metadata, and progression fit.
levels/lvl_089_play_session_level_5_validate_2_level.json — standalone level JSON audited for format, validation flags, solvability metadata, and progression fit.
levels/lvl_090_play_session_level_5_validate_level.json — standalone level JSON audited for format, validation flags, solvability metadata, and progression fit.
levels/lvl_091_play_session_level_6_validate_1_level.json — standalone level JSON audited for format, validation flags, solvability metadata, and progression fit.
levels/lvl_092_play_session_level_6_validate_level.json — standalone level JSON audited for format, validation flags, solvability metadata, and progression fit.
levels/lvl_093_play_session_level_7_validate_level.json — standalone level JSON audited for format, validation flags, solvability metadata, and progression fit.
levels/lvl_094_play_session_level_8_validate_level.json — standalone level JSON audited for format, validation flags, solvability metadata, and progression fit.
levels/lvl_095_play_session_level_9_manual_level.json — standalone level JSON audited for format, validation flags, solvability metadata, and progression fit.
levels/lvl_096_progression_levels_slot_1.json — standalone level JSON audited for format, validation flags, solvability metadata, and progression fit.
levels/lvl_097_progression_levels_slot_10.json — standalone level JSON audited for format, validation flags, solvability metadata, and progression fit.
levels/lvl_098_progression_levels_slot_2.json — standalone level JSON audited for format, validation flags, solvability metadata, and progression fit.
levels/lvl_099_progression_levels_slot_3.json — standalone level JSON audited for format, validation flags, solvability metadata, and progression fit.
levels/lvl_100_progression_levels_slot_4.json — standalone level JSON audited for format, validation flags, solvability metadata, and progression fit.
levels/lvl_101_progression_levels_slot_5.json — standalone level JSON audited for format, validation flags, solvability metadata, and progression fit.
levels/lvl_102_progression_levels_slot_6.json — standalone level JSON audited for format, validation flags, solvability metadata, and progression fit.
levels/lvl_103_progression_levels_slot_7.json — standalone level JSON audited for format, validation flags, solvability metadata, and progression fit.
levels/lvl_104_progression_levels_slot_8.json — standalone level JSON audited for format, validation flags, solvability metadata, and progression fit.
levels/lvl_105_progression_levels_slot_9.json — standalone level JSON audited for format, validation flags, solvability metadata, and progression fit.
levels/lvl_106_rect_test_7x8.json             — standalone level JSON audited for format, validation flags, solvability metadata, and progression fit.
levels/lvl_107_susanne_level_4_manager_ok.json — standalone level JSON audited for format, validation flags, solvability metadata, and progression fit.
levels/lvl_108_tune_large_01_7x7.json         — standalone level JSON audited for format, validation flags, solvability metadata, and progression fit.
levels/lvl_109_tutorial_level.json            — standalone level JSON audited for format, validation flags, solvability metadata, and progression fit.
levels/lvl_110_progression_b_slot_7.json      — standalone level JSON audited for format, validation flags, solvability metadata, and progression fit.
levels/lvl_111_progression_b_slot_8.json      — standalone level JSON audited for format, validation flags, solvability metadata, and progression fit.
levels/lvl_112_progression_b_slot_10.json     — standalone level JSON audited for format, validation flags, solvability metadata, and progression fit.
levels/lvl_113_progression_c_slot_5.json      — standalone level JSON audited for format, validation flags, solvability metadata, and progression fit.
levels/lvl_114_progression_c_slot_6.json      — standalone level JSON audited for format, validation flags, solvability metadata, and progression fit.
levels/lvl_115_progression_c_slot_7.json      — standalone level JSON audited for format, validation flags, solvability metadata, and progression fit.
levels/lvl_116_progression_c_slot_8.json      — standalone level JSON audited for format, validation flags, solvability metadata, and progression fit.
levels/lvl_117_progression_c_slot_9.json      — standalone level JSON audited for format, validation flags, solvability metadata, and progression fit.
levels/lvl_118_progression_c_slot_10.json     — standalone level JSON audited for format, validation flags, solvability metadata, and progression fit.
levels/tutorial_level.json                    — standalone level JSON audited for format, validation flags, solvability metadata, and progression fit.
```
- Bulk-audited progression files read:
```text
progressions/alluniquelevels_workspace.json   — progression/workspace/bundle JSON audited for slot ordering, embedded levels, and reference structure.
progressions/gameuniquelevels_workspace.json  — progression/workspace/bundle JSON audited for slot ordering, embedded levels, and reference structure.
progressions/imported_progression_levels_clean_1.json — progression/workspace/bundle JSON audited for slot ordering, embedded levels, and reference structure.
progressions/imported_progression_levels_clean_2.json — progression/workspace/bundle JSON audited for slot ordering, embedded levels, and reference structure.
progressions/imported_progression_levels_clean_bundle.json — progression/workspace/bundle JSON audited for slot ordering, embedded levels, and reference structure.
progressions/imported_progression_levels_clean.json — progression/workspace/bundle JSON audited for slot ordering, embedded levels, and reference structure.
progressions/progressiona_aftertewak_1.json   — progression/workspace/bundle JSON audited for slot ordering, embedded levels, and reference structure.
progressions/progressiona_aftertewak_2.json   — progression/workspace/bundle JSON audited for slot ordering, embedded levels, and reference structure.
progressions/progressiona_aftertewak_3.json   — progression/workspace/bundle JSON audited for slot ordering, embedded levels, and reference structure.
progressions/progressionA_afterTewak_bundle.json — progression/workspace/bundle JSON audited for slot ordering, embedded levels, and reference structure.
progressions/progressiona_aftertewak_minimal_workspace_1.json — progression/workspace/bundle JSON audited for slot ordering, embedded levels, and reference structure.
progressions/progressiona_aftertewak_minimal_workspace.json — progression/workspace/bundle JSON audited for slot ordering, embedded levels, and reference structure.
progressions/progressionA_afterTewak_workspace.json — progression/workspace/bundle JSON audited for slot ordering, embedded levels, and reference structure.
progressions/progressiona_aftertewak.json     — progression/workspace/bundle JSON audited for slot ordering, embedded levels, and reference structure.
progressions/progressionA_bundle.json         — progression/workspace/bundle JSON audited for slot ordering, embedded levels, and reference structure.
progressions/progressiona_new_levels_a_1.json — progression/workspace/bundle JSON audited for slot ordering, embedded levels, and reference structure.
progressions/progressiona_new_levels_a_2.json — progression/workspace/bundle JSON audited for slot ordering, embedded levels, and reference structure.
progressions/progressiona_new_levels_a_3.json — progression/workspace/bundle JSON audited for slot ordering, embedded levels, and reference structure.
progressions/progressionA_new_levels_a_bundle.json — progression/workspace/bundle JSON audited for slot ordering, embedded levels, and reference structure.
progressions/progressiona_new_levels_a.json   — progression/workspace/bundle JSON audited for slot ordering, embedded levels, and reference structure.
progressions/progressionA_recovered_from_screenshots_bundle.json — progression/workspace/bundle JSON audited for slot ordering, embedded levels, and reference structure.
progressions/progressiona_recovered_from_screenshots.json — progression/workspace/bundle JSON audited for slot ordering, embedded levels, and reference structure.
progressions/progressiona_workshop_1.json     — progression/workspace/bundle JSON audited for slot ordering, embedded levels, and reference structure.
progressions/progressiona_workshop_2.json     — progression/workspace/bundle JSON audited for slot ordering, embedded levels, and reference structure.
progressions/progressiona_workshop_3.json     — progression/workspace/bundle JSON audited for slot ordering, embedded levels, and reference structure.
progressions/progressiona_workshop.json       — progression/workspace/bundle JSON audited for slot ordering, embedded levels, and reference structure.
progressions/progressionB_bundle.json         — progression/workspace/bundle JSON audited for slot ordering, embedded levels, and reference structure.
progressions/progressionB_recovered_from_screenshots_bundle.json — progression/workspace/bundle JSON audited for slot ordering, embedded levels, and reference structure.
progressions/progressionb_recovered_from_screenshots.json — progression/workspace/bundle JSON audited for slot ordering, embedded levels, and reference structure.
progressions/progressionb_workshop_1.json     — progression/workspace/bundle JSON audited for slot ordering, embedded levels, and reference structure.
progressions/progressionb_workshop_2.json     — progression/workspace/bundle JSON audited for slot ordering, embedded levels, and reference structure.
progressions/progressionb_workshop_3.json     — progression/workspace/bundle JSON audited for slot ordering, embedded levels, and reference structure.
progressions/progressionb_workshop.json       — progression/workspace/bundle JSON audited for slot ordering, embedded levels, and reference structure.
progressions/progressionC_bundle.json         — progression/workspace/bundle JSON audited for slot ordering, embedded levels, and reference structure.
progressions/progressionC_recovered_from_screenshots_bundle.json — progression/workspace/bundle JSON audited for slot ordering, embedded levels, and reference structure.
progressions/progressionc_recovered_from_screenshots.json — progression/workspace/bundle JSON audited for slot ordering, embedded levels, and reference structure.
progressions/progressionc_workshop_1.json     — progression/workspace/bundle JSON audited for slot ordering, embedded levels, and reference structure.
progressions/progressionc_workshop_2.json     — progression/workspace/bundle JSON audited for slot ordering, embedded levels, and reference structure.
progressions/progressionc_workshop_3.json     — progression/workspace/bundle JSON audited for slot ordering, embedded levels, and reference structure.
progressions/progressionc_workshop.json       — progression/workspace/bundle JSON audited for slot ordering, embedded levels, and reference structure.
progressions/progressionExtra_bundle.json     — progression/workspace/bundle JSON audited for slot ordering, embedded levels, and reference structure.
progressions/progressionextra_workshop_1.json — progression/workspace/bundle JSON audited for slot ordering, embedded levels, and reference structure.
progressions/progressionextra_workshop_2.json — progression/workspace/bundle JSON audited for slot ordering, embedded levels, and reference structure.
progressions/progressionextra_workshop_3.json — progression/workspace/bundle JSON audited for slot ordering, embedded levels, and reference structure.
progressions/progressionextra_workshop.json   — progression/workspace/bundle JSON audited for slot ordering, embedded levels, and reference structure.
progressions/progressionImportedClean_bundle.json — progression/workspace/bundle JSON audited for slot ordering, embedded levels, and reference structure.
progressions/progressionimportedclean_workspace_1.json — progression/workspace/bundle JSON audited for slot ordering, embedded levels, and reference structure.
progressions/progressionimportedclean_workspace.json — progression/workspace/bundle JSON audited for slot ordering, embedded levels, and reference structure.
progressions/workshop_workspace_1.json        — progression/workspace/bundle JSON audited for slot ordering, embedded levels, and reference structure.
progressions/workshop_workspace.json          — progression/workspace/bundle JSON audited for slot ordering, embedded levels, and reference structure.
```
- Bulk-audited playtest files read:
```text
playtest/play_001_play_session_level_1_manual_1.json — saved play-session JSON audited for wrapper shape, embedded level payloads, and review/session history.
playtest/play_002_play_session_level_1_manual.json — saved play-session JSON audited for wrapper shape, embedded level payloads, and review/session history.
playtest/play_003_play_session_level_1_validate_10.json — saved play-session JSON audited for wrapper shape, embedded level payloads, and review/session history.
playtest/play_004_play_session_level_1_validate_3.json — saved play-session JSON audited for wrapper shape, embedded level payloads, and review/session history.
playtest/play_005_play_session_level_1_validate_4.json — saved play-session JSON audited for wrapper shape, embedded level payloads, and review/session history.
playtest/play_006_play_session_level_1_validate_5.json — saved play-session JSON audited for wrapper shape, embedded level payloads, and review/session history.
playtest/play_007_play_session_level_1_validate_6.json — saved play-session JSON audited for wrapper shape, embedded level payloads, and review/session history.
playtest/play_008_play_session_level_1_validate_7.json — saved play-session JSON audited for wrapper shape, embedded level payloads, and review/session history.
playtest/play_009_play_session_level_1_validate_8.json — saved play-session JSON audited for wrapper shape, embedded level payloads, and review/session history.
playtest/play_010_play_session_level_1_validate_9.json — saved play-session JSON audited for wrapper shape, embedded level payloads, and review/session history.
playtest/play_011_play_session_level_1_validate.json — saved play-session JSON audited for wrapper shape, embedded level payloads, and review/session history.
playtest/play_012_play_session_level_2_validate.json — saved play-session JSON audited for wrapper shape, embedded level payloads, and review/session history.
playtest/play_013_play_session_level_3_validate.json — saved play-session JSON audited for wrapper shape, embedded level payloads, and review/session history.
playtest/play_014_play_session_level_4_validate.json — saved play-session JSON audited for wrapper shape, embedded level payloads, and review/session history.
playtest/play_015_play_session_level_5_manual.json — saved play-session JSON audited for wrapper shape, embedded level payloads, and review/session history.
playtest/play_016_play_session_level_5_validate_2.json — saved play-session JSON audited for wrapper shape, embedded level payloads, and review/session history.
playtest/play_017_play_session_level_5_validate.json — saved play-session JSON audited for wrapper shape, embedded level payloads, and review/session history.
playtest/play_018_play_session_level_5.json   — saved play-session JSON audited for wrapper shape, embedded level payloads, and review/session history.
playtest/play_019_play_session_level_6_validate_1.json — saved play-session JSON audited for wrapper shape, embedded level payloads, and review/session history.
playtest/play_020_play_session_level_6_validate.json — saved play-session JSON audited for wrapper shape, embedded level payloads, and review/session history.
playtest/play_021_play_session_level_7_validate.json — saved play-session JSON audited for wrapper shape, embedded level payloads, and review/session history.
playtest/play_022_play_session_level_8_validate.json — saved play-session JSON audited for wrapper shape, embedded level payloads, and review/session history.
playtest/play_023_play_session_level_9_manual.json — saved play-session JSON audited for wrapper shape, embedded level payloads, and review/session history.
```
