# 🚀 ZAPIER MULTI-AGENT AUTOMATION - QUICK START GUIDE

## What You Just Got

5 production-ready scripts that coordinate Claude, Codex, and Copilot through Zapier:

| Script | Purpose | Port | Command |
|--------|---------|------|---------|
| **Webhook Receiver** | Central hub for all events | 3000 | `npm run start:zapier-webhook` |
| **Paraclau Watcher** | Monitors docs/PROJECT_MASTER_HANDOFF.md changes | - | `npm run watch:paraclau-zapier` |
| **Learning Processor** | Processes level feedback batches | - | `npm run process:learning-batch` |
| **Doc Publisher** | Publishes docs to Confluence | - | `npm run publish:docs-zapier` |
| **Task Router** | Routes tasks to agents | 3001 | `npm run start:task-router` |

---

## 5 Automation Flows

### 1️⃣ Paraclau Sync (Coordination File)
**What it does:**
- Watches `docs/PROJECT_MASTER_HANDOFF.md` for changes
- Extracts action items (Claude, Codex, Copilot assignments)
- Sends to Zapier → triggers agents
- Creates automatic backups

**When to use:**
- You update the coordination file
- Assignments for agents need to be executed
- Need automatic backups of decisions

**Example:** Edit docs/PROJECT_MASTER_HANDOFF.md with a new task assignment → Zapier notifies agents → they get to work

---

### 2️⃣ Task Routing (Smart Distribution)
**What it does:**
- Routes incoming tasks to the right agent
- Claude → analysis/strategy
- Codex → code generation
- Copilot → validation/CLI

**When to use:**
- Tasks arrive from Slack, GitHub, Email
- Need intelligent agent assignment
- Want to track task status

**Example Endpoints:**
```bash
# Submit a task
curl -X POST http://localhost:3001/task \
  -H "Content-Type: application/json" \
  -d '{
    "type": "code_generation",
    "title": "Generate ML config updater",
    "description": "Create script to update learning config",
    "priority": "high"
  }'

# Check task status
curl http://localhost:3001/task/TASK-1234567890-abc

# List all tasks
curl "http://localhost:3001/tasks?status=pending"

# View statistics
curl http://localhost:3001/stats
```

---

### 3️⃣ Learning Pipeline (Procedural ML)
**What it does:**
- Polls for level feedback (approved/rejected)
- Batches 5+ entries for efficiency
- Sends to Claude for pattern analysis
- Codex updates ML configuration files
- Logs improvements to documentation

**When to use:**
- New playtester feedback arrives
- Ready to optimize level generation
- Need data-driven ML improvements

**What it updates:**
- `app.js` (ML scoring functions)
- `PROCEDURAL_ML_DESIGN.md` (documentation)
- `learned_patterns.json` (learning registry)

---

### 4️⃣ Documentation Publishing (Auto-Publish)
**What it does:**
- Watches doc files for changes (memoria.md, design docs)
- Formats to Confluence-ready HTML
- Adds macros and styling
- Publishes to Confluence + Sheets

**When to use:**
- Documentation changes
- Want auto-sync to Confluence
- Need persistent design records

**Watched files:**
- `memoria.md`
- `FEED_THE_BEAR_GDD.md`
- `PROCEDURAL_ML_DESIGN.md`
- `docs/LEVEL_DESIGN.md`
- `AGENTS.md`
- `AGENT_CHEATSHEET.md`
- Any `.md` with `[publish: true]` frontmatter

---

### 5️⃣ Cross-Agent Handoffs (Seamless Collaboration)
**What it does:**
- Monitors agent status for blockers
- Auto-routes to next agent with full context
- Tracks handoff metadata
- Maintains decision trail

**When to use:**
- An agent hits a blocker
- Needs another agent's expertise
- Want automated context transfer

**Example flow:**
Claude → "blocked_needs_codex" → Codex receives full analysis → implements → completes

---

## Installation & Setup

### Step 1: Copy environment template
```bash
cd minigame_locally
cp .env.example .env
```

### Step 2: Fill in Zapier webhooks
Open `https://zapier.com` and create 5 Zaps (one for each flow):

**Zap 1: Paraclau File Change**
- Trigger: Webhooks by Zapier
- Webhook URL: Copy from Zapier → `.env` → `ZAPIER_PARACLAU_WATCH_WEBHOOK`

**Zap 2: Task Received**
- Trigger: Webhooks by Zapier  
- Webhook URL: → `ZAPIER_TASK_ROUTING_WEBHOOK`

**Zap 3: Learning Batch Ready**
- Trigger: Webhooks by Zapier
- Webhook URL: → `ZAPIER_LEARNING_BATCH_WEBHOOK`

**Zap 4: Doc Changed**
- Trigger: Webhooks by Zapier
- Webhook URL: → `ZAPIER_DOC_PUBLISH_WEBHOOK`

**Zap 5: Handoff Request**
- Trigger: Webhooks by Zapier
- Webhook URL: → `ZAPIER_HANDOFF_WEBHOOK`

**Agent Assignment Webhooks**
- `ZAPIER_CLAUDE_WEBHOOK`
- `ZAPIER_CODEX_WEBHOOK`
- `ZAPIER_COPILOT_WEBHOOK`

These are the endpoints the local task router uses when it assigns work to a specific agent.

### Step 3: Verify your .env
```bash
# Local stack only
npm run validate:env:local

# Full Zapier routing
npm run validate:env:full
```

`local` validates the on-machine stack and default ports. `full` also requires the remote Zapier webhooks for sync, callbacks, and agent assignment.

---

## Running the System

### Option A: Run Everything
```bash
npm run zapier:all
# Starts all 5 services in parallel
```

Managed local startup on macOS:

```bash
npm run startup:zapier
npm run status:zapier
```

### Option B: Run Individual Services
```bash
# Terminal 1: Webhook receiver (central hub)
npm run start:zapier-webhook

# Terminal 2: Paraclau watcher
npm run watch:paraclau-zapier

# Terminal 3: Learning processor
npm run process:learning-batch

# Terminal 4: Doc publisher
npm run publish:docs-zapier

# Terminal 5: Task router
npm run start:task-router
```

---

## Testing Each Flow

### Test 1: Paraclau Sync
```bash
# Edit docs/PROJECT_MASTER_HANDOFF.md and save
echo "- [ ] Claude: Review design" >> docs/PROJECT_MASTER_HANDOFF.md

# Watch logs for confirmation
tail -f ~/.paraclau_sync.log
# OR
tail -f logs/zapier-paraclau-sync.log
```

### Test 2: Task Routing
```bash
# Submit a test task
curl -X POST http://localhost:3001/task \
  -H "Content-Type: application/json" \
  -d '{
    "type": "code_generation",
    "title": "Test Task",
    "description": "A test to verify routing works",
    "priority": "normal"
  }'

# Expected response:
# {
#   "task_id": "TASK-1234567890-abc",
#   "status": "created",
#   "routed_to": "codex",
#   "estimated_time": "30-60min"
# }

# Check status
curl http://localhost:3001/task/TASK-1234567890-abc
```

### Test 3: Learning Pipeline
```bash
# Add a test entry to learned_patterns.json
# Then watch for batch processing
tail -f logs/learning-batch-processor.log

# Or check webhook sender logs
tail -f logs/zapier-learning-pipeline.log
```

### Test 4: Doc Publisher
```bash
# Edit memoria.md
echo "## Test Update" >> minigame_locally/memoria.md

# Watch for publication logs
tail -f logs/doc-publisher.log
```

### Test 5: Health Checks
```bash
# Check all services are running
curl http://localhost:3000/health
curl http://localhost:3001/health

# Expected:
# {"status":"healthy","timestamp":"...","uptime":...}
```

---

## Monitoring & Debugging

### View All Logs
```bash
# See all events across all services
ls -la logs/zapier-*.log

# Real-time view of everything
tail -f logs/zapier-*.log

# Filter by event type
tail -f logs/zapier-paraclau-sync.log
tail -f logs/zapier-task-routing.log
tail -f logs/learning-batch-processor.log
```

### Check Webhook Delivery
```bash
# See if webhooks are reaching services
grep "accepted\|ERROR\|webhook" logs/zapier-*.log

# Sample healthy log:
# [INFO] paraclau_sync: Received docs/PROJECT_MASTER_HANDOFF.md change notification
# [SUCCESS] Zapier webhook sent
```

### Monitor Task Queue
```bash
# View pending tasks
curl "http://localhost:3001/tasks?status=pending" | jq

# View tasks by agent
curl "http://localhost:3001/tasks?agent=claude" | jq

# View statistics
curl http://localhost:3001/stats | jq
```

---

## Common Issues & Solutions

### Issue: Webhook receiver won't start
```bash
# Check port 3000 is available
lsof -i :3000

# Kill existing process if needed
kill -9 <PID>

# Try different port
ZAPIER_WEBHOOK_RECEIVER_PORT=3002 npm run start:zapier-webhook
```

### Issue: Paraclau watcher not detecting changes
```bash
# Check file exists
ls -la minigame_locally/docs/PROJECT_MASTER_HANDOFF.md

# Watch logs for errors
tail -f ~/.paraclau_sync.log

# Test manual webhook
curl -X POST http://localhost:3000/webhook/zapier \
  -H "Content-Type: application/json" \
  -d '{"event":"paraclau_file_changed","task_id":"TEST"}'
```

### Issue: Task router not routing
```bash
# Check task-router is running
curl http://localhost:3001/health

# Check logs for routing errors
tail -f logs/task-router.log

# Verify task format
curl -X POST http://localhost:3001/task \
  -H "Content-Type: application/json" \
  -d '{"type":"code_generation","title":"Test"}'
```

### Issue: Zapier not receiving webhooks
```bash
# 1. Check webhook URL in .env
echo $ZAPIER_PARACLAU_WATCH_WEBHOOK

# 2. Test webhook URL directly
curl -X POST $ZAPIER_PARACLAU_WATCH_WEBHOOK \
  -H "Content-Type: application/json" \
  -d '{"test":true}'

# 3. Check Zapier dashboard for failed webhooks
# 4. If firewall issue: verify outbound HTTPS is allowed
```

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────┐
│  You (Victoria)                                     │
│  - Edit docs/PROJECT_MASTER_HANDOFF.md             │
│  - Submit tasks to Slack / GitHub                  │
│  - Create content (levels, docs)                   │
└──────────────┬──────────────────────────────────────┘
               │
    ┌──────────┴──────────┐
    │                     │
    ▼                     ▼
┌─────────────────────────────────────────────────────┐
│  LOCAL SERVICES (Your Machine)                      │
│                                                     │
│  [1] Webhook Receiver (:3000)  ← All events       │
│  [2] Task Router (:3001)       ← Task intake      │
│  [3] Paraclau Watcher          ← File changes     │
│  [4] Doc Publisher             ← Publish docs     │
│  [5] Learning Processor        ← ML improvements  │
└────────────┬────────────────────────────────────────┘
             │
             │ POSTS to Zapier
             │
             ▼
┌─────────────────────────────────────────────────────┐
│  ZAPIER (Cloud)                                     │
│                                                     │
│  [Zap 1] Paraclau → Slack notification            │
│  [Zap 2] Task Router → Google Sheets              │
│  [Zap 3] Learning → Claude + Codex                │
│  [Zap 4] Docs → Confluence                        │
│  [Zap 5] Handoffs → Next agent                    │
└────────────┬────────────────────────────────────────┘
             │
    ┌────────┴────────┐
    │                 │
    ▼                 ▼
┌─────────────┐   ┌──────────────┐
│ Claude      │   │ Google Sheets│
│ (Analysis)  │   │ (Tracking)   │
└─────────────┘   └──────────────┘

    ▼              ▼              ▼
┌─────────────────────────────────────────────────────┐
│  EXTERNAL DESTINATIONS                              │
│  - Confluence (docs)                                │
│  - Slack (#tasks, #docs-published)                 │
│  - GitHub (issues, PRs)                            │
└─────────────────────────────────────────────────────┘
```

---

## Next Steps

1. ✅ Scripts are written and ready
2. **→ Set up Zapier webhooks** (see Setup section)
3. **→ Fill .env with webhook URLs**
4. **→ Test each flow** (see Testing section)
5. **→ Monitor logs** while running
6. **→ Iterate based on feedback**

---

## Support

**Documentation:**
- `AGENTS_ZAPIER_INTEGRATION.md` - Full architecture
- `AGENT_CHEATSHEET.md` - Which agent to use when
- `docs/PROJECT_MASTER_HANDOFF.md` - Coordination file

**Scripts:**
```bash
# See available commands
npm run

# See script help
node scripts/zapier-webhook-receiver.mjs --help
```

**Logs:**
```bash
# Find all logs
find logs -name "*.log" -type f

# Real-time monitoring
tail -f logs/*.log | grep -E "SUCCESS|ERROR|task_id"
```

---

**Ready to go! 🚀**

Start with `npm run start:zapier-webhook` and watch the logs as you make changes.
