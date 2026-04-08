# 🤖 AUDIT DE AUTOMATIZACIONES ZAPIER - Feed the Bear

## 📊 ESTADO ACTUAL DEL SISTEMA

### ✅ ACTIVOS
| Nombre | Tipo | Archivo | Estado |
|--------|------|---------|--------|
| **Paraclau Sync** | File Watcher | `scripts/paraclau-watcher.js` | 🟢 Activo |
| **Google Sheets Sync** | API Integration | `sync_google_sheets_payload.mjs` | 🟢 Activo |
| **Confluence Publisher** | Auto-Publish | `publish_bear_confluence_report_live_chrome.mjs` | 🟢 Activo |
| **Mix Materializer** | Workflow | `materialize_approved_mixes.mjs` | 🟢 Activo |

---

## 🔗 WEBHOOKS CONFIGURADOS

### 1️⃣ **Webhook Zapier Paraclau** (PRINCIPAL)
```
Variable: ZAPIER_PARACLAU_WEBHOOK
Estado: Requiere configuración
URL Pattern: https://hooks.zapier.com/hooks/catch/[ZAPIER_ID]/
Trigger: docs/PROJECT_MASTER_HANDOFF.md cambios
Método: POST JSON
Timeout: 10s
```

**Payload enviado:**
```json
{
  "type": "file_modified",
  "path": "docs/PROJECT_MASTER_HANDOFF.md",
  "hash": "a1b2c3d4...",
  "size": 8562,
  "lastModified": "2026-03-24T14:30:00Z",
  "timestamp": "2026-03-24T14:30:05Z",
  "source": "local-watcher",
  "watcherVersion": "1.0"
}
```

### 2️⃣ **Webhook Local (Dev/Fallback)**
```
Variable: LOCAL_PARACLAU_WEBHOOK
Default: http://localhost:3000/paraclau-update
Propósito: Testing sin Zapier
```

---

## 📦 INTEGRACIONES POR ESTADO

### 🟢 IMPLEMENTADAS Y ACTIVAS

#### **Google Sheets** 
- Bidireccional: Local ↔ Sheets
- Tabs: All Progressions, Mix Planner, Level Renames, Procedural Learning
- Scripts: `sync_google_sheets_payload.mjs`, `apply_sheet_level_renames.mjs`
- Comando: `npm run sync:sheets:local`

#### **Google Drive**
- Sincronización de imágenes y assets
- Script: `sync_drive_folder_image_sheets.mjs`
- Comando: `npm run sync:drive-sheets`

#### **Confluence**
- Publicación automática de documentación
- Requisito: Chrome con debugging remoto
- Scripts: `generate_full_confluence_page.py`, `publish_bear_confluence_report_live_chrome.mjs`
- Comando: `npm run sync:kingfluence:bear`

### 🟡 MENCIONADAS PERO NO ACTIVAS

| Servicio | Referencia | Estado |
|----------|-----------|--------|
| **Airtable** | MCP_SERVERS context | ❌ Sin webhook |
| **Slack** | MCP_SERVERS context | ❌ Sin webhook |
| **Obsidian** | FABRIC frontmatter support | ❌ Sin sync |
| **GitHub** | Token en .env | ✅ Token exist, ❌ Sin Zapier |

---

## 🎯 ZAPS ACTUALES IDENTIFICADOS

### ZAP: "Paraclau Coordination Sync"

**Trigger**
- Archivo: `docs/PROJECT_MASTER_HANDOFF.md`
- Evento: Cambios de contenido (detector MD5)
- Intervalo: Chequeo cada 500ms
- Validación: Min 100 bytes + secciones requeridas

**Acciones**
```
┌─────────────────────────────────────┐
│ 1. CREAR BACKUP AUTOMÁTICO         │
│    └─ .paraclau_backups/          │
│       └─ paraclau_TIMESTAMP.md    │
└─────────────────────────────────────┘
        ↓
┌─────────────────────────────────────┐
│ 2. VALIDAR INTEGRIDAD              │
│    └─ Bloquea si truncado (>50%)   │
│    └─ Restaura si falla            │
└─────────────────────────────────────┘
        ↓
┌─────────────────────────────────────┐
│ 3. NOTIFICAR ZAPIER WEBHOOK        │
│    └─ POST /hooks/catch/[ID]/      │
│    └─ JSON payload                 │
└─────────────────────────────────────┘
        ↓
┌─────────────────────────────────────┐
│ 4. NOTIFICAR LOCAL WEBHOOK         │
│    └─ localhost:3000/paraclau-update│
│    └─ Fallback (dev)               │
└─────────────────────────────────────┘
```

**Protecciones**
- ✅ No permite eliminación (`cannotDelete: true`)
- ✅ No permite truncación (`cannotTruncate: true`)
- ✅ Auto-recovery desde backup
- ✅ Validación de secciones requeridas
- ✅ Logging a `~/.paraclau_sync.log`

---

## 📋 PATRONES REUTILIZABLES

### Patrón 1: File Watcher + Webhook
```javascript
// scripts/paraclau-watcher.js
const config = {
  watchFile: process.env.WATCH_FILE_PATH,
  zapierWebhook: process.env.ZAPIER_WEBHOOK,
  checkInterval: 500,
  protectionRules: { /* ... */ }
};

// Implementar:
// - fs.watch() + debounce
// - MD5 hash para cambios reales
// - JSON POST al webhook
// - Validaciones de contenido
// - Backups automáticos
```

### Patrón 2: Local-First + API Sync
```javascript
// scripts/sync_google_sheets_payload.mjs
// 1. Reconstruir payload local
// 2. Validar integridad
// 3. Push vía API
// 4. Log de cambios

// Reutilizable para: Airtable, Slack, etc.
```

### Patrón 3: Environment Variables
```bash
# .env
ZAPIER_[ZAPS_NAME]_WEBHOOK=https://hooks.zapier.com/...
LOCAL_[ZAPS_NAME]_WEBHOOK=http://localhost:3000/...
```

### Patrón 4: Protection + Recovery
```javascript
// Características de paraclau-watcher:
// 1. Validación de contenido requerido
// 2. Chequeo de tamaño mínimo
// 3. Auto-backup pre-cambios
// 4. Restauración automática
// 5. Eventos de protección a Zapier
```

---

## 🚀 COMANDOS DISPONIBLES

### Sync Workflows
```bash
npm run sync:sheets:local        # Google Sheets (local-first)
npm run sync:sheets:push        # Google Sheets (push only)
npm run sync:drive-sheets       # Google Drive images
npm run sync:apis               # APIs en paralelo
npm run sync:all                # Todos los syncs
npm run sync:kingfluence:bear   # Confluence publish
```

### Utilidades
```bash
npm run apply:sheet-renames     # Aplicar renames desde Sheets
npm run materialize:mixes       # Crear mixes desde Planner
npm run oauth:setup             # Configurar Google OAuth
npm run confluence:generate     # Generar HTML Confluence
npm run confluence:publish      # Publicar en Confluence
```

### Monitoreo
```bash
node scripts/paraclau-watcher.js    # Activar watcher
tail -f ~/.paraclau_sync.log        # Ver logs
ls -la .paraclau_backups/           # Ver backups
```

---

## 🔐 VARIABLES DE ENTORNO REQUERIDAS

### Zapier
```bash
export ZAPIER_PARACLAU_WEBHOOK="https://hooks.zapier.com/hooks/catch/YOUR_ID/"
export LOCAL_PARACLAU_WEBHOOK="http://localhost:3000/paraclau-update"
```

### Google
```bash
export SPREADSHEET_ID="1MIHkR4uePd7y8nSu1YGwiN2AGpvj-u8bRqzY-OXo86c"
export DRIVE_FOLDER_NAME="bear"
```

### Confluence
```bash
export KINGFLUENCE_PAGE_URL="https://confluence.kingdom.internal/pages/..."
```

### APIs de IA
```bash
export OPENAI_API_KEY="sk-proj-..."
export ANTHROPIC_API_KEY="sk-ant-api03-..."
export GOOGLE_API_KEY="AIzaSy..."
```

---

## 📁 ARCHIVOS CLAVE

| Archivo | Propósito | Status |
|---------|-----------|--------|
| `scripts/paraclau-watcher.js` | File watcher + Zapier | ✅ Activo |
| `docs/PROJECT_MASTER_HANDOFF.md` | Coordinación Claude/Codex | ✅ Monitoreado |
| `scripts/sync_google_sheets_payload.mjs` | Sync a Sheets | ✅ Activo |
| `scripts/apply_sheet_level_renames.mjs` | Aplicar cambios Sheets | ✅ Activo |
| `scripts/materialize_approved_mixes.mjs` | Crear mixes | ✅ Activo |
| `scripts/publish_bear_confluence_report_live_chrome.mjs` | Publish Confluence | ✅ Activo |
| `.paraclau_backups/` | Respaldos automáticos | ✅ Active |
| `~/.paraclau_sync.log` | Log de eventos | ✅ Registrando |

---

## ✨ PRÓXIMOS PASOS PARA NUEVOS ZAPS PARACLAU

1. **Configurar webhook**
   ```bash
   export ZAPIER_PARACLAU_WEBHOOK="https://hooks.zapier.com/hooks/catch/YOUR_ID/"
   ```

2. **Crear Zap en Zapier**
   - Trigger: Webhook personalizado
   - Actions: Slack, Email, Airtable, etc.

3. **Testear conexión**
   ```bash
   node scripts/paraclau-watcher.js
   # Hacer cambio en docs/PROJECT_MASTER_HANDOFF.md
   # Ver notificación en Zapier
   ```

4. **Monitorear logs**
   ```bash
   tail -f ~/.paraclau_sync.log
   ```

5. **Usar patrones existentes** para nuevos watchers:
   - Google Sheets pattern para APIs
   - File watcher pattern para cambios locales
   - Environment variables pattern para config

---

## 📈 ESTADO RESUMIDO

| Componente | Activo | Webhook | Documentado |
|-----------|--------|---------|------------|
| Paraclau Watcher | ✅ | ✅ | ✅ |
| Google Sheets | ✅ | ✅ | ✅ |
| Confluence | ✅ | ✅ | ✅ |
| Google Drive | ✅ | ✅ | ✅ |
| Airtable | ❌ | ❌ | ✅ |
| Slack | ❌ | ❌ | ✅ |
| Obsidian | ❌ | ❌ | ✅ |
