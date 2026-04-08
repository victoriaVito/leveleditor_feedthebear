# 🤖 AGENTS ZAPIER INTEGRATION ARCHITECTURE
## Claude + Codex + Copilot Automation Framework

---

## 📋 TABLE OF CONTENTS

1. [Agent Capabilities Matrix](#agent-capabilities-matrix)
2. [Zapier Integration Points](#zapier-integration-points)
3. [5 Core Automation Flows](#5-core-automation-flows)
4. [Webhook Specifications](#webhook-specifications)
5. [Payload Schemas](#payload-schemas)
6. [Environment Configuration](#environment-configuration)
7. [Scripts & Integration](#scripts--integration)
8. [Testing & Validation](#testing--validation)
9. [Troubleshooting Guide](#troubleshooting-guide)

---

## AGENT CAPABILITIES MATRIX

### Claude Opus (via Copilot CLI / Sync)
| Capability | Trigger | Output | Latency |
|---|---|---|---|
| **Long-form analysis** | Zapier webhook → Claude task | Markdown report | 30-60s |
| **Strategic documentation** | File changes (`docs/PROJECT_MASTER_HANDOFF.md`) | Confluence-ready HTML | 60-90s |
| **Design critique** | Learning data payload | Quality assessment + feedback | 45-60s |
| **Coordination decisions** | Multi-agent conflict | Resolution + action items | 30-45s |

**Trigger Pattern:** Zapier POST → Local HTTP server → Copilot CLI task → Result webhook back

---

### Codex (File-based, Headless)
| Capability | Trigger | Output | Latency |
|---|---|---|---|
| **Code generation** | Template + parameters | Generated code file | 10-30s |
| **File transformation** | Source file + rules | Modified file | 5-20s |
| **Bulk operations** | CSV/JSON manifest | Multiple output files | 20-60s |
| **Local-first processing** | Environment variables | Log entry + result manifest | 5-15s |

**Trigger Pattern:** File watcher → Script invocation → File output → Webhook notification

---

### Copilot CLI (This session)
| Capability | Trigger | Output | Latency |
|---|---|---|---|
| **Task execution** | Slack/Zapier webhook | Command output + status | 10-30s |
| **Code review** | GitHub diff URL | Review comments | 20-45s |
| **Real-time coordination** | User input via terminal | Immediate response | <5s |
| **Context aggregation** | MCP server queries | Structured report | 15-30s |

**Trigger Pattern:** Webhook → Background agent → Result streaming

---

## ZAPIER INTEGRATION POINTS

```
┌─────────────────────────────────────────────────────────────────────┐
│                        ZAPIER HUB (Central)                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │  File Watch  │  │   Webhook    │  │   Schedule   │              │
│  │  Triggers    │  │   Triggers   │  │   Triggers   │              │
│  └────────┬─────┘  └────────┬─────┘  └────────┬─────┘              │
│           │                 │                 │                    │
│           └─────────────────┼─────────────────┘                    │
│                             │                                      │
│                    ┌────────▼────────┐                            │
│                    │  Task Router    │                            │
│                    │  (Logic Zap)    │                            │
│                    └────────┬────────┘                            │
│                             │                                      │
│           ┌─────────────────┼─────────────────┐                  │
│           │                 │                 │                  │
│    ┌──────▼──────┐  ┌──────▼──────┐  ┌──────▼──────┐           │
│    │   Claude    │  │   Codex     │  │  Copilot    │           │
│    │   Webhook   │  │   Script    │  │  CLI Cmd    │           │
│    └──────┬──────┘  └──────┬──────┘  └──────┬──────┘           │
│           │                │                │                   │
│           └────────────────┼────────────────┘                   │
│                            │                                    │
│                   ┌────────▼────────┐                          │
│                   │  Result Sync    │                          │
│                   │  (Aggregator)   │                          │
│                   └────────┬────────┘                          │
│                            │                                    │
│           ┌────────────────┼────────────────┐                 │
│           │                │                │                 │
│    ┌──────▼──────┐  ┌──────▼──────┐  ┌──────▼──────┐        │
│    │  Confluence │  │   Sheets    │  │  Slack/Email│        │
│    │  Publish    │  │   Update    │  │  Notify     │        │
│    └─────────────┘  └─────────────┘  └─────────────┘        │
│                                                               │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 5 CORE AUTOMATION FLOWS

### 🔄 FLOW #1: Paraclau Sync Enhancement
**When:** `docs/PROJECT_MASTER_HANDOFF.md` changes  
**Who:** Claude (analysis) → Codex (apply) → Copilot (verify)  
**Purpose:** Keep coordination file in sync, extract decisions, implement changes

#### Zap Sequence
```
1. FILE WATCH: docs/PROJECT_MASTER_HANDOFF.md modified
   ↓
2. PARSE: Extract changed sections (Claude + Codex agent assignments)
   ↓
3. CLAUDE WEBHOOK: Send to Claude for decision analysis
   │  Output: Actions needed (code changes, docs, etc)
   ↓
4. CODEX SCRIPT: Apply code changes if needed
   │  Input: Changes manifest from Claude
   │  Output: Files modified, test passed/failed
   ↓
5. COPILOT VERIFY: Run validation (git diff, linting)
   │  Input: Modified files
   │  Output: Validation report
   ↓
6. UPDATE docs/PROJECT_MASTER_HANDOFF.md: Add completion timestamp + summary
   ↓
7. NOTIFY: Slack/Email with execution summary
```

#### Payload Example
```json
{
  "event": "paraclau_file_changed",
  "timestamp": "2026-03-24T15:30:00Z",
  "file": "docs/PROJECT_MASTER_HANDOFF.md",
  "sections_changed": [
    {
      "section": "Work Assignment",
      "old_hash": "a1b2c3",
      "new_hash": "d4e5f6",
      "requires_action": true
    }
  ],
  "claude_task": {
    "type": "analyze_decisions",
    "context": "..."
  },
  "codex_task": {
    "type": "apply_changes",
    "files": ["app.js", "styles.css"]
  },
  "copilot_task": {
    "type": "validate",
    "checks": ["lint", "test", "git-diff"]
  }
}
```

---

### 🎯 FLOW #2: Agent Task Routing
**When:** New task arrives via Zapier (Slack, GitHub issue, email)  
**Who:** Copilot (router) → assigns to Claude / Codex / Copilot  
**Purpose:** Smart distribution of work based on task type + agent availability

#### Zap Sequence
```
1. TRIGGER: New item in task queue
   (Slack: #tasks channel, Email: tasks@, GitHub issue label:automation)
   ↓
2. PARSE: Extract task metadata (type, priority, urgency, required_skills)
   ↓
3. ROUTE LOGIC (Zapier conditional):
   ├─ Long-form analysis? → CLAUDE
   ├─ Code generation? → CODEX
   ├─ Real-time CLI work? → COPILOT
   └─ Complex coordination? → CLAUDE + CODEX + COPILOT (parallel)
   ↓
4. SEND TO AGENT:
   ├─ Claude: POST https://claude.api.example/task
   ├─ Codex: Create task file + trigger watcher
   └─ Copilot: Send background agent task
   ↓
5. TRACK: Update task status in Sheets
   ├─ in_progress
   ├─ blocked (if dependency)
   └─ assigned_to: {agent_name}
   ↓
6. WAIT: Poll agent status endpoint
   ↓
7. COMPLETE: Receive result → update Sheets + notify originator
```

#### Task Classification Rules
```
TASK TYPE: "Code generation"
  → CODEX (primary) + COPILOT (validate)
  
TASK TYPE: "Design critique"
  → CLAUDE (primary)
  
TASK TYPE: "Level validation"
  → COPILOT (primary) + CLAUDE (if quality disputed)
  
TASK TYPE: "Documentation"
  → CLAUDE (primary) + CODEX (if code samples needed)
  
TASK TYPE: "API integration"
  → CODEX (primary) + CLAUDE (design review)
  
TASK TYPE: "Strategic planning"
  → CLAUDE (primary) + CODEX (implementation) + COPILOT (coordination)
```

#### Payload Example
```json
{
  "event": "task_received",
  "task_id": "TASK-2026-0324-001",
  "type": "code_generation",
  "priority": "high",
  "title": "Generate slot difficulty curves",
  "description": "Create difficulty.js with 3 difficulty tiers",
  "required_skills": ["javascript", "math", "game-balance"],
  "dependencies": ["TASK-2026-0324-000"],
  "routed_to": "codex",
  "fallback_agents": ["copilot", "claude"],
  "deadline": "2026-03-24T18:00:00Z",
  "source": "slack:#tasks",
  "requester": "victoria.serrano",
  "webhook_callback": "https://hooks.zapier.com/hooks/catch/YOUR_ID/"
}
```

---

### 📚 FLOW #3: Learning Data Pipeline
**When:** Procedural learning data arrives (approval/rejection)  
**Who:** Copilot (aggregate) → Claude (analyze) → Codex (update ML)  
**Purpose:** Continuous improvement of procedural generation quality

#### Zap Sequence
```
1. TRIGGER: New learning entry in Google Sheets
   (Column: "Status" = "approved" OR "rejected")
   ↓
2. EXTRACT: Learning metadata
   ├─ Level ID, generation params
   ├─ Feedback tags (too_easy, meaningless_blockers, etc)
   ├─ Player rating, playtime
   └─ Improvement suggestions
   ↓
3. AGGREGATE: Batch 5+ entries for efficiency
   ↓
4. CLAUDE ANALYZE: 
   Input: Batch of learning data
   Output: Pattern identification + ML recommendations
   ├─ "Blockers are placed too clustered (55% of rejects)"
   ├─ "Pair count too low for board size (8x8 with 2 pairs)"
   └─ "Spanish feedback detection: enable [new patterns]"
   ↓
5. CODEX UPDATE:
   Input: Claude recommendations
   Output: Updated ML config files
   ├─ app.js (LEARNING_TEXT_TAG_PATTERNS)
   ├─ app.js (scoreCandidateWithLearning)
   ├─ app.js (learningDrivenGenerationAdjustments)
   └─ PROCEDURAL_ML_DESIGN.md (documentation)
   ↓
6. TEST: Regenerate 10 levels with new params
   ├─ Validate no crashes
   ├─ Spot-check difficulty curve
   ↓
7. COMMIT: Push to git if passing tests
   ↓
8. LOG: Update PROCEDURAL_ML_DESIGN.md section 10
   (Learning iteration history + latest improvements)
```

#### Payload Example
```json
{
  "event": "learning_batch_ready",
  "batch_id": "BATCH-2026-03-24-001",
  "timestamp": "2026-03-24T14:00:00Z",
  "entry_count": 8,
  "approved_count": 2,
  "rejected_count": 6,
  "entries": [
    {
      "id": "level_001",
      "status": "rejected",
      "tags": ["too_easy", "meaningless_blockers"],
      "player_rating": 2.5,
      "feedback_text": "Bloques sin sentido, pares muy pocos",
      "generation_params": {
        "board_size": "8x8",
        "pair_count": 2,
        "blocker_count": 5,
        "blocker_spread": 0.3
      }
    }
  ],
  "statistical_summary": {
    "top_rejection_reasons": [
      {"reason": "meaningless_blockers", "count": 5, "pct": 62.5},
      {"reason": "too_easy", "count": 3, "pct": 37.5}
    ],
    "avg_player_rating_approved": 4.2,
    "avg_player_rating_rejected": 2.1
  },
  "claude_analysis_hook": "https://hooks.zapier.com/hooks/catch/YOUR_ID/"
}
```

---

### 📄 FLOW #4: Documentation Auto-Publish
**When:** Key docs change (memoria.md, design docs)  
**Who:** Claude (format) → Codex (convert) → Copilot (publish)  
**Purpose:** Keep Confluence & external docs in sync with repo truth

#### Zap Sequence
```
1. TRIGGER: File modified in docs path
   ├─ memoria.md (project memory)
   ├─ PROCEDURAL_ML_DESIGN.md
   ├─ AGENTS.md
   └─ Any .md with frontmatter: [publish: true]
   ↓
2. EXTRACT: Frontmatter + content
   ├─ Target: confluence / sheets / notion / github-wiki
   ├─ Layout: standard / custom-template
   └─ Audience: internal / public
   ↓
3. CLAUDE FORMAT:
   Input: Markdown + frontmatter
   Output: Confluence-compatible HTML
   ├─ Expand abbreviations
   ├─ Convert diagrams to descriptions
   ├─ Add internal links
   ├─ Format code blocks
   └─ Create table of contents
   ↓
4. CODEX CONVERT:
   Input: Claude-formatted HTML
   Output: Confluence macros / Sheets ranges
   ├─ if target=confluence: Add Jira macros, status badges, expand/collapse
   ├─ if target=sheets: Generate range + format rules
   ├─ if target=github-wiki: Convert to GFM + frontmatter
   ↓
5. PUBLISH:
   ├─ Confluence: POST to page via REST API
   ├─ Sheets: Update designated ranges via googleapi
   ├─ GitHub Wiki: Push to wiki repo
   ↓
6. VERIFY: Fetch published content, compare with source
   ↓
7. NOTIFY: Slack "#docs-published" + link
```

#### Payload Example
```json
{
  "event": "doc_changed",
  "timestamp": "2026-03-24T14:30:00Z",
  "file": "memoria.md",
  "git_commit": "abc123def456",
  "git_author": "victoria.serrano",
  "frontmatter": {
    "title": "Project Memory",
    "publish_targets": ["confluence", "sheets"],
    "confluence_page_id": "12345",
    "sheets_range": "Documentation!A1:H100",
    "audience": "internal"
  },
  "content": "# Project Memory\n\n## Latest Updates\n...",
  "content_hash": "def789abc123",
  "claude_format_hook": "https://hooks.zapier.com/hooks/catch/YOUR_ID/",
  "codex_convert_hook": "https://hooks.zapier.com/hooks/catch/YOUR_ID/"
}
```

---

### 🔗 FLOW #5: Cross-Agent Handoffs
**When:** Task blocked or requires another agent's expertise  
**Who:** Any agent → Router → Next agent  
**Purpose:** Seamless context transfer + collaboration without manual coordination

#### Zap Sequence
```
1. TRIGGER: Agent marks task as "blocked_needs_[agent]"
   ├─ Claude: "blocked_needs_codex" (needs implementation)
   ├─ Codex: "blocked_needs_claude" (unsure about design)
   └─ Copilot: "blocked_needs_human_input" (manual override needed)
   ↓
2. EXTRACT: Current context + blocker reason
   ├─ Task ID + state
   ├─ Work done so far
   ├─ Specific question/blocker
   └─ Suggested next step
   ↓
3. ROUTE: Send to next agent with full context
   ├─ Task: {..., status: "handoff_to_codex"}
   ├─ Context: previous agent's output + reasoning
   ├─ Deadline: inherit from original
   └─ Priority: escalate if already high
   ↓
4. NEXT AGENT:
   Input: Full context + specific question
   Output: Resolution OR escalate further
   ↓
5. TRACK: Update task log with handoff metadata
   ├─ from_agent: "claude"
   ├─ to_agent: "codex"
   ├─ reason: "implementation needed"
   ├─ context_size: "45KB"
   └─ transfer_time: "2.3s"
   ↓
6. COMPLETE: If resolved, aggregate all agent work
   ├─ Combine outputs from all agents involved
   ├─ Update memoria.md with decision trail
   ├─ Notify originator with final result
```

#### Payload Example
```json
{
  "event": "handoff_request",
  "task_id": "TASK-2026-0324-001",
  "from_agent": "claude",
  "to_agent": "codex",
  "reason": "Implementation of recommendations",
  "status": "blocked_needs_codex",
  "context": {
    "task": "Improve procedural generation for 8x8 boards",
    "claude_analysis": "Blockers too clustered (55%), pair count too low",
    "claude_recommendation": "Add spreadBlockers config, increase pair_count to 4-5",
    "claude_output": "See attached: ML_RECOMMENDATIONS.md",
    "estimated_effort": "2-3 hours",
    "dependencies": []
  },
  "handoff_metadata": {
    "original_deadline": "2026-03-24T18:00:00Z",
    "handoff_time": "2026-03-24T15:35:00Z",
    "priority": "high",
    "escalation_chain": ["claude", "codex", "copilot"]
  },
  "codex_instructions": {
    "type": "code_modification",
    "files": ["app.js", "PROCEDURAL_ML_DESIGN.md"],
    "config_keys": ["spreadBlockers", "pair_count_range"],
    "test_after": true
  }
}
```

---

## WEBHOOK SPECIFICATIONS

### Central Webhook Endpoint
**Purpose:** Receive all events from Zapier  
**Host:** Local HTTP server (Node/Python)  
**Port:** 3000 (or configurable via env)  
**Path:** `/webhook/zapier`  

#### Webhook Receiver Implementation (Node.js)
```javascript
// In your project: scripts/zapier-webhook-receiver.js

const express = require('express');
const app = express();

app.use(express.json());

app.post('/webhook/zapier', async (req, res) => {
  const { event, task_id, from_agent, to_agent, payload } = req.body;
  
  console.log(`[ZAPIER] Event: ${event}, Task: ${task_id}`);
  
  try {
    // Route based on event type
    switch(event) {
      case 'paraclau_file_changed':
        await handleParaclauSync(payload);
        break;
      case 'task_received':
        await handleTaskRouting(payload);
        break;
      case 'learning_batch_ready':
        await handleLearningPipeline(payload);
        break;
      case 'doc_changed':
        await handleDocPublish(payload);
        break;
      case 'handoff_request':
        await handleHandoff(payload);
        break;
      default:
        console.warn(`Unknown event: ${event}`);
    }
    
    res.json({ status: 'ok', task_id });
  } catch (error) {
    console.error(`Webhook error for ${task_id}:`, error);
    res.status(500).json({ status: 'error', error: error.message });
  }
});

app.listen(3000, () => {
  console.log('Zapier webhook receiver listening on port 3000');
});
```

### Agent Callback Webhooks
Each agent signals completion via callback:

#### Claude Callback
```
POST {ZAPIER_CLAUDE_CALLBACK}
{
  "task_id": "TASK-2026-0324-001",
  "agent": "claude",
  "status": "completed",
  "output": {
    "analysis": "...",
    "recommendations": [...]
  },
  "duration_ms": 45000
}
```

#### Codex Callback
```
POST {ZAPIER_CODEX_CALLBACK}
{
  "task_id": "TASK-2026-0324-001",
  "agent": "codex",
  "status": "completed",
  "output": {
    "files_modified": ["app.js", "styles.css"],
    "test_passed": true,
    "git_commit": "abc123def456"
  },
  "duration_ms": 20000
}
```

#### Copilot Callback
```
POST {ZAPIER_COPILOT_CALLBACK}
{
  "task_id": "TASK-2026-0324-001",
  "agent": "copilot",
  "status": "completed",
  "output": {
    "validation_report": {...},
    "linting_passed": true,
    "tests_passed": 15
  },
  "duration_ms": 15000
}
```

---

## PAYLOAD SCHEMAS

### Common Fields (All Payloads)
```json
{
  "event": "string (required)",
  "timestamp": "ISO 8601 (required)",
  "task_id": "string (optional, generated if not provided)",
  "source": "string (slack, github, email, manual, etc)",
  "requester": "string (user email or agent name)",
  "priority": "low|normal|high|urgent",
  "deadline": "ISO 8601 (optional)"
}
```

### Paraclau Sync Payload
```json
{
  "event": "paraclau_file_changed",
  "file": "docs/PROJECT_MASTER_HANDOFF.md",
  "sections_changed": [
    {
      "section": "string",
      "old_content": "string",
      "new_content": "string",
      "old_hash": "string",
      "new_hash": "string",
      "requires_action": boolean
    }
  ],
  "action_items": [
    {
      "agent": "claude|codex|copilot",
      "action": "string",
      "details": "string"
    }
  ]
}
```

### Task Routing Payload
```json
{
  "event": "task_received",
  "task_id": "string",
  "type": "code_generation|design_critique|validation|etc",
  "title": "string",
  "description": "string",
  "required_skills": ["string"],
  "dependencies": ["string"],
  "routed_to": "claude|codex|copilot",
  "fallback_agents": ["string"],
  "metadata": {}
}
```

### Learning Pipeline Payload
```json
{
  "event": "learning_batch_ready",
  "batch_id": "string",
  "entries": [
    {
      "id": "string",
      "status": "approved|rejected",
      "tags": ["string"],
      "feedback_text": "string",
      "generation_params": {}
    }
  ],
  "statistical_summary": {
    "top_rejection_reasons": [
      {
        "reason": "string",
        "count": "number",
        "pct": "number"
      }
    ]
  }
}
```

### Documentation Publish Payload
```json
{
  "event": "doc_changed",
  "file": "string",
  "git_commit": "string",
  "git_author": "string",
  "frontmatter": {
    "title": "string",
    "publish_targets": ["confluence|sheets|github-wiki"],
    "content_type": "markdown|html|json"
  },
  "content": "string",
  "content_hash": "string"
}
```

### Handoff Payload
```json
{
  "event": "handoff_request",
  "task_id": "string",
  "from_agent": "claude|codex|copilot",
  "to_agent": "claude|codex|copilot",
  "reason": "string",
  "context": {
    "task": "string",
    "work_done_so_far": "string",
    "specific_blocker": "string"
  },
  "handoff_metadata": {
    "escalation_chain": ["string"]
  }
}
```

---

## ENVIRONMENT CONFIGURATION

### .env Variables (Add to root .env)
```bash
# ========== ZAPIER WEBHOOKS ==========
ZAPIER_WEBHOOK_RECEIVER_PORT=3000
ZAPIER_WEBHOOK_RECEIVER_URL=http://localhost:3000/webhook/zapier

# Paraclau Sync
ZAPIER_PARACLAU_WATCH_WEBHOOK=https://hooks.zapier.com/hooks/catch/YOUR_PARACLAU_ID/
LOCAL_PARACLAU_WEBHOOK=http://localhost:3000/paraclau-update

# Task Routing
ZAPIER_TASK_ROUTING_WEBHOOK=https://hooks.zapier.com/hooks/catch/YOUR_ROUTING_ID/
ZAPIER_TASK_STATUS_ENDPOINT=http://localhost:3000/task-status

# Learning Pipeline
ZAPIER_LEARNING_BATCH_WEBHOOK=https://hooks.zapier.com/hooks/catch/YOUR_LEARNING_ID/
ZAPIER_LEARNING_RESULTS_WEBHOOK=https://hooks.zapier.com/hooks/catch/YOUR_LEARNING_RESULTS_ID/

# Documentation Publishing
ZAPIER_DOC_PUBLISH_WEBHOOK=https://hooks.zapier.com/hooks/catch/YOUR_DOC_ID/
CONFLUENCE_PAGE_ID_FEED_THE_BEAR=12345
CONFLUENCE_PAGE_ID_MEMORIA=23456

# Cross-Agent Handoffs
ZAPIER_HANDOFF_WEBHOOK=https://hooks.zapier.com/hooks/catch/YOUR_HANDOFF_ID/

# ========== AGENT CALLBACKS ==========
ZAPIER_CLAUDE_CALLBACK=https://hooks.zapier.com/hooks/catch/YOUR_CLAUDE_CALLBACK_ID/
ZAPIER_CODEX_CALLBACK=https://hooks.zapier.com/hooks/catch/YOUR_CODEX_CALLBACK_ID/
ZAPIER_COPILOT_CALLBACK=https://hooks.zapier.com/hooks/catch/YOUR_COPILOT_CALLBACK_ID/

# ========== EXTERNAL SERVICES ==========
SLACK_WEBHOOK_ALERTS=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
SLACK_CHANNEL_TASKS=#tasks
SLACK_CHANNEL_DOCS_PUBLISHED=#docs-published

# Google Sheets (existing)
SPREADSHEET_ID=1MIHkR4uePd7y8nSu1YGwiN2AGpvj-u8bRqzY-OXo86c
SHEETS_TAB_LEARNING=Procedural Learning

# Confluence (existing)
KINGFLUENCE_PAGE_URL=https://confluence.kingdom.internal/pages/...
KINGFLUENCE_API_TOKEN=your_token_here
```

### Installation
```bash
# Add to minigame_locally/.env
cp .env.example .env
# Edit .env with your Zapier webhook URLs
```

---

## SCRIPTS & INTEGRATION

### Script 1: Zapier Webhook Receiver
**File:** `scripts/zapier-webhook-receiver.mjs`
```bash
npm run start:zapier-webhook
# Runs on localhost:3000, listens for all events
```

### Script 2: Paraclau File Watcher Enhanced
**File:** `scripts/paraclau-watcher-zapier.js`
```bash
npm run watch:paraclau-zapier
# Watches docs/PROJECT_MASTER_HANDOFF.md for changes
# Notifies Zapier on each change
# Parses action items, routes to agents
```

### Script 3: Learning Batch Processor
**File:** `scripts/learning-batch-processor.mjs`
```bash
npm run process:learning-batch
# Polls Google Sheets for learning entries
# Batches 5+ entries for efficiency
# Sends to Claude for analysis
```

### Script 4: Documentation Publisher
**File:** `scripts/doc-publisher-zapier.mjs`
```bash
npm run publish:docs-zapier
# Watches docs/ folder for changes
# Publishes to Confluence + Sheets
# Integrates with Zapier for notifications
```

### Script 5: Task Router Server
**File:** `scripts/task-router-server.mjs`
```bash
npm run start:task-router
# HTTP server for task intake
# Routes to appropriate agent
# Tracks status in Sheets
```

---

## TESTING & VALIDATION

### Test Checklist
```
FLOW #1: Paraclau Sync
  [ ] Modify docs/PROJECT_MASTER_HANDOFF.md → See webhook in Zapier
  [ ] Claude analyzes changes → Output in logs
  [ ] Codex applies changes → Files modified
  [ ] Copilot validates → No linting errors
  
FLOW #2: Task Routing
  [ ] New item in Slack #tasks → Routed correctly
  [ ] Task appears in Sheets (in_progress) → Status tracking works
  [ ] Agent completes task → Status updates to done
  [ ] Originator notified → Slack message sent
  
FLOW #3: Learning Pipeline
  [ ] New learning entry in Sheets → Batching works
  [ ] Claude analysis triggers → Recommendations appear
  [ ] Codex updates ML config → Files changed
  [ ] Test generation succeeds → No crashes
  
FLOW #4: Documentation Publish
  [ ] Modify memoria.md → Zapier webhook fires
  [ ] Claude formats → HTML generated
  [ ] Codex converts → Confluence macros added
  [ ] Confluence page updates → Link works
  
FLOW #5: Handoffs
  [ ] Claude marks as blocked_needs_codex → Routes to Codex
  [ ] Codex receives full context → Can see previous work
  [ ] Codex resolves or escalates → Handoff succeeds
```

### Manual Testing Commands
```bash
# Test webhook receiver
curl -X POST http://localhost:3000/webhook/zapier \
  -H "Content-Type: application/json" \
  -d '{
    "event": "task_received",
    "task_id": "TEST-001",
    "type": "code_generation",
    "title": "Test Task"
  }'

# Monitor logs
tail -f logs/zapier-*.log

# Check task status
curl http://localhost:3000/task-status/TEST-001
```

---

## TROUBLESHOOTING GUIDE

### Common Issues

#### Issue: Webhook not firing
**Symptoms:** Change made but no POST to Zapier  
**Debug:**
```bash
# 1. Check file watcher is running
ps aux | grep zapier-watcher

# 2. Check webhook URL in .env is correct
echo $ZAPIER_PARACLAU_WATCH_WEBHOOK

# 3. Test webhook manually
curl -X POST $ZAPIER_PARACLAU_WATCH_WEBHOOK \
  -H "Content-Type: application/json" \
  -d '{"test": true}'

# 4. Check firewall/network
nslookup hooks.zapier.com
```

#### Issue: Agent doesn't receive task
**Symptoms:** Task routed but agent never acts  
**Debug:**
```bash
# 1. Check agent is running
ps aux | grep "claude\|codex\|copilot"

# 2. Check callback URL in .env
echo $ZAPIER_CLAUDE_CALLBACK

# 3. Verify task format
# Check logs for parse errors
tail -f logs/task-router.log

# 4. Check agent capacity
# See if too many tasks queued
```

#### Issue: Callback not returning to Zapier
**Symptoms:** Task complete in agent but Zapier shows "pending"  
**Debug:**
```bash
# 1. Test callback webhook
curl -X POST $ZAPIER_CLAUDE_CALLBACK \
  -d '{"task_id": "TEST", "status": "completed"}'

# 2. Check agent logs for callback errors
grep -i "callback\|error" logs/*.log

# 3. Verify callback URL is reachable from agent
# If agent is remote, check VPN/network
```

### Support Contacts
- **Zapier Issues:** Check Zapier dashboard for failed tasks
- **Agent Issues:** Check respective agent logs
- **Network:** Verify all URLs are reachable (`curl -I <url>`)

---

## NEXT STEPS

1. **Create Zapier account** (if not exists)
2. **Generate webhook URLs** for each flow
3. **Update .env** with webhook URLs
4. **Deploy webhook receiver** locally
5. **Test each flow** using checklist above
6. **Monitor logs** in production
7. **Iterate** based on feedback

---

**Document Version:** 1.0  
**Last Updated:** 2026-03-24  
**Author:** Copilot CLI + Architecture Review  
**Status:** Draft (Ready for testing)
