# Feed the Bear — Documentation Completion Copilot

> Prompt de coordinación para Codex con subagentes.
> Última auditoría: 2026-03-24 (Cowork session).

---

## Contexto del proyecto

Feed the Bear / Soda es un puzzle game mobile de routing en grid. El proyecto se desarrolla con vibe coding y generación procedural de niveles. La autora (Vito) es game designer, no programadora — el código se ha construido mediante Claude y Codex.

La documentación de diseño está madura (GDD, procedural, colores, APIs). **Los gaps están en la documentación operativa y técnica**: el toolkit web, el servidor, los flujos end-to-end, el sistema de playtest, y el schema de niveles.

### Reglas heredadas del proyecto

1. **Un solo GDD canónico**: `FEED_THE_BEAR_GDD.md`. No crear nuevos overview docs — extender en su lugar.
2. **Docs especialistas**: permanecen como archivos separados en sus dominios.
3. **Después de cada cambio sustantivo**: actualizar `memoria.md` + el archivo relevante en `changes/`.
4. **Outputs en inglés.**
5. **Flag uncertainty, don't fill gaps**: si no tienes certeza de algo, márcalo como `[VERIFY]` en vez de inventar.

### Archivos canónicos existentes

| Archivo | Rol |
|---|---|
| `FEED_THE_BEAR_GDD.md` | Diseño de juego canónico (high-level) |
| `PROCEDURAL_ML_DESIGN.md` | Generación procedural y ML |
| `FISH_COLORS_SYSTEM.md` | Sistema de 14 colores de peces |
| `PARALLEL_APIS_README.md` | Pipeline Google Sheets/Drive |
| `NPM_SCRIPTS_REFERENCE.md` | Comandos npm |
| `LEVEL_FORMAT_CONVERSION.md` | Conversión old→new format |
| `LEVEL_RECOVERY_GUIDE.md` | Recovery de niveles corruptos |
| `memoria.md` | Log operativo (~145 entradas) |
| `paraclau_1.md` | Coordinación Claude/Codex |
| `AGENT_CHEATSHEET.md` | Routing rápido de agentes |
| `PROJECT_AGENT_API_GUARDIAN.md` | Prompt agente API/sync |
| `PROJECT_AGENT_CONTENT_RECOVERY.md` | Prompt agente recovery |
| `PROJECT_AGENT_PROCEDURAL_DESIGN_CRITIC.md` | Prompt agente procedural |
| `changes/*.md` | Logs temáticos (5 archivos) |

### Fuente canónica externa: Notion — Level Design

URL: https://www.notion.so/Level-Design-3195f99a540280d8a972d22c54e12728

Esta página de Notion es la **referencia interna de diseño de niveles** y contiene la voz de diseño del proyecto. Los subagentes DEBEN alinear su lenguaje y criterios con este documento. Contenido clave:

- **North star**: "Lo logré yo." — Un nivel bien diseñado hace que el jugador sienta que la solución fue suya.
- **What makes a good level**: Readability first, meaningful tension, authored feel. Si un bloqueador se puede quitar sin cambiar la sensación del nivel, no debería estar ahí.
- **What makes a good progression**: Teach before escalating, alternate tension and relief, keep editorial intent visible. "It's fine" is not a reason.
- **Difficulty model**: Readability, blocker pressure, path interference, route ambiguity, board size (secondary). Labels help communicate but the final judgment comes from readability and route feel — not from a formula.
- **Progression history**: V1 (too short/arbitrary) → V2 (players lacked mental model) → V3 (current: clearer structure, longer levels, workshop content integrated). Firm decisions: Slot 0 = tutorial always, Slot 1 = low-friction, workshop levels enter main progressions.
- **Three quality layers**: Validation (solvable — the floor), Playtest (route feels intentional), Design quality (makes a player feel they earned it — the bar).
- **Discard reason capture**: "Discarding without capturing why creates a loop where the same problems return."
- **Procedural generation philosophy**: The generator is a candidate shaper, not a level author. Final quality is always a design decision — "the generator doesn't know what 'I did it' feels like."

**Regla para subagentes**: cuando un gap toque niveles, dificultad, progresiones, o generación procedural, el subagente debe usar esta página como criterio de calidad, no inventar sus propios criterios.

---

## Misión global

Completar la documentación del proyecto cerrando los 8 gaps identificados en la auditoría. Cada gap tiene un subagente asignado, instrucciones claras, y un checklist de entrega.

**Principio operativo**: cada subagente debe leer los archivos fuente que se le indican ANTES de escribir. No inventar información — si algo no está claro en el código, marcar `[VERIFY: descripción de la duda]`.

---

## Gap 1 — Toolkit Web Architecture Map

**Prioridad**: ALTA
**Archivo a crear**: `docs/TOOLKIT_ARCHITECTURE.md`

### Qué falta

`level_toolkit_web/app.js` es un archivo de ~400KB que contiene toda la lógica del toolkit web (editor de niveles, manager, sesiones, procedural, playtest). No existe ningún documento que explique su organización interna.

### Instrucciones para el subagente

```
TASK: Generate an architecture map of level_toolkit_web/app.js

READ FIRST:
- level_toolkit_web/app.js (full file — scan for module boundaries, section comments, major functions)
- level_toolkit_web/index.html (to understand the UI surface)
- level_toolkit_web/styles.css (to understand UI organization)
- FEED_THE_BEAR_GDD.md (for terminology alignment)
- changes/toolkit.md (for recent changes)

PRODUCE: docs/TOOLKIT_ARCHITECTURE.md with:
1. Module map — identify logical sections/modules within the monolithic file. For each:
   - Name and line range (approximate)
   - Responsibility in 1-2 sentences
   - Key functions/classes it exports or defines
2. Data flow diagram (as ASCII or mermaid) — how level data moves through the toolkit
3. Key state objects — what global state exists and what manages it
4. Entry points — what initializes on load, what responds to user actions
5. Integration points — how app.js talks to server.mjs (API calls, fetch patterns)
6. Navigation model — how the user moves between tabs/views in the toolkit

RULES:
- If a section boundary is ambiguous, mark with [VERIFY: boundary unclear around line X]
- Use the same terminology as FEED_THE_BEAR_GDD.md (Original Progressions, Live Ops Mixes, etc.)
- Do NOT refactor or modify app.js — this is documentation only
- Target audience: a designer or new developer joining the project

UPDATE: memoria.md + changes/documentation.md after completion
```

### Checklist de entrega

- [ ] Module map with line ranges
- [ ] Data flow diagram
- [ ] State objects documented
- [ ] Entry points listed
- [ ] Integration points with server.mjs mapped
- [ ] All `[VERIFY]` flags are genuine uncertainties, not invented fills

---

## Gap 2 — Server API Reference

**Prioridad**: ALTA
**Archivo a crear**: `docs/SERVER_API_REFERENCE.md`

### Qué falta

`server.mjs` es el puente entre el toolkit web y el sistema de archivos local + Google Sheets. No hay documentación de sus endpoints HTTP.

### Instrucciones para el subagente

```
TASK: Document all HTTP endpoints in server.mjs

READ FIRST:
- server.mjs (full file)
- google_sheets_api.mjs (first 200 lines for public API surface)
- NPM_SCRIPTS_REFERENCE.md (for context on what scripts trigger the server)
- PARALLEL_APIS_README.md (for Google API context)

PRODUCE: docs/SERVER_API_REFERENCE.md with:
1. Server overview — port, startup, static file serving
2. Endpoint table — for each endpoint:
   - Method + path
   - Purpose (1 sentence)
   - Request body / query params (if any)
   - Response format
   - Side effects (file writes, API calls)
3. Authentication — how Google OAuth is handled
4. Error handling patterns
5. File system paths — which directories the server reads from / writes to

RULES:
- Extract endpoints from the actual code, not from assumptions
- If an endpoint's behavior is unclear, mark [VERIFY]
- Do NOT modify server.mjs
- Include the static file serving rules (MIME types, directory resolution)

UPDATE: memoria.md + changes/documentation.md after completion
```

### Checklist de entrega

- [ ] Every endpoint documented with method, path, purpose
- [ ] Request/response formats for non-trivial endpoints
- [ ] Auth flow explained
- [ ] File system paths mapped

---

## Gap 3 — Level JSON Schema

**Prioridad**: ALTA
**Archivo a crear**: `docs/LEVEL_JSON_SCHEMA.md`

### Qué falta

No existe un schema formal del formato JSON de nivel. LEVEL_FORMAT_CONVERSION.md muestra ejemplos before/after pero no es una spec completa.

### Instrucciones para el subagente

```
TASK: Produce a canonical JSON schema for Feed the Bear levels

READ FIRST:
- Notion "Level Design" page: https://www.notion.so/Level-Design-3195f99a540280d8a972d22c54e12728 (for design intent behind fields — what makes a good level, difficulty model, quality layers)
- LEVEL_FORMAT_CONVERSION.md (for known fields and conversion history)
- FISH_COLORS_SYSTEM.md (for color/fish field contracts)
- PROCEDURAL_ML_DESIGN.md (for procedural-specific fields like difficulty features)
- 5 sample level files from levels/progression_a/ (for real-world field inventory)
- 5 sample level files from levels/8x8-9x9-procedular/ (for procedural variant fields)
- 3 sample files from levels/fromimage/ (for image-sourced level fields)
- level_toolkit_web/app.js — search for JSON.parse, JSON.stringify, and field access patterns on level objects

PRODUCE: docs/LEVEL_JSON_SCHEMA.md with:
1. Human-readable field reference table:
   - Field name, type, required/optional, description, example value
   - Group by: grid structure, fish/pairs, blockers, metadata, difficulty, procedural-only
2. JSON Schema (draft-07) as a code block — machine-validatable
3. Field provenance — which fields come from manual authoring vs procedural generation vs toolkit enrichment
4. Validation rules beyond types (e.g., grid dimensions must match cell array length)
5. Example: one complete minimal level + one complete procedural level with annotations

RULES:
- Cross-reference ALL three sources (authored, procedural, image-sourced) for field completeness
- If a field appears only in some levels, mark as optional and note which source
- Mark any ambiguous fields with [VERIFY]

UPDATE: memoria.md + changes/documentation.md after completion
```

### Checklist de entrega

- [ ] All fields from all level types covered
- [ ] JSON Schema block is valid draft-07
- [ ] Field provenance clear (authored vs procedural vs toolkit)
- [ ] Two annotated examples included

---

## Gap 4 — Playtest System Documentation

**Prioridad**: MEDIA
**Archivo a crear**: `docs/PLAYTEST_SYSTEM.md`

### Qué falta

Hay datos de playtest (JSONL events, sesiones JSON, cola procedural) pero ninguna documentación de qué se captura, cómo se analiza, y qué métricas importan.

### Instrucciones para el subagente

```
TASK: Document the playtest data capture and analysis system

READ FIRST:
- Notion "Level Design" page: https://www.notion.so/Level-Design-3195f99a540280d8a972d22c54e12728 (for the three quality layers: Validation → Playtest → Design quality, and why discard reasons matter)
- playtest/latest_play_session.json (structure of a session)
- playtest/playtest_events.jsonl (first 200 lines — event types and fields)
- playtest/procedural_100_queue.json (first 50 lines — queue structure)
- level_toolkit_web/app.js — search for "playtest", "play_session", "event", "record" to find capture logic
- server.mjs — search for "playtest" to find persistence endpoints
- PROCEDURAL_ML_DESIGN.md — section on learning signals

PRODUCE: docs/PLAYTEST_SYSTEM.md with:
1. System overview — what the playtest system does and how it fits in the toolkit
2. Event catalog — every event type captured, with fields and meaning
3. Session structure — what constitutes a session, what metadata is stored
4. Procedural queue — how levels are queued, played, evaluated
5. Data flow — from user interaction → event capture → storage → analysis
6. Metrics that matter — what the designer (Vito) looks at to decide if a level is good
7. How playtest feeds learning — connection to PROCEDURAL_ML_DESIGN's learning loop

RULES:
- Extract event types from the actual JSONL data, not assumptions
- Mark [VERIFY] for any metrics whose interpretation is unclear

UPDATE: memoria.md + changes/documentation.md after completion
```

### Checklist de entrega

- [ ] Event catalog is complete (extracted from real data)
- [ ] Session structure documented
- [ ] Connection to procedural learning explained
- [ ] Data flow diagram included

---

## Gap 5 — End-to-End Workflow Guides

**Prioridad**: MEDIA
**Archivo a crear**: `docs/WORKFLOWS.md`

### Qué falta

Los workflows operativos están fragmentados entre NPM_SCRIPTS_REFERENCE, changes/, y conocimiento implícito. No hay una guía paso-a-paso para las tareas más comunes.

### Instrucciones para el subagente

```
TASK: Create an operational workflow guide for the most common project tasks

READ FIRST:
- Notion "Level Design" page: https://www.notion.so/Level-Design-3195f99a540280d8a972d22c54e12728 (for progression decisions, quality bar, and review layers that inform Workflows A and C)
- NPM_SCRIPTS_REFERENCE.md (all commands)
- FEED_THE_BEAR_GDD.md (source-of-truth model, rename workflow)
- PARALLEL_APIS_README.md (sync flows)
- changes/spreadsheet.md (spreadsheet workflow evolution)
- changes/toolkit.md (toolkit workflow)
- changes/procedural.md (procedural workflow)
- server.mjs — search for endpoint handlers to understand the full request chain

PRODUCE: docs/WORKFLOWS.md with these step-by-step guides:

### Workflow A: "I designed a new level in the editor — now what?"
From saving in the toolkit → level JSON storage → screenshot → spreadsheet sync → bundle inclusion

### Workflow B: "I want to sync my local levels to Google Sheets"
Pre-requisites → npm command → what happens → how to verify → troubleshooting

### Workflow C: "I want to generate a procedural pack"
Parameters → npm command → what gets generated → where it lands → how to review quality → how to approve/reject

### Workflow D: "I want to publish an updated Confluence page"
Pre-requisites → regenerate HTML → verify → push to Kingfluence

### Workflow E: "I want to stage and apply level renames"
Spreadsheet setup → staging renames → preview → apply → verify canonical files updated

### Workflow F: "I want to materialize a Live Ops Mix from the Mix Planner"
Spreadsheet rows → approval → npm command → bundle creation → verification

RULES:
- Each workflow must be a numbered step-by-step sequence a non-developer can follow
- Include exact commands, expected outputs, and what to check after each step
- Mark [VERIFY] for any step you can't fully confirm from the code
- Cross-reference the relevant npm script for each workflow

UPDATE: memoria.md + changes/documentation.md after completion
```

### Checklist de entrega

- [ ] All 6 workflows documented with exact steps
- [ ] Each workflow includes verification steps
- [ ] Commands are exact (copy-pasteable)
- [ ] Non-developer friendly language

---

## Gap 6 — Screenshot Pipeline Documentation

**Prioridad**: MEDIA
**Archivo a crear**: `docs/SCREENSHOT_PIPELINE.md`

### Instrucciones para el subagente

```
TASK: Document the screenshot generation and management pipeline

READ FIRST:
- python_preview_project/README.md
- python_preview_project/*.py (main scripts)
- scripts/ — search for files mentioning "screenshot", "preview", "render", "png"
- level_toolkit_web/app.js — search for "screenshot", "canvas", "toDataURL", "png"
- levels/screenshots/ (listing — understand naming conventions)
- artifacts/level_screenshots/ (listing)
- bundles/original_progression_a/screenshots/ (listing)

PRODUCE: docs/SCREENSHOT_PIPELINE.md with:
1. Overview — what screenshots are for (spreadsheet, Confluence, bundles, review)
2. Generation methods:
   - Browser-based (toolkit canvas export)
   - Python-based (batch preview rendering)
3. Storage locations — where screenshots live and naming conventions
4. Integration with spreadsheet sync (how screenshots get into Google Sheets)
5. Integration with Confluence publishing
6. Naming convention reference

UPDATE: memoria.md + changes/documentation.md after completion
```

---

## Gap 7 — Bundle & Mix Operations Guide

**Prioridad**: MEDIA
**Archivo a crear**: `docs/BUNDLES_AND_MIXES.md`

### Instrucciones para el subagente

```
TASK: Document the bundle structure and mix materialization system

READ FIRST:
- Notion "Level Design" page: https://www.notion.so/Level-Design-3195f99a540280d8a972d22c54e12728 (for progression philosophy — why 3 curves, slot decisions, what "extras" and "discarded" mean)
- FEED_THE_BEAR_GDD.md (sections on Original Progressions, Live Ops Mixes, bundles)
- bundles/ directory structure (ls -laR, excluding screenshots content)
- bundles/manager/ contents
- progressions/ directory (all JSON files)
- progressions/manager_state/ contents
- scripts/ — search for "bundle", "mix", "materialize", "progression"
- NPM_SCRIPTS_REFERENCE.md (materialize:mixes command)
- server.mjs — search for "bundle", "mix", "progression"

PRODUCE: docs/BUNDLES_AND_MIXES.md with:
1. Concepts — Original Progressions vs Live Ops Mixes vs Bundles (aligned with GDD terms)
2. Directory structure — what lives where and why
3. Bundle format — what a complete bundle contains (JSONs, screenshots, metadata)
4. Mix Planner flow — from spreadsheet planning to materialization
5. Progression state — what manager_state tracks and how
6. Bundle lifecycle — creation, update, export

UPDATE: memoria.md + changes/documentation.md after completion
```

---

## Gap 8 — Project Housekeeping

**Prioridad**: BAJA
**No crea archivo nuevo — modifica existentes**

### Instrucciones para el subagente

```
TASK: Clean up structural inconsistencies without breaking anything

READ FIRST:
- Root directory listing (ls -la of project root)
- .gitignore
- FEED_THE_BEAR_GDD.md
- paraclau_1.md
- AGENT_CHEATSHEET.md

DO:
1. Create a docs/ directory if it doesn't exist (for the new docs from Gaps 1-7)
2. Propose (do NOT execute) moving agent prompts to docs/agents/:
   - PROJECT_AGENT_API_GUARDIAN.md → docs/agents/API_GUARDIAN.md
   - PROJECT_AGENT_CONTENT_RECOVERY.md → docs/agents/CONTENT_RECOVERY.md
   - PROJECT_AGENT_PROCEDURAL_DESIGN_CRITIC.md → docs/agents/PROCEDURAL_DESIGN_CRITIC.md
3. Propose (do NOT execute) moving progress.md to archive/
4. Review .gitignore and propose additions:
   - .env, credentials.json (secrets)
   - *.old-format (274 legacy files)
   - .DS_Store
   - node_modules/
   - __pycache__/
   - .local/ (browser state exports)
   - tmp/
5. Create docs/README.md — an index of ALL documentation files with one-line descriptions

RULES:
- Do NOT move or delete anything automatically
- Present proposals as a checklist for Vito to approve
- Any move that affects paths in paraclau_1.md or AGENT_CHEATSHEET.md must include the updated paths

UPDATE: memoria.md + changes/documentation.md after completion
```

---

## Orden de ejecución recomendado

```
PHASE 1 — CRITICAL (en paralelo)
├── Gap 1: Toolkit Architecture Map
├── Gap 2: Server API Reference
└── Gap 3: Level JSON Schema

PHASE 2 — WORKFLOWS (en paralelo, después de Phase 1)
├── Gap 4: Playtest System
├── Gap 5: End-to-End Workflows (depende de Gaps 1-3 para referencias)
└── Gap 6: Screenshot Pipeline

PHASE 3 — ORGANIZATION (secuencial, al final)
├── Gap 7: Bundles & Mixes
└── Gap 8: Project Housekeeping (last — updates index with all new docs)
```

---

## Protocolo de cierre de cada gap

Cuando un subagente termine un gap:

1. El doc nuevo debe estar en `docs/` (excepto Gap 8 que modifica existentes)
2. Actualizar `memoria.md` con una entrada fechada:
   ```
   - 2026-XX-XX — [Gap N]: Created docs/FILENAME.md — [1-line summary of what was documented]
   ```
3. Actualizar `changes/documentation.md` con el detalle
4. Si el doc nuevo afecta al GDD, proponer (no ejecutar) la sección del GDD que debería referenciar el nuevo doc
5. Listar todos los `[VERIFY]` flags pendientes como un bloque al final del doc

---

## Nota para el coordinador (Vito)

Este prompt está diseñado para que lo pegues como instrucción principal en Codex y lances cada Gap como una tarea para un subagente. Puedes:

- Lanzar Phase 1 completa en paralelo (3 subagentes)
- Revisar los `[VERIFY]` flags antes de pasar a Phase 2
- Usar Phase 2 outputs para validar que Phase 1 tiene sentido
- Gap 8 (housekeeping) se hace al final porque necesita el inventario completo de docs nuevos
