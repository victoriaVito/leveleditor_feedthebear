#!/usr/bin/env node
/**
 * Task Router Server - Intelligent Task Routing
 * 
 * HTTP server that receives tasks and routes them to the appropriate agent:
 * - Claude (analysis, design, strategy)
 * - Codex (code generation, file manipulation)
 * - Copilot (validation, CLI work, coordination)
 * 
 * Endpoints:
 *   POST /task          - Submit new task
 *   GET  /task/{id}     - Get task status
 *   POST /task/{id}/callback - Agent completion callback
 *   GET  /tasks         - List all tasks
 *   GET  /health        - Health check
 * 
 * Usage:
 *   npm run start:task-router
 *   or: node scripts/task-router-server.mjs
 */

import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import http from 'http';
import crypto from 'crypto';
import { ROUTING_RULES, buildRoutingDecision } from './lib/coordination_routing.mjs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

const app = express();
const PORT = process.env.TASK_ROUTER_PORT || 3001;

const CONFIG = {
  logFile: path.join(PROJECT_ROOT, 'logs', 'task-router.log'),
  tasksFile: path.join(PROJECT_ROOT, 'logs', 'tasks-registry.jsonl'),
};

// Task registry
const tasks = new Map();

/**
 * Log events
 */
async function logEvent(level, message, data = {}) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    ...data,
  };

  const logLine = JSON.stringify(logEntry) + '\n';

  try {
    await fs.appendFile(CONFIG.logFile, logLine, 'utf8');
  } catch (err) {
    console.error('Failed to write log:', err);
  }

  const levelColor = {
    ERROR: '\x1b[31m',
    WARN: '\x1b[33m',
    INFO: '\x1b[36m',
    SUCCESS: '\x1b[32m',
    RESET: '\x1b[0m',
  };

  const color = levelColor[level] || '';
  const reset = levelColor.RESET;
  console.log(`${color}[${level}]${reset} ${message}`, data);
}

/**
 * Log task to JSONL registry
 */
async function logTaskRegistry(task) {
  try {
    const line = JSON.stringify(task) + '\n';
    await fs.appendFile(CONFIG.tasksFile, line, 'utf8');
  } catch (err) {
    console.error('Failed to log task:', err);
  }
}

/**
 * Route task to appropriate agent
 */
function routeTask(task) {
  return buildRoutingDecision(task);
}

/**
 * Send task to agent via webhook (in real system)
 */
async function sendToAgent(agent, task) {
  const envKey = `ZAPIER_${agent.toUpperCase()}_WEBHOOK`;
  const webhookUrl = process.env[envKey];

  if (!webhookUrl) {
    await logEvent('WARN', `No webhook for agent: ${agent}`, { task_id: task.id });
    return false;
  }

  return new Promise((resolve, reject) => {
    const url = new URL(webhookUrl);
    const payload = JSON.stringify({
      event: 'task_assigned',
      task_id: task.id,
      task,
      assigned_at: new Date().toISOString(),
    });

    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    };

    const req = http.request(options, (res) => {
      const success = res.statusCode >= 200 && res.statusCode < 300;
      success ? resolve(true) : reject(new Error(`HTTP ${res.statusCode}`));
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

/**
 * Express middleware
 */
app.use(express.json());

/**
 * Health check
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    tasks_tracked: tasks.size,
    uptime: process.uptime(),
  });
});

/**
 * Simple visual dashboard
 */
app.get('/dashboard', (req, res) => {
  res.type('html').send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Task Router Dashboard</title>
  <style>
    :root {
      --bg: #0b0f14;
      --panel: #121922;
      --panel-2: #0f151d;
      --text: #e8edf3;
      --muted: #93a1b2;
      --ok: #2ecc71;
      --warn: #f1c40f;
      --err: #e74c3c;
      --accent: #4da3ff;
      --border: #223144;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "SF Pro Text", "Segoe UI", -apple-system, BlinkMacSystemFont, sans-serif;
      background: radial-gradient(1200px 600px at 20% -10%, #1a2432 0%, var(--bg) 60%);
      color: var(--text);
    }
    .wrap {
      max-width: 1100px;
      margin: 24px auto;
      padding: 0 16px 24px;
    }
    .top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }
    .top h1 {
      margin: 0;
      font-size: 24px;
      letter-spacing: 0.2px;
    }
    .meta {
      color: var(--muted);
      font-size: 13px;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 10px;
      margin-bottom: 16px;
    }
    .card {
      background: linear-gradient(180deg, var(--panel), var(--panel-2));
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 12px;
    }
    .label {
      font-size: 12px;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.08em;
      margin-bottom: 8px;
    }
    .value {
      font-size: 26px;
      font-weight: 700;
      line-height: 1;
    }
    .ok { color: var(--ok); }
    .warn { color: var(--warn); }
    .err { color: var(--err); }
    .section-title {
      margin: 0 0 10px;
      font-size: 15px;
      color: #c9d5e2;
    }
    .split {
      display: grid;
      grid-template-columns: 1fr 2fr;
      gap: 10px;
      margin-bottom: 10px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    th, td {
      border-bottom: 1px solid var(--border);
      padding: 8px 6px;
      text-align: left;
      vertical-align: top;
    }
    th {
      color: var(--muted);
      font-weight: 600;
    }
    .pill {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 999px;
      font-size: 11px;
      border: 1px solid var(--border);
      color: #dbe8f5;
    }
    .s-pending { background: #27313f; }
    .s-completed { background: #1c3a2c; border-color: #2e6b4c; }
    .s-failed { background: #3b2020; border-color: #7c3434; }
    .agent-codex { color: #9fd1ff; }
    .agent-claude { color: #f8c8ff; }
    .agent-copilot { color: #b3ffd9; }
    .muted { color: var(--muted); }
    .controls {
      display: flex;
      gap: 8px;
      margin-bottom: 10px;
    }
    .tabs {
      display: flex;
      gap: 8px;
      margin-bottom: 12px;
      flex-wrap: wrap;
    }
    .tab-btn.active {
      background: #244567;
      border-color: #3b6ea2;
    }
    .panel { display: none; }
    .panel.active { display: block; }
    button {
      border: 1px solid var(--border);
      background: #172231;
      color: #dbe8f5;
      border-radius: 8px;
      padding: 7px 10px;
      cursor: pointer;
      font-size: 12px;
    }
    button:hover { background: #1f2d41; }
    @media (max-width: 900px) {
      .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .split { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="top">
      <h1>Task Router Dashboard</h1>
      <div class="meta">
        <span id="health">Health: ...</span> ·
        <span id="updated">Updated: -</span>
      </div>
    </div>

    <div class="controls">
      <button id="refresh">Refresh now</button>
      <button id="toggle">Pause auto-refresh</button>
    </div>

    <div class="tabs">
      <button type="button" class="tab-btn active" data-panel="overview">Overview</button>
      <button type="button" class="tab-btn" data-panel="tasks">Tasks</button>
      <button type="button" class="tab-btn" data-panel="agents">Agents</button>
    </div>

    <section id="panel-overview" class="panel active">
      <div class="grid">
        <div class="card"><div class="label">Total Tasks</div><div class="value" id="total">0</div></div>
        <div class="card"><div class="label">Pending</div><div class="value warn" id="pending">0</div></div>
        <div class="card"><div class="label">Completed</div><div class="value ok" id="completed">0</div></div>
        <div class="card"><div class="label">Failed</div><div class="value err" id="failed">0</div></div>
      </div>

      <div class="split">
        <div class="card">
          <h2 class="section-title">By Agent</h2>
          <table>
            <thead><tr><th>Agent</th><th>Tasks</th></tr></thead>
            <tbody id="by-agent"></tbody>
          </table>
        </div>
        <div class="card">
          <h2 class="section-title">Recent Tasks</h2>
          <table>
            <thead>
              <tr>
                <th>ID</th><th>Title</th><th>Status</th><th>Agent</th><th>Created</th>
              </tr>
            </thead>
            <tbody id="tasks"></tbody>
          </table>
        </div>
      </div>
    </section>

    <section id="panel-tasks" class="panel">
      <div class="card">
        <h2 class="section-title">All Tasks (latest first)</h2>
        <table>
          <thead>
            <tr>
              <th>ID</th><th>Title</th><th>Status</th><th>Agent</th><th>Created</th>
            </tr>
          </thead>
          <tbody id="tasks-all"></tbody>
        </table>
      </div>
    </section>

    <section id="panel-agents" class="panel">
      <div class="split">
        <div class="card">
          <h2 class="section-title">By Agent</h2>
          <table>
            <thead><tr><th>Agent</th><th>Tasks</th></tr></thead>
            <tbody id="by-agent-full"></tbody>
          </table>
        </div>
        <div class="card">
          <h2 class="section-title">By Status</h2>
          <table>
            <thead><tr><th>Status</th><th>Tasks</th></tr></thead>
            <tbody id="by-status"></tbody>
          </table>
        </div>
      </div>
    </section>
  </div>
  <script>
    let paused = false;
    let timer = null;

    function pill(status) {
      const cls = status === 'completed' ? 's-completed' : (status === 'failed' ? 's-failed' : 's-pending');
      return '<span class="pill ' + cls + '">' + status + '</span>';
    }

    function fmt(ts) {
      try { return new Date(ts).toLocaleTimeString(); } catch (_) { return '-'; }
    }

    async function loadData() {
      try {
        const [healthRes, statsRes, tasksRes] = await Promise.all([
          fetch('/health'),
          fetch('/stats'),
          fetch('/tasks'),
        ]);
        const health = await healthRes.json();
        const stats = await statsRes.json();
        const tasksPayload = await tasksRes.json();

        document.getElementById('health').textContent = 'Health: ' + (health.status || 'unknown');
        document.getElementById('updated').textContent = 'Updated: ' + new Date().toLocaleTimeString();
        document.getElementById('total').textContent = String(stats.total_tasks || 0);
        document.getElementById('pending').textContent = String((stats.by_status && stats.by_status.pending) || 0);
        document.getElementById('completed').textContent = String((stats.by_status && stats.by_status.completed) || 0);
        document.getElementById('failed').textContent = String((stats.by_status && stats.by_status.failed) || 0);

        const byAgent = stats.by_agent || {};
        const agentRows = ['claude', 'codex', 'copilot'].map(a =>
          '<tr><td class=\"agent-' + a + '\">' + a + '</td><td>' + (byAgent[a] || 0) + '</td></tr>'
        ).join('');
        document.getElementById('by-agent').innerHTML = agentRows || '<tr><td colspan=\"2\" class=\"muted\">No data</td></tr>';
        document.getElementById('by-agent-full').innerHTML = agentRows || '<tr><td colspan=\"2\" class=\"muted\">No data</td></tr>';

        const byStatus = stats.by_status || {};
        document.getElementById('by-status').innerHTML = ['pending','in_progress','completed','failed']
          .map(s => '<tr><td>' + s + '</td><td>' + (byStatus[s] || 0) + '</td></tr>')
          .join('');

        const tasks = (tasksPayload.tasks || []).slice(0, 20);
        document.getElementById('tasks').innerHTML = tasks.length
          ? tasks.map(t => (
              '<tr>' +
              '<td><code>' + t.id + '</code></td>' +
              '<td>' + (t.title || '') + '</td>' +
              '<td>' + pill(t.status || 'pending') + '</td>' +
              '<td class=\"agent-' + (t.routed_to || '') + '\">' + (t.routed_to || '-') + '</td>' +
              '<td>' + fmt(t.created_at) + '</td>' +
              '</tr>'
            )).join('')
          : '<tr><td colspan=\"5\" class=\"muted\">No tasks yet</td></tr>';

        const tasksAll = tasksPayload.tasks || [];
        document.getElementById('tasks-all').innerHTML = tasksAll.length
          ? tasksAll.map(t => (
              '<tr>' +
              '<td><code>' + t.id + '</code></td>' +
              '<td>' + (t.title || '') + '</td>' +
              '<td>' + pill(t.status || 'pending') + '</td>' +
              '<td class=\"agent-' + (t.routed_to || '') + '\">' + (t.routed_to || '-') + '</td>' +
              '<td>' + fmt(t.created_at) + '</td>' +
              '</tr>'
            )).join('')
          : '<tr><td colspan=\"5\" class=\"muted\">No tasks yet</td></tr>';
      } catch (err) {
        document.getElementById('health').textContent = 'Health: error';
      }
    }

    function startTimer() {
      if (timer) clearInterval(timer);
      timer = setInterval(() => { if (!paused) loadData(); }, 3000);
    }

    document.getElementById('refresh').addEventListener('click', loadData);
    document.getElementById('toggle').addEventListener('click', (e) => {
      paused = !paused;
      e.target.textContent = paused ? 'Resume auto-refresh' : 'Pause auto-refresh';
    });
    document.querySelectorAll('.tab-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const panel = btn.getAttribute('data-panel');
        document.querySelectorAll('.tab-btn').forEach((b) => b.classList.toggle('active', b === btn));
        document.querySelectorAll('.panel').forEach((p) => p.classList.remove('active'));
        const target = document.getElementById('panel-' + panel);
        if (target) target.classList.add('active');
      });
    });

    loadData();
    startTimer();
  </script>
</body>
</html>`);
});

/**
 * Submit new task
 */
app.post('/task', async (req, res) => {
  try {
    const {
      type,
      title,
      description,
      priority = 'normal',
      deadline,
      required_skills = [],
      dependencies = [],
      source = 'api',
      requester = 'unknown',
    } = req.body;

    // Validate required fields
    if (!type || !title) {
      return res.status(400).json({ error: 'Missing required fields: type, title' });
    }

    // Generate task ID
    const taskId = `TASK-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;

    // Route task
    const routing = routeTask({ type });

    // Create task object
    const task = {
      id: taskId,
      type,
      title,
      description,
      priority,
      deadline,
      required_skills,
      dependencies,
      source,
      requester,
      status: 'pending',
      created_at: new Date().toISOString(),
      routed_to: routing.primary_agent,
      fallback_agents: routing.fallback_agents,
      estimated_time: routing.estimated_time,
    };

    // Store task
    tasks.set(taskId, task);

    // Log task
    await logTaskRegistry(task);
    await logEvent('INFO', `Task created`, { id: taskId, type, routed_to: routing.primary_agent });

    // Try to send to agent
    let sent = false;
    try {
      sent = await sendToAgent(routing.primary_agent, task);
    } catch (error) {
      await logEvent('WARN', `Failed to send task to agent: ${error.message}`, { task_id: taskId });
    }

    res.status(201).json({
      task_id: taskId,
      status: 'created',
      routed_to: routing.primary_agent,
      sent: sent,
      estimated_time: routing.estimated_time,
    });
  } catch (error) {
    await logEvent('ERROR', `Task submission failed: ${error.message}`, {});
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get task status
 */
app.get('/task/:id', (req, res) => {
  const { id } = req.params;
  const task = tasks.get(id);

  if (!task) {
    return res.status(404).json({ error: 'Task not found', task_id: id });
  }

  res.json(task);
});

/**
 * List all tasks
 */
app.get('/tasks', (req, res) => {
  const { status, agent } = req.query;

  let results = Array.from(tasks.values());

  if (status) {
    results = results.filter((t) => t.status === status);
  }

  if (agent) {
    results = results.filter((t) => t.routed_to === agent);
  }

  // Sort by created_at descending
  results.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  res.json({
    total: results.length,
    tasks: results,
  });
});

/**
 * Agent completion callback
 */
app.post('/task/:id/callback', async (req, res) => {
  try {
    const { id } = req.params;
    const { agent, status, output, duration_ms } = req.body;

    const task = tasks.get(id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Update task
    task.status = status === 'error' ? 'failed' : 'completed';
    task.completed_by = agent;
    task.output = output;
    task.duration_ms = duration_ms;
    task.completed_at = new Date().toISOString();

    // Log update
    await logTaskRegistry(task);
    await logEvent('SUCCESS', `Task completed by ${agent}`, {
      task_id: id,
      status: task.status,
      duration_ms,
    });

    res.json({
      task_id: id,
      status: task.status,
      message: 'Callback received and processed',
    });
  } catch (error) {
    await logEvent('ERROR', `Callback processing failed: ${error.message}`, {});
    res.status(500).json({ error: error.message });
  }
});

/**
 * Task statistics
 */
app.get('/stats', (req, res) => {
  const allTasks = Array.from(tasks.values());

  const stats = {
    total_tasks: allTasks.length,
    by_status: {
      pending: allTasks.filter((t) => t.status === 'pending').length,
      in_progress: allTasks.filter((t) => t.status === 'in_progress').length,
      completed: allTasks.filter((t) => t.status === 'completed').length,
      failed: allTasks.filter((t) => t.status === 'failed').length,
    },
    by_agent: {
      claude: allTasks.filter((t) => t.routed_to === 'claude').length,
      codex: allTasks.filter((t) => t.routed_to === 'codex').length,
      copilot: allTasks.filter((t) => t.routed_to === 'copilot').length,
    },
    by_priority: {
      low: allTasks.filter((t) => t.priority === 'low').length,
      normal: allTasks.filter((t) => t.priority === 'normal').length,
      high: allTasks.filter((t) => t.priority === 'high').length,
      urgent: allTasks.filter((t) => t.priority === 'urgent').length,
    },
  };

  res.json(stats);
});

/**
 * Start server
 */
async function startServer() {
  try {
    await fs.mkdir(path.dirname(CONFIG.logFile), { recursive: true });
  } catch (err) {
    console.error('Failed to create logs directory:', err);
  }

  app.listen(PORT, () => {
    console.log(`
╔═════════════════════════════════════════════════════╗
║  Task Router Server - Active                       ║
║                                                     ║
║  Listening on: http://localhost:${PORT}              ║
║                                                     ║
║  Endpoints:                                         ║
║  POST   /task              - Submit task            ║
║  GET    /task/{id}         - Task status            ║
║  GET    /tasks             - List tasks             ║
║  POST   /task/{id}/callback - Agent completion      ║
║  GET    /stats             - Task statistics        ║
║  GET    /health            - Health check           ║
║                                                     ║
║  Task Types:                                        ║
║  - code_generation, design_critique, validation    ║
║  - api_integration, documentation, etc.            ║
║                                                     ║
║  Logs: ${CONFIG.logFile}
╚═════════════════════════════════════════════════════╝
    `);

    console.log('Agent routing rules:');
    Object.entries(ROUTING_RULES).forEach(([type, rule]) => {
      console.log(`  ${type}: ${rule.primary} (fallback: ${rule.fallback.join(', ')})`);
    });
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[SHUTDOWN] Closing task router server...');
  process.exit(0);
});
