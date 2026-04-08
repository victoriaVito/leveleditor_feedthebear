# 🔧 ADVANCED TROUBLESHOOTING GUIDE

## Port Conflicts

### Problem: Address already in use :3000

```bash
# Find what's using port 3000
lsof -i :3000

# Kill process
kill -9 <PID>

# Or use different port
ZAPIER_WEBHOOK_RECEIVER_PORT=3002 npm run start:zapier-webhook
```

### Problem: All services fail to start

```bash
# Check if ports 3000-3001 are available
lsof -i :3000
lsof -i :3001

# Use pm2 to manage processes
npm install -g pm2
pm2 start scripts/zapier-webhook-receiver.mjs --name webhook
pm2 start scripts/task-router-server.mjs --name router
```

---

## Webhook Delivery Issues

### Problem: Zapier webhook not reaching local services

**Check 1: Firewall**
```bash
# On macOS
system_preferences → Security & Privacy → Firewall Options
# Allow node.js

# On Linux
sudo ufw allow 3000
sudo ufw allow 3001
```

**Check 2: Network accessibility**
```bash
# Test if service is listening
curl -v http://localhost:3000/health

# Test if accessible externally
# Use ngrok to tunnel (dev only):
ngrok http 3000
# Use ngrok URL in Zapier webhook
```

**Check 3: Zapier webhook format**
```bash
# Manually test webhook
curl -X POST http://localhost:3000/webhook/zapier \
  -H "Content-Type: application/json" \
  -d '{
    "event": "test",
    "task_id": "TEST-001",
    "timestamp": "2026-03-24T15:00:00Z"
  }'
```

---

## Environment Variable Issues

### Problem: .env not loading

```bash
# Check if .env exists
ls -la .env

# Check if dotenv is being loaded
grep -n "dotenv" scripts/*.mjs

# Manually load .env
export $(cat .env | grep -v '^#' | xargs)

# Verify
echo $ZAPIER_WEBHOOK_RECEIVER_PORT
```

### Problem: Invalid webhook URLs

```bash
# Validate each URL
node -e "
const urls = {
  'ZAPIER_PARACLAU_WATCH_WEBHOOK': process.env.ZAPIER_PARACLAU_WATCH_WEBHOOK,
  'ZAPIER_TASK_ROUTING_WEBHOOK': process.env.ZAPIER_TASK_ROUTING_WEBHOOK,
};
Object.entries(urls).forEach(([k,v]) => {
  try {
    new URL(v);
    console.log('✓', k);
  } catch {
    console.log('✗', k, '- invalid URL:', v);
  }
});
"
```

---

## Task Routing Issues

### Problem: Tasks not routing to correct agent

**Check logs:**
```bash
grep "Routed to" logs/task-router.log
grep "routing_reason" logs/zapier-task-routing.log
```

**Check routing rules:**
```bash
grep -A 5 "ROUTING_RULES" scripts/task-router-server.mjs
```

**Test routing:**
```bash
curl -X POST http://localhost:3001/task \
  -H "Content-Type: application/json" \
  -d '{
    "type": "code_generation",
    "title": "Test",
    "description": "Testing route to codex"
  }' | jq .

# Check response.routed_to should be "codex"
```

### Problem: Tasks not persisting

**Check in-memory registry:**
```bash
curl http://localhost:3001/tasks | jq '.[] | {id, status, routed_to}'
```

**Check task history file:**
```bash
tail logs/tasks-registry.jsonl
```

---

## File Watcher Issues

### Problem: docs/PROJECT_MASTER_HANDOFF.md changes not detected

**Check 1: File path**
```bash
# Verify file exists
ls -la docs/PROJECT_MASTER_HANDOFF.md

# Check absolute path
cd $(pwd) && pwd && ls -la docs/PROJECT_MASTER_HANDOFF.md
```

**Check 2: File permissions**
```bash
# Ensure readable
chmod 644 docs/PROJECT_MASTER_HANDOFF.md

# Check inode
ls -i docs/PROJECT_MASTER_HANDOFF.md
```

**Check 3: Watch loop is running**
```bash
# Check process
ps aux | grep paraclau-watcher

# Manually trigger hash change
echo "# test" >> docs/PROJECT_MASTER_HANDOFF.md
tail ~/.paraclau_sync.log
```

**Check 4: Hash calculation**
```bash
# Test hash function
node -e "
const crypto = require('crypto');
const fs = require('fs');
const content = fs.readFileSync('docs/PROJECT_MASTER_HANDOFF.md', 'utf8');
const hash = crypto.createHash('md5').update(content).digest('hex');
console.log('MD5 Hash:', hash);
console.log('Content Length:', content.length);
"
```

---

## Learning Pipeline Issues

### Problem: Batch not processing

**Check 1: Learning data file**
```bash
# Check if file exists
cat learned_patterns.json | jq '.[] | {id, status}' | head -20

# Count unprocessed entries
cat learned_patterns.json | jq '[.[] | select(.batch_processed != true)] | length'
```

**Check 2: Batch timing**
```bash
# Check polling interval
grep -n "pollingInterval" scripts/learning-batch-processor.mjs

# Logs show polling status
tail -f logs/learning-batch-processor.log
```

**Check 3: Test batch manually**
```bash
curl -X POST http://localhost:3000/webhook/zapier \
  -H "Content-Type: application/json" \
  -d '{
    "event": "learning_batch_ready",
    "batch_id": "TEST-BATCH",
    "entry_count": 2,
    "approved_count": 1,
    "rejected_count": 1,
    "entries": [
      {
        "id": "test_1",
        "status": "approved",
        "tags": ["good"],
        "feedback_text": "Nice",
        "player_rating": 4.5,
        "generation_params": {}
      }
    ],
    "statistical_summary": {
      "top_rejection_reasons": []
    }
  }'
```

---

## Documentation Publishing Issues

### Problem: Docs not publishing to Confluence

**Check 1: File watching**
```bash
# Monitor doc publisher logs
tail -f logs/doc-publisher.log

# Edit memoria.md and watch
echo "## Test Update" >> minigame_locally/memoria.md
tail -f logs/doc-publisher.log
```

**Check 2: Webhook callback**
```bash
# Verify Zapier webhook is configured
echo $ZAPIER_DOC_PUBLISH_WEBHOOK

# Test webhook
curl -X POST $ZAPIER_DOC_PUBLISH_WEBHOOK \
  -H "Content-Type: application/json" \
  -d '{"event": "test", "file": "memoria.md"}'
```

**Check 3: Confluence credentials**
```bash
# Verify token is valid
curl -X GET https://confluence.kingdom.internal/wiki/rest/api/user/current \
  -H "Authorization: Bearer $KINGFLUENCE_API_TOKEN"
```

---

## Logging & Debugging

### Increase verbosity

```bash
# Set debug mode
DEBUG=true npm run start:zapier-webhook

# Change log level
LOG_LEVEL=debug npm run zapier:all

# Tail specific log
tail -f logs/zapier-learning-pipeline.log | jq .
```

### Parse logs effectively

```bash
# Find errors
grep -i "error" logs/*.log | head -20

# Find specific task
grep "TASK-id" logs/*.log

# Count events by type
grep "event" logs/zapier-*.log | grep -o '"event":"[^"]*"' | sort | uniq -c

# Timeline of events
cat logs/zapier-*.log | jq -s 'sort_by(.timestamp) | .[] | "\(.timestamp) \(.event) \(.message)"'
```

### Monitor in real-time

```bash
# Watch all logs with color
tail -f logs/*.log | grep --color=auto "ERROR\|SUCCESS\|task_id"

# Watch specific service
tail -f logs/task-router.log | jq .

# Watch multiple files
watch -n 1 'ls -la logs/ | tail -5'
```

---

## Network & DNS Issues

### Problem: Cannot reach Zapier webhooks

```bash
# Check DNS
nslookup hooks.zapier.com

# Test HTTPS connectivity
curl -v https://hooks.zapier.com

# Check firewall
sudo tcpdump -i en0 host hooks.zapier.com

# Try from different network
# Use mobile hotspot to test
```

### Problem: Callback webhooks not reaching agents

```bash
# Check if Claude/Codex/Copilot services are receiving
# Look for callback URLs in env
echo "Claude: $ZAPIER_CLAUDE_CALLBACK"
echo "Codex: $ZAPIER_CODEX_CALLBACK"
echo "Copilot: $ZAPIER_COPILOT_CALLBACK"

# Test callback manually
curl -X POST $ZAPIER_CLAUDE_CALLBACK \
  -H "Content-Type: application/json" \
  -d '{
    "task_id": "TEST",
    "agent": "test",
    "status": "completed",
    "output": {},
    "duration_ms": 1000
  }'
```

---

## Performance Issues

### Problem: High memory usage

```bash
# Check process memory
ps aux | grep node | grep -v grep

# Monitor in real-time
top -p <PID>

# Check for memory leaks in logs
grep -i "heap\|memory" logs/*.log
```

### Problem: Slow task processing

```bash
# Check bottleneck
grep "duration_ms" logs/task-router.log | tail -20

# Identify slow tasks
cat logs/task-router.log | jq 'select(.duration_ms > 5000) | {task_id, type, duration_ms}'

# Check system resources
free -h  # Memory
df -h    # Disk
```

---

## Recovery Procedures

### Emergency shutdown

```bash
# Kill all services
pkill -f "zapier-webhook-receiver"
pkill -f "task-router-server"
pkill -f "paraclau-watcher"
pkill -f "learning-batch-processor"
pkill -f "doc-publisher"

# Or use startup script
bash scripts/startup.sh stop
```

### Backup important data

```bash
# Backup task registry before restart
cp logs/tasks-registry.jsonl logs/tasks-registry.jsonl.backup.$(date +%s)

# Backup learning data
cp learned_patterns.json learned_patterns.json.backup.$(date +%s)

# Backup logs
tar -czf logs.backup.$(date +%s).tar.gz logs/
```

### Clean restart

```bash
# Clear old logs
rm -f logs/zapier-*.log

# Clear task registry
> logs/tasks-registry.jsonl

# Restart services
bash scripts/startup.sh start

# Verify
bash scripts/startup.sh status
```

---

## Getting Help

1. **Check logs first**
   ```bash
   tail -100 logs/*.log | less
   ```

2. **Run validation**
   ```bash
   npm run validate:env
   ```

3. **Test endpoints**
   ```bash
   curl http://localhost:3000/health
   curl http://localhost:3001/health
   ```

4. **Check Zapier dashboard**
   - Look for recent task executions
   - Check "Task History" for errors
   - Review webhook logs

5. **Review documentation**
   - ZAPIER_QUICK_START.md
   - AGENTS_ZAPIER_INTEGRATION.md
   - ZAPIER_ZAP_SETUP.md

---

## Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| `EADDRINUSE` | Port already in use | Kill process or use different port |
| `Cannot find module` | Missing dependency | Run `npm install` |
| `ECONNREFUSED` | Service not running | Start service with `npm run` |
| `Invalid webhook URL` | .env not configured | Run `npm run validate:env` |
| `Webhook timeout` | Network issue | Check firewall and DNS |
| `Task not found` | Wrong task ID | List tasks with `curl /tasks` |

---

For additional help, see `ZAPIER_QUICK_START.md` section "Common Issues & Solutions"
