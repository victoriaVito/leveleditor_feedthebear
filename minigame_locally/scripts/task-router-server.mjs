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
