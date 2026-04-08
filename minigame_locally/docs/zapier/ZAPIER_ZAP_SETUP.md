# 🔌 ZAPIER ZAP SETUP GUIDE

## Overview

You need to create 5 Zaps in Zapier to complete the multi-agent automation system. Each Zap connects your local services to external integrations and coordinates agents.

---

## Prerequisites

- ✅ Zapier account (free tier works, but Standard+ recommended for multiple Zaps)
- ✅ Local services running (`npm run zapier:all`)
- ✅ `.env` file with `ZAPIER_*` webhook URLs
- ✅ Slack workspace (optional but recommended for notifications)
- ✅ Google Sheets (for task tracking)
- ✅ Confluence (for doc publishing)

---

## ZAP 1: Paraclau File Watcher

**Purpose:** When `docs/PROJECT_MASTER_HANDOFF.md` changes, notify agents and track changes

### Setup Steps

1. **Go to zapier.com** → Create new Zap
2. **Trigger:** Choose "Webhooks by Zapier"
   - **Event:** Catch Raw Hook
   - Copy the webhook URL
   - Add to `.env` as: `ZAPIER_PARACLAU_WATCH_WEBHOOK=<URL>`

3. **Action 1:** "Slack" (optional)
   - **Message:** 
     ```
     🔄 Paraclau Updated
     Sections Changed: {{1.sections_changed.length}}
     Action Items: {{1.action_items.length}}
     Agents: {{1.change_summary.agents_involved}}
     ```
   - **Channel:** #tasks

4. **Action 2:** "Google Sheets"
   - **Spreadsheet:** Feed the Bear (or your main sheet)
   - **Tab:** Paraclau Updates
   - **Insert:**
     - Task ID: `{{1.task_id}}`
     - Timestamp: `{{1.timestamp}}`
     - Sections Changed: `{{1.change_summary.total_sections_changed}}`
     - Agents: `{{1.change_summary.agents_involved}}`
     - Status: `pending`

5. **Test:** Send test data
   ```bash
   curl -X POST $ZAPIER_PARACLAU_WATCH_WEBHOOK \
     -H "Content-Type: application/json" \
     -d '{
       "event": "paraclau_file_changed",
       "task_id": "test-001",
       "sections_changed": [{"section": "Work Assignment"}],
       "action_items": [{"agent": "claude"}],
       "change_summary": {
         "total_sections_changed": 1,
         "agents_involved": ["claude"]
       }
     }'
   ```

6. **Enable Zap** ✓

---

## ZAP 2: Task Routing & Notifications

**Purpose:** Route tasks to appropriate agents and track in Google Sheets

### Setup Steps

1. **Go to zapier.com** → Create new Zap
2. **Trigger:** "Webhooks by Zapier"
   - **Event:** Catch Raw Hook
   - Copy webhook URL
   - Add to `.env` as: `ZAPIER_TASK_ROUTING_WEBHOOK=<URL>`

3. **Action 1:** "Google Sheets" (Task Queue)
   - **Spreadsheet:** Feed the Bear
   - **Tab:** Task Queue
   - **Insert:**
     - Task ID: `{{1.task_id}}`
     - Type: `{{1.type}}`
     - Title: `{{1.title}}`
     - Priority: `{{1.priority}}`
     - Routed To: `{{1.routed_to}}`
     - Status: `in_progress`
     - Created: `{{1.created_at}}`
     - Deadline: `{{1.deadline}}`

4. **Action 2:** "Slack"
   - **Message:**
     ```
     📋 New Task Routed
     ID: {{1.task_id}}
     Type: {{1.type}}
     Priority: {{1.priority}}
     Assigned To: {{1.routed_to}}
     ```
   - **Channel:** #tasks

5. **Test:**
   ```bash
   curl -X POST $ZAPIER_TASK_ROUTING_WEBHOOK \
     -H "Content-Type: application/json" \
     -d '{
       "event": "task_received",
       "task_id": "TASK-test-001",
       "type": "code_generation",
       "title": "Test Task",
       "priority": "normal",
       "routed_to": "codex"
     }'
   ```

6. **Enable Zap** ✓

---

## ZAP 3: Learning Pipeline (ML Improvements)

**Purpose:** Process level feedback and trigger ML improvements

### Setup Steps

1. **Go to zapier.com** → Create new Zap
2. **Trigger:** "Google Sheets"
   - **Spreadsheet:** Feed the Bear
   - **Tab:** Procedural Learning
   - **Trigger:** New Row
   - **Condition:** Status = "pending"

   OR

   **Trigger:** "Webhooks by Zapier" (if using manual trigger)
   - Copy webhook URL
   - Add to `.env` as: `ZAPIER_LEARNING_BATCH_WEBHOOK=<URL>`

3. **Action 1:** "Google Sheets" (Update status)
   - **Spreadsheet:** Feed the Bear
   - **Tab:** Procedural Learning
   - **Update:** Row with Task ID
   - Set Status: `processed`

4. **Action 2:** "Slack" (notification)
   - **Message:**
     ```
     📊 Learning Data Processed
     Batch ID: {{1.batch_id}}
     Entries: {{1.entry_count}}
     Approved: {{1.approved_count}}
     Rejected: {{1.rejected_count}}
     ```
   - **Channel:** #ml-learning

5. **Action 3:** Custom Webhook (Claude)
   - **URL:** `$ZAPIER_CLAUDE_CALLBACK` (from .env)
   - **Method:** POST
   - **Payload:**
     ```json
     {
       "event": "learning_analysis_needed",
       "batch_id": "{{1.batch_id}}",
       "entries": "{{1.entries}}",
       "statistics": "{{1.statistical_summary}}"
     }
     ```

6. **Enable Zap** ✓

---

## ZAP 4: Documentation Auto-Publisher

**Purpose:** Publish docs to Confluence and Sheets when they change

### Setup Steps

1. **Go to zapier.com** → Create new Zap
2. **Trigger:** "Webhooks by Zapier"
   - **Event:** Catch Raw Hook
   - Copy webhook URL
   - Add to `.env` as: `ZAPIER_DOC_PUBLISH_WEBHOOK=<URL>`

3. **Action 1:** "Webhooks by Zapier" (Call Confluence)
   - **URL:** Your Confluence API endpoint
   - **Method:** POST
   - **Headers:** `Authorization: Bearer <token>`
   - **Body:**
     ```json
     {
       "type": "doc",
       "file": "{{1.file}}",
       "title": "{{1.frontmatter.title}}",
       "content": "{{1.content}}"
     }
     ```

4. **Action 2:** "Google Sheets" (Log publication)
   - **Spreadsheet:** Feed the Bear
   - **Tab:** Documentation Log
   - **Insert:**
     - File: `{{1.file}}`
     - Title: `{{1.frontmatter.title}}`
     - Published To: `{{1.publish_targets}}`
     - Published At: `{{1.timestamp}}`

5. **Action 3:** "Slack"
   - **Message:**
     ```
     📚 Documentation Published
     File: {{1.file}}
     Title: {{1.frontmatter.title}}
     Targets: {{1.publish_targets}}
     ```
   - **Channel:** #docs-published

6. **Test:**
   ```bash
   curl -X POST $ZAPIER_DOC_PUBLISH_WEBHOOK \
     -H "Content-Type: application/json" \
     -d '{
       "event": "doc_changed",
       "file": "memoria.md",
       "frontmatter": {"title": "Project Memory"},
       "publish_targets": ["confluence"],
       "content": "# Project Memory..."
     }'
   ```

7. **Enable Zap** ✓

---

## ZAP 5: Agent Handoff Coordinator

**Purpose:** Route tasks between agents when one is blocked

### Setup Steps

1. **Go to zapier.com** → Create new Zap
2. **Trigger:** "Webhooks by Zapier"
   - **Event:** Catch Raw Hook
   - Copy webhook URL
   - Add to `.env` as: `ZAPIER_HANDOFF_WEBHOOK=<URL>`

3. **Action 1:** "Google Sheets" (Log handoff)
   - **Spreadsheet:** Feed the Bear
   - **Tab:** Agent Handoffs
   - **Insert:**
     - Task ID: `{{1.task_id}}`
     - From Agent: `{{1.from_agent}}`
     - To Agent: `{{1.to_agent}}`
     - Reason: `{{1.reason}}`
     - Status: `in_progress`
     - Timestamp: `{{1.timestamp}}`

4. **Action 2:** "Slack" (Notify team)
   - **Message:**
     ```
     🤝 Agent Handoff
     Task: {{1.task_id}}
     From: {{1.from_agent}}
     To: {{1.to_agent}}
     Reason: {{1.reason}}
     ```
   - **Channel:** #tasks

5. **Action 3:** Custom Webhook (Send to next agent)
   - **URL:** Build dynamically based on `{{1.to_agent}}`
   - If `to_agent` = "codex": use `$ZAPIER_CODEX_CALLBACK`
   - If `to_agent` = "copilot": use `$ZAPIER_COPILOT_CALLBACK`
   - **Payload:**
     ```json
     {
       "task_id": "{{1.task_id}}",
       "context": "{{1.context}}",
       "instructions": "{{1.codex_instructions}}"
     }
     ```

6. **Enable Zap** ✓

---

## Callback Webhooks Setup

These webhooks receive completion notifications from agents:

### For Claude
- **Endpoint:** Create webhook in Zapier
- **Trigger:** When data posted to webhook
- **Action 1:** Update Google Sheets task status to `completed`
- **Action 2:** Send Slack notification
- **Save webhook URL** to `.env` as `ZAPIER_CLAUDE_CALLBACK`

### For Codex
- Similar setup to Claude
- **Save webhook URL** to `.env` as `ZAPIER_CODEX_CALLBACK`

### For Copilot
- Similar setup
- **Save webhook URL** to `.env` as `ZAPIER_COPILOT_CALLBACK`

---

## Testing Your Zaps

### Test Paraclau Sync
```bash
curl -X POST $ZAPIER_PARACLAU_WATCH_WEBHOOK \
  -H "Content-Type: application/json" \
  -d '{
    "event": "paraclau_file_changed",
    "task_id": "test-001",
    "file": "docs/PROJECT_MASTER_HANDOFF.md",
    "sections_changed": [{"section": "Test"}],
    "action_items": [{"agent": "claude"}]
  }'
```

### Test Task Routing
```bash
curl -X POST $ZAPIER_TASK_ROUTING_WEBHOOK \
  -H "Content-Type: application/json" \
  -d '{
    "event": "task_received",
    "task_id": "TASK-test-001",
    "type": "code_generation",
    "title": "Test",
    "priority": "normal",
    "routed_to": "codex"
  }'
```

### Verify in Zapier Dashboard
1. Go to zapier.com
2. Click each Zap
3. Look for recent tasks
4. Check "Task History" for successful executions
5. Fix any with status "ERROR"

---

## Troubleshooting

### Zap not firing?
- [ ] Check webhook URL is correct in .env
- [ ] Verify Zap is "ON" (blue toggle)
- [ ] Test webhook with curl command
- [ ] Check "Task History" in Zapier for errors

### Actions not executing?
- [ ] Verify Slack/Sheets credentials are correct
- [ ] Test with sample data
- [ ] Check "Task History" for specific error messages

### Google Sheets not updating?
- [ ] Ensure spreadsheet ID is correct
- [ ] Check tab name matches exactly
- [ ] Verify account has edit permissions
- [ ] Try creating new sheet tab

### Confluence not publishing?
- [ ] Verify API token is valid
- [ ] Check page ID is correct
- [ ] Test with Postman or curl first
- [ ] Ensure content format is valid

### Slack notifications not working?
- [ ] Verify webhook URL is correct
- [ ] Check channel name is correct (# required)
- [ ] Test in Slack that bot has permissions
- [ ] Try sending direct message to bot

---

## Advanced Configuration

### Using Zapier Filters
Add conditions to Zaps to filter tasks:

```
IF Task Type = "code_generation"
THEN Route to Codex
```

### Using Zapier Delays
Add delays between actions (useful for rate limiting):

```
Action 1: Receive webhook
Action 2: Wait 5 seconds
Action 3: Send to Sheets
```

### Using Zapier Formatters
Format data before sending to external services:

```
Formatter: Text
Input: {{1.title}}
Template: [URGENT] {{text}}
```

---

## Monthly Zapier Cost Estimate

- **Free Plan:** ~3 Zaps (100 tasks/month limit)
- **Professional:** ~$49/month (5000 tasks/month)
- **Team:** ~$99/month (unlimited tasks)

**Recommendation:** Start on Professional if using these 5 Zaps regularly.

---

## Next Steps

1. ✅ Create all 5 Zaps (this guide)
2. ✅ Get webhook URLs and update .env
3. ✅ Test each Zap individually
4. ✅ Run `npm run zapier:all`
5. ✅ Monitor logs: `tail -f logs/zapier-*.log`

---

**Questions?** See `ZAPIER_QUICK_START.md` and `AGENTS_ZAPIER_INTEGRATION.md`
