# Template Generator — Ejemplo Práctico

Este documento muestra un flujo completo de cómo usar el template generator para crear un documento Kingfluence.

---

## Escenario: Crear una Release Note de Python Toolkit v2.1

### Paso 1: Configurar Google Sheets Credentials

```bash
# 1. Descargar credentials desde Google Cloud Console
#    → Go to: https://console.cloud.google.com
#    → Service Accounts → Create service account JSON

# 2. Guardar en ubicación estándar
mkdir -p ~/.config/gspread
cp ~/Downloads/credentials.json ~/.config/gspread/credentials.json

# 3. Verificar
ls -la ~/.config/gspread/credentials.json
```

### Paso 2: Crear Google Sheet con estructura canónica

**URL del Sheet:** `https://docs.google.com/spreadsheets/d/1A2B3C4D5E6F7G8H9I0J/edit`

**Sheet ID:** `1A2B3C4D5E6F7G8H9I0J`

---

### Paso 3: Llenar las 4 tabs

#### Tab: "Metadata"

| Document Title | Document Type | Owner | Target Audience | Kingfluence Space | Parent Page | Tags | Publishing Gate |
|---|---|---|---|---|---|---|---|
| Feed the Bear Python Toolkit v2.1 Release | Release Notes | Victoria | Internal Team, Stakeholders | Game Design | Releases | release, python-toolkit, cutover | Draft |

---

#### Tab: "Design"

| H1 Size | H1 Color | H1 Weight | H2 Size | H2 Color | Body Size | Body Color | Accent Color |
|---|---|---|---|---|---|---|---|
| 24px | Primary | Bold | 18px | Primary | 14px | Text-Default | Accent |

---

#### Tab: "Components"

| Component Type | Include? | Variant | Custom Notes |
|---|---|---|---|
| header | TRUE | - | - |
| status | TRUE | Green | In Progress |
| executive_summary | TRUE | 2-paragraph | Auto-generated |
| expandable_section | TRUE | 3 sections | See Content tab |
| related_links | TRUE | - | From References |
| changelog | FALSE | - | - |

---

#### Tab: "Content"

| Section Title | Content | Type | Link/Reference |
|---|---|---|---|
| Executive Summary | This release marks the completion of the Python toolkit migration. Core parity with web toolkit is achieved across all critical workflows: editor, procedural system, progression planner, session review, and spreadsheet integration. Performance baselines are maintained; all validation tests pass at 95%+ (60/62). The cutover enables Python-primary development for future features while the web toolkit serves as a FALLBACK-ONLY surface for compatibility. | text | - |
| Key Features | - Schema normalization: All 9 progressions (A-I) migrated to canonical JSON with strict pair color validation (7 canonical colors max)<br>- Parity verification: 102 test suite covering all workflows<br>- Hardening: Defensive validation, edge case handling<br>- Performance: Baseline maintained; no regression detected<br>- Spreadsheet parity: Full sync with local-first source of truth | expandable | docs/PARITY_VERIFICATION.md |
| Breaking Changes | - Web toolkit is now FALLBACK-ONLY; Python is PRIMARY for all new feature work<br>- Pair type constraints: striped variants removed; 7 canonical colors enforced (red, blue, green, yellow, orange, purple, cyan)<br>- Progression naming: A-F/G-H-I (was arbitrary); canonical structure: `levels/progression_X/jsons/progression_X_levelN.json`<br>- Config updates: fish_colors.json reduced to 7 color definitions | expandable | CUTOVER_PLAN.md |
| Migration Rollback | If critical issues arise post-cutover: Tag `rollback/pre-cutover-main` exists on origin. Contact @Victoria for rollback procedure. Expected RTO: <30min. | expandable | CUTOVER_PLAN.md#rollback |
| Related Links | [Parity Verification Report](https://confluence.internal/spaces/game-design/parity-verification) | - | - |

---

### Paso 4: Ejecutar el generador

```bash
python3 scripts/generate_template_from_spreadsheet.py \
  --sheet-id 1A2B3C4D5E6F7G8H9I0J \
  --output-file docs/release_v2_1.md \
  --output-json docs/release_v2_1.json \
  --validate
```

**Output esperado:**

```
📋 Loading spreadsheet data...

✓ Connected to sheet: Release Notes Control Panel
✓ Loaded metadata: Feed the Bear Python Toolkit v2.1 Release
✓ Loaded design system
✓ Loaded 6 components
✓ Loaded 5 content items

✓ Validating...

✓ All validation checks passed

✓ Exported markdown to docs/release_v2_1.md
✓ Exported JSON to docs/release_v2_1.json

✓ Template generation complete!
  Markdown: docs/release_v2_1.md
  JSON: docs/release_v2_1.json
```

---

### Paso 5: Revisar markdown generado

```bash
cat docs/release_v2_1.md
```

**Output (excerpt):**

```markdown
# Feed the Bear Python Toolkit v2.1 Release

<ac:structured-macro ac:name="status">
  <ac:parameter ac:name="title">Release Notes</ac:parameter>
  <ac:parameter ac:name="colour">Green</ac:parameter>
  <ac:parameter ac:name="subtle">false</ac:parameter>
</ac:structured-macro>

## Executive Summary

This release marks the completion of the Python toolkit migration. Core parity with web toolkit is achieved across all critical workflows: editor, procedural system, progression planner, session review, and spreadsheet integration. Performance baselines are maintained; all validation tests pass at 95%+ (60/62).

The cutover enables Python-primary development for future features while the web toolkit serves as a FALLBACK-ONLY surface for compatibility.

<ac:structured-macro ac:name="expand">
  <ac:parameter ac:name="title">Key Features</ac:parameter>
  <ac:rich-text-body>
    - Schema normalization: All 9 progressions (A-I) migrated to canonical JSON with strict pair color validation (7 canonical colors max)
    - Parity verification: 102 test suite covering all workflows
    - Hardening: Defensive validation, edge case handling
    - Performance: Baseline maintained; no regression detected
    - Spreadsheet parity: Full sync with local-first source of truth
  </ac:rich-text-body>
</ac:structured-macro>

<ac:structured-macro ac:name="expand">
  <ac:parameter ac:name="title">Breaking Changes</ac:parameter>
  <ac:rich-text-body>
    - Web toolkit is now FALLBACK-ONLY; Python is PRIMARY for all new feature work
    - Pair type constraints: striped variants removed; 7 canonical colors enforced (red, blue, green, yellow, orange, purple, cyan)
    - Progression naming: A-F/G-H-I (was arbitrary); canonical structure: levels/progression_X/jsons/progression_X_levelN.json
    - Config updates: fish_colors.json reduced to 7 color definitions
  </ac:rich-text-body>
</ac:structured-macro>

<ac:structured-macro ac:name="expand">
  <ac:parameter ac:name="title">Migration Rollback</ac:parameter>
  <ac:rich-text-body>
    If critical issues arise post-cutover: Tag rollback/pre-cutover-main exists on origin. Contact @Victoria for rollback procedure. Expected RTO: <30min.
  </ac:rich-text-body>
</ac:structured-macro>

## Related Links

- [Parity Verification Report](https://confluence.internal/spaces/game-design/parity-verification)
- [CUTOVER_PLAN.md](CUTOVER_PLAN.md#rollback)

---

**Document Metadata**
- **Type**: Release Notes
- **Owner**: Victoria
- **Target Audience**: Internal Team, Stakeholders
- **Space**: Game Design
- **Tags**: release, python-toolkit, cutover
- **Status**: Draft
- **Created**: 2026-04-13T14:30:00.000000
```

---

### Paso 6: Copiar a Kingfluence

1. Abre Kingfluence en tu navegador
2. Navega a: `Game Design` → `Releases`
3. Crea nueva página: `Feed the Bear Python Toolkit v2.1 Release`
4. Copia todo el markdown generado (desde `# Feed the Bear...` hasta el footer de metadatos)
5. Pega en el editor de Kingfluence
6. Kingfluence renderiza los macros XML automáticamente

---

## Workflow Completo (Futura Automatización)

```bash
# 1. Editar el spreadsheet (UI Google Sheets)
#    → Cambiar componentes, content, metadata
#    → Share url: https://docs.google.com/spreadsheets/d/1A2B3C4D5E6F7G8H9I0J/edit

# 2. Validar localmente
python3 scripts/generate_template_from_spreadsheet.py \
  --sheet-id 1A2B3C4D5E6F7G8H9I0J \
  --validate

# 3. Generar
python3 scripts/generate_template_from_spreadsheet.py \
  --sheet-id 1A2B3C4D5E6F7G8H9I0J \
  --output-file docs/release_v2_1.md

# 4. Revisar localmente
cat docs/release_v2_1.md | less

# 5. (Futuro) Publicar automáticamente a Kingfluence
python3 scripts/generate_template_from_spreadsheet.py \
  --sheet-id 1A2B3C4D5E6F7G8H9I0J \
  --publish  # Auto-creates/updates Kingfluence page
```

---

## Casos de Uso

### Release Notes (Este ejemplo)
- Status macro con fecha de lanzamiento
- Expandable sections para features, breaking changes, migration rollback
- Related links a documentación de parity

### Design Decision Record (ADR)
- Executive summary: la decisión
- Expandable: rationale, implications, examples
- Code block: ejemplos de schema o implementación
- Related links: ADRs relacionados, JIRA tickets

### Postmortem de Incident
- Status: Red (incident resolved)
- Timeline: expandable
- Root cause analysis: expandable
- Action items: table con owner/priority/deadline

### Announcement
- Status: Green
- Summary: the announcement
- Details: expandable sections
- Call to action: links

---

## Estructura del Script (Referencia para Desarrollo)

```
scripts/generate_template_from_spreadsheet.py
├── Clases principales
│   ├── TemplateValidator — validación de datos
│   ├── KingfluenceMarkdownGenerator — generación de macros/markdown
│   └── TemplateGenerator — orquestación (conectar → cargar → validar → generar)
├── Enums
│   ├── ComponentType — tipos de componentes disponibles
│   └── KingfluenceColor — colores para status macro
├── Dataclasses
│   ├── DocumentMetadata — metadatos de documento
│   ├── DesignSystem — tokens de tipografía/color
│   ├── Component — selector de componentes
│   └── ContentItem — bloque de contenido
└── main() — CLI entry point
```

---

## Próximas Fases (Futuro)

**Fase 2A: Template Library**
- Pre-built templates para: Release Notes, ADR, Postmortem, Announcement
- Stored in: `scripts/templates/`
- Usage: `--template release-notes` auto-populates component selector

**Fase 2B: Kingfluence Direct Publish**
- Kingfluence API integration
- Flag: `--publish` → auto-creates page in target space
- Requires: Kingfluence API token in env

**Fase 2C: Preview & Notifications**
- HTML preview generation (pre-publish review)
- Slack notification on publish
- Email notification to stakeholders

**Fase 2D: Version Control**
- Store spreadsheet snapshots in git (JSON exports)
- Track publication history
- Diff between versions
