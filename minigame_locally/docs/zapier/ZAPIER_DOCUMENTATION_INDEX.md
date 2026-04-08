# 📖 ZAPIER AUTOMATION DOCUMENTATION INDEX

Complete reference guide for the Zapier multi-agent automation system.

---

## 🚀 START HERE

**New to the system?** Read in this order:

1. **[ZAPIER_QUICK_START.md](ZAPIER_QUICK_START.md)** (15 min read)
   - What you got
   - The 5 automation flows
   - Installation & setup
   - Testing each flow
   - Common issues

2. **[ZAPIER_ZAP_SETUP.md](ZAPIER_ZAP_SETUP.md)** (30 min task)
   - Create 5 Zaps in Zapier
   - Step-by-step for each Zap
   - Testing procedures
   - Callback webhook setup

3. **Run the system:**
   ```bash
   npm run validate:env          # Check configuration
   npm run startup:zapier        # Start all services
   npm run status:zapier         # Check status
   tail -f logs/zapier-*.log     # Monitor logs
   ```

---

## 📚 COMPLETE DOCUMENTATION

### Architecture & Design
| Document | Purpose | Length |
|----------|---------|--------|
| **AGENTS_ZAPIER_INTEGRATION.md** | Complete architecture, specifications, all payloads | 26KB |
| **ZAPIER_IMPLEMENTATION_SUMMARY.md** | Visual overview with architecture diagrams | 8KB |
| **ZAPIER_CHEATSHEET.txt** | One-page quick reference | 5KB |

### Setup & Configuration
| Document | Purpose | Length |
|----------|---------|--------|
| **ZAPIER_QUICK_START.md** | Step-by-step setup guide | 11KB |
| **ZAPIER_ZAP_SETUP.md** | Create 5 Zaps in Zapier | 11KB |
| **.env.example** | All environment variables | 4.5KB |

### Testing & Debugging
| Document | Purpose | Length |
|----------|---------|--------|
| **TESTING_PAYLOADS.json** | Example JSON for all flows | 10KB |
| **ADVANCED_TROUBLESHOOTING.md** | Debug techniques and recovery | 10KB |

### Reference
| Document | Purpose | Length |
|----------|---------|--------|
| **AGENTS_ZAPIER_INTEGRATION.md (Section 8)** | Testing & validation checklist | - |
| **AGENTS_ZAPIER_INTEGRATION.md (Section 9)** | Troubleshooting guide | - |
| **memoria.md** | Project memory & change history | - |

---

## 🎯 THE 5 AUTOMATION FLOWS

### 1️⃣ Paraclau Sync
**File:** `docs/PROJECT_MASTER_HANDOFF.md` changes → Agents analyze/implement → Completion

**Read:** AGENTS_ZAPIER_INTEGRATION.md, Section 3.1
**Test:** ZAPIER_QUICK_START.md, "Testing Each Flow" → Test 1
**Scripts:** `paraclau-watcher-zapier.js`

### 2️⃣ Task Routing
**Slack/GitHub input** → Router assigns to agent → Tracks in Sheets

**Read:** AGENTS_ZAPIER_INTEGRATION.md, Section 3.2
**Test:** ZAPIER_QUICK_START.md, "Testing Each Flow" → Test 2
**Scripts:** `task-router-server.mjs`

### 3️⃣ Learning Pipeline
**Playtester feedback** → Claude analyzes → Codex updates ML → Auto-commit

**Read:** AGENTS_ZAPIER_INTEGRATION.md, Section 3.3
**Test:** ZAPIER_QUICK_START.md, "Testing Each Flow" → Test 3
**Scripts:** `learning-batch-processor.mjs`

### 4️⃣ Documentation Publishing
**Docs change** → Format → Publish to Confluence/Sheets → Notify Slack

**Read:** AGENTS_ZAPIER_INTEGRATION.md, Section 3.4
**Test:** ZAPIER_QUICK_START.md, "Testing Each Flow" → Test 4
**Scripts:** `doc-publisher-zapier.mjs`

### 5️⃣ Agent Handoffs
**Agent blocked** → Transfer context → Next agent → Resolve or escalate

**Read:** AGENTS_ZAPIER_INTEGRATION.md, Section 3.5
**Test:** Manual testing (automatic triggers)
**Scripts:** All scripts support this via events

---

## 🔧 AVAILABLE COMMANDS

### Service Management
```bash
npm run startup:zapier           # Start all services
npm run shutdown:zapier         # Stop all services
npm run status:zapier           # Check status
npm run logs:zapier             # Tail logs in real-time
npm run zapier:all              # Run services directly (no wrapper)
```

### Individual Services
```bash
npm run start:zapier-webhook    # Webhook receiver (:3000)
npm run start:task-router       # Task router (:3001)
npm run watch:paraclau-zapier   # File watcher
npm run process:learning-batch  # Learning processor
npm run publish:docs-zapier     # Doc publisher
```

### Utilities
```bash
npm run validate:env            # Validate .env configuration
```

---

## 🔌 API ENDPOINTS

### Webhook Receiver (:3000)
```
POST /webhook/zapier           Receive all events from Zapier
GET  /health                   Service health check
GET  /task-status/{id}         Query task status
```

### Task Router (:3001)
```
POST /task                      Submit new task
GET  /task/{id}                 Get task status
GET  /tasks                     List all tasks (filterable)
GET  /tasks?status=pending      Filter by status
GET  /tasks?agent=codex         Filter by agent
GET  /stats                     View statistics
POST /task/{id}/callback        Agent completion callback
GET  /health                    Service health check
```

**See:** TESTING_PAYLOADS.json for curl examples

---

## 📊 TESTING PAYLOADS

All JSON examples are in **TESTING_PAYLOADS.json**:

- Paraclau sync example
- Task routing example
- Learning pipeline example
- Doc publish example
- Agent handoff example
- API endpoint examples
- Complete curl test commands

---

## 🐛 TROUBLESHOOTING

### Quick Fixes
| Issue | Solution | Where |
|-------|----------|-------|
| Port conflict | `lsof -i :3000` → kill → restart | ZAPIER_QUICK_START.md |
| .env not loading | `cp .env.example .env` → fill values | ZAPIER_QUICK_START.md |
| Webhook not firing | Check URL in .env → test with curl | ZAPIER_QUICK_START.md |
| Service won't start | `npm run validate:env` | ZAPIER_QUICK_START.md |

### Advanced Debugging
**Read:** ADVANCED_TROUBLESHOOTING.md

Topics covered:
- Port conflicts & resolution
- Webhook delivery issues
- Environment variable problems
- Task routing debugging
- File watcher issues
- Learning pipeline problems
- Documentation publishing issues
- Network & DNS troubleshooting
- Performance optimization
- Recovery procedures
- Error message reference

---

## 📈 MONITORING

### Health Checks
```bash
curl http://localhost:3000/health
curl http://localhost:3001/health
```

### View Logs
```bash
tail -f logs/zapier-*.log              # All events
tail -f logs/task-router.log           # Task routing
tail -f logs/learning-batch-processor.log
tail -f logs/doc-publisher.log
```

### Query Tasks
```bash
curl http://localhost:3001/tasks | jq
curl http://localhost:3001/stats | jq
```

---

## 🔐 ENVIRONMENT VARIABLES

All variables documented in **.env.example** with:
- Required vs optional
- Description
- Example values
- Setup instructions

**Key variables:**
- `ZAPIER_*_WEBHOOK` (5 main webhooks)
- `ZAPIER_*_CALLBACK` (3 agent callbacks)
- `SLACK_WEBHOOK_*` (Slack integration)
- `SPREADSHEET_ID` (Google Sheets)
- `KINGFLUENCE_*` (Confluence)

---

## 📁 FILE STRUCTURE

```
minigame_locally/
├── docs/                          # Documentation
│   ├── AGENTS_ZAPIER_INTEGRATION.md
│   ├── ZAPIER_QUICK_START.md
│   ├── ZAPIER_ZAP_SETUP.md
│   ├── ZAPIER_IMPLEMENTATION_SUMMARY.md
│   ├── ADVANCED_TROUBLESHOOTING.md
│   ├── ZAPIER_CHEATSHEET.txt
│   ├── TESTING_PAYLOADS.json
│   └── ZAPIER_DOCUMENTATION_INDEX.md (this file)
│
├── scripts/
│   ├── zapier-webhook-receiver.mjs
│   ├── task-router-server.mjs
│   ├── paraclau-watcher-zapier.js
│   ├── learning-batch-processor.mjs
│   ├── doc-publisher-zapier.mjs
│   ├── validate-env.mjs
│   └── startup.sh
│
├── .github/workflows/
│   └── zapier-ci.yml              # CI/CD pipeline
│
├── logs/
│   ├── zapier-paraclau-sync.log
│   ├── zapier-task-routing.log
│   ├── learning-batch-processor.log
│   ├── doc-publisher.log
│   ├── task-router.log
│   └── tasks-registry.jsonl
│
├── .env.example                   # Environment template
├── .env                          # Your config (create from .example)
├── package.json                  # npm scripts
└── memoria.md                    # Project memory
```

---

## ⚡ QUICK START SUMMARY

### 30-second setup:
```bash
cd minigame_locally
cp .env.example .env
# Edit .env with Zapier webhook URLs (from zapier.com)
npm run validate:env              # Verify config
npm run startup:zapier            # Start services
```

### 5-minute testing:
```bash
# In another terminal:
tail -f logs/zapier-*.log

# In another terminal:
curl http://localhost:3001/task \
  -H "Content-Type: application/json" \
  -d '{"type":"code_generation","title":"Test"}'
```

---

## 📞 GETTING HELP

1. **Check logs first**
   ```bash
   npm run logs:zapier
   ```

2. **Validate configuration**
   ```bash
   npm run validate:env
   ```

3. **Search documentation**
   - ZAPIER_QUICK_START.md (common issues)
   - ADVANCED_TROUBLESHOOTING.md (debugging)
   - TESTING_PAYLOADS.json (examples)

4. **Test endpoints**
   ```bash
   curl http://localhost:3000/health
   curl http://localhost:3001/health
   ```

---

## 🎓 LEARNING RESOURCES

### Concepts
- **Webhooks:** How local services communicate with Zapier
- **Payload:** JSON data sent between services
- **Routing:** How tasks are assigned to agents
- **Callbacks:** How agents send results back

### Examples
- TESTING_PAYLOADS.json: All example payloads
- ZAPIER_QUICK_START.md: Step-by-step examples
- AGENTS_ZAPIER_INTEGRATION.md: Detailed flow examples

### Hands-on
1. Start services: `npm run startup:zapier`
2. Submit test task: `curl -X POST http://localhost:3001/task ...`
3. Watch logs: `npm run logs:zapier`
4. Check results: `curl http://localhost:3001/stats`

---

## 📋 CHECKLIST

Before going live:

- [ ] Read ZAPIER_QUICK_START.md
- [ ] Create .env from .env.example
- [ ] Run `npm run validate:env`
- [ ] Create 5 Zaps in Zapier (see ZAPIER_ZAP_SETUP.md)
- [ ] Test each flow (ZAPIER_QUICK_START.md)
- [ ] Monitor logs for 24 hours
- [ ] Set up log rotation
- [ ] Configure backups (tasks-registry.jsonl)
- [ ] Document custom configuration in README
- [ ] Train team on common operations

---

## 🔄 CONTINUOUS IMPROVEMENT

### Monitor these metrics:
- Task completion rate (via /stats)
- Average task duration
- Error rates in logs
- Agent assignment accuracy
- Zapier webhook delivery success

### Log analysis queries:
```bash
# Success rate
grep -c "SUCCESS" logs/*.log

# Error rate
grep -c "ERROR" logs/*.log

# Average task duration
grep "duration_ms" logs/task-router.log | jq -r '.duration_ms' | awk '{sum+=$1} END {print "Average:", sum/NR}'

# Slowest tasks
grep "duration_ms" logs/task-router.log | jq 'sort_by(.duration_ms) | reverse | .[0:10]'
```

---

## 📦 VERSION INFO

**System:** Zapier Multi-Agent Automation  
**Version:** 1.0  
**Created:** 2026-03-24  
**Author:** Copilot CLI  
**Status:** Production Ready  

**Components:**
- 5 Production scripts ✓
- Complete documentation ✓
- CI/CD pipeline ✓
- Validation tools ✓
- Troubleshooting guides ✓

---

**Last Updated:** 2026-03-24  
**Next Review:** 2026-04-24

For updates and improvements, see `memoria.md` "Recent structural changes"
