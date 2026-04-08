#!/usr/bin/env node
/**
 * Zapier Webhook Receiver - Central Hub
 * 
 * Receives all events from Zapier and routes them to appropriate handlers.
 * Endpoints:
 *   POST /webhook/zapier     - Main webhook receiver
 *   GET  /health             - Health check
 *   GET  /task-status/{id}   - Query task status
 * 
 * Usage:
 *   npm run start:zapier-webhook
 *   or: node scripts/zapier-webhook-receiver.mjs
 */

import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { promisify } from 'util';
import { exec } from 'child_process';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

const app = express();
const PORT = process.env.ZAPIER_WEBHOOK_RECEIVER_PORT || 3000;

// Task tracking in-memory (would use DB in production)
const taskRegistry = new Map();

// Logging utilities
const LOG_DIR = path.join(PROJECT_ROOT, 'logs');

async function ensureLogDir() {
  try {
    await fs.mkdir(LOG_DIR, { recursive: true });
  } catch (err) {
    console.error('Failed to create log directory:', err);
  }
}

function getLogFile(eventType) {
  return path.join(LOG_DIR, `zapier-${eventType.replace(/\s+/g, '-')}.log`);
}

async function logEvent(eventType, taskId, message, data = {}) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    event: eventType,
    task_id: taskId,
    message,
    data,
  };

  const logFile = getLogFile(eventType);
  const logLine = JSON.stringify(logEntry) + '\n';

  try {
    await fs.appendFile(logFile, logLine);
  } catch (err) {
    console.error(`Failed to write log for ${eventType}:`, err);
  }

  console.log(`[${timestamp}] ${eventType} - ${taskId}: ${message}`);
}

// Handler functions for each flow
async function handleParaclauSync(payload) {
  const { task_id } = payload;
  await logEvent('paraclau_sync', task_id, 'Received docs/PROJECT_MASTER_HANDOFF.md change notification', payload);

  try {
    // Step 1: Parse changed sections
    const changedSections = payload.sections_changed || [];
    if (changedSections.length === 0) {
      await logEvent('paraclau_sync', task_id, 'No actionable sections changed', {});
      return { status: 'no_action_needed' };
    }

    // Step 2: Trigger Claude analysis (would be async webhook in real system)
    await logEvent('paraclau_sync', task_id, 'Would trigger Claude analysis', {
      sections: changedSections.length,
    });

    // Step 3: Log for manual/batch processing
    taskRegistry.set(task_id, {
      type: 'paraclau_sync',
      status: 'in_progress',
      created_at: new Date(),
      payload,
    });

    return { status: 'processing', next_step: 'claude_analysis' };
  } catch (error) {
    await logEvent('paraclau_sync', task_id, `ERROR: ${error.message}`, { error: error.stack });
    throw error;
  }
}

async function handleTaskRouting(payload) {
  const { task_id, type, priority, required_skills } = payload;
  await logEvent('task_routing', task_id, `Routing task type: ${type}`, { priority, skills: required_skills });

  try {
    // Task routing logic
    let routed_to = 'copilot'; // Default

    const typeToAgent = {
      code_generation: 'codex',
      design_critique: 'claude',
      validation: 'copilot',
      level_validation: 'copilot',
      api_integration: 'codex',
      documentation: 'claude',
      strategic_planning: 'claude', // with codex + copilot as fallbacks
    };

    routed_to = typeToAgent[type] || 'copilot';

    await logEvent('task_routing', task_id, `Routed to: ${routed_to}`, { original_type: type });

    taskRegistry.set(task_id, {
      type: 'task_routing',
      status: 'routed',
      routed_to,
      priority,
      created_at: new Date(),
      payload,
    });

    return { status: 'routed', routed_to, task_id };
  } catch (error) {
    await logEvent('task_routing', task_id, `ERROR: ${error.message}`, { error: error.stack });
    throw error;
  }
}

async function handleLearningPipeline(payload) {
  const { batch_id, entry_count, approved_count, rejected_count } = payload;
  await logEvent('learning_pipeline', batch_id, `Learning batch received`, {
    entries: entry_count,
    approved: approved_count,
    rejected: rejected_count,
  });

  try {
    // Log statistical summary
    const summary = payload.statistical_summary || {};
    await logEvent('learning_pipeline', batch_id, 'Processing learning data', {
      top_reasons: summary.top_rejection_reasons,
    });

    taskRegistry.set(batch_id, {
      type: 'learning_pipeline',
      status: 'received',
      entry_count,
      created_at: new Date(),
      payload,
    });

    return { status: 'received', batch_id, entries_to_process: entry_count };
  } catch (error) {
    await logEvent('learning_pipeline', batch_id, `ERROR: ${error.message}`, { error: error.stack });
    throw error;
  }
}

async function handleDocPublish(payload) {
  const { task_id, file, publish_targets } = payload;
  await logEvent('doc_publish', task_id, `Document publish triggered: ${file}`, {
    targets: publish_targets,
  });

  try {
    taskRegistry.set(task_id, {
      type: 'doc_publish',
      status: 'received',
      file,
      targets: publish_targets,
      created_at: new Date(),
      payload,
    });

    return { status: 'queued', task_id, file };
  } catch (error) {
    await logEvent('doc_publish', task_id, `ERROR: ${error.message}`, { error: error.stack });
    throw error;
  }
}

async function handleHandoff(payload) {
  const { task_id, from_agent, to_agent } = payload;
  await logEvent('handoff', task_id, `Handoff: ${from_agent} → ${to_agent}`, {
    reason: payload.reason,
  });

  try {
    taskRegistry.set(task_id, {
      type: 'handoff',
      status: 'in_progress',
      from_agent,
      to_agent,
      created_at: new Date(),
      payload,
    });

    return { status: 'handoff_initiated', from: from_agent, to: to_agent };
  } catch (error) {
    await logEvent('handoff', task_id, `ERROR: ${error.message}`, { error: error.stack });
    throw error;
  }
}

// Express middleware & routes
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    tasks_tracked: taskRegistry.size,
  });
});

// Task status query
app.get('/task-status/:taskId', (req, res) => {
  const { taskId } = req.params;
  const task = taskRegistry.get(taskId);

  if (!task) {
    return res.status(404).json({ error: 'Task not found', task_id: taskId });
  }

  res.json({
    task_id: taskId,
    ...task,
  });
});

// Main webhook endpoint
app.post('/webhook/zapier', async (req, res) => {
  const { event, task_id, timestamp } = req.body;

  if (!event) {
    return res.status(400).json({ error: 'Missing event field' });
  }

  const taskId = task_id || `${event}-${Date.now()}`;

  try {
    let result;

    switch (event) {
      case 'paraclau_file_changed':
        result = await handleParaclauSync(req.body);
        break;
      case 'task_received':
        result = await handleTaskRouting(req.body);
        break;
      case 'learning_batch_ready':
        result = await handleLearningPipeline(req.body);
        break;
      case 'doc_changed':
        result = await handleDocPublish(req.body);
        break;
      case 'handoff_request':
        result = await handleHandoff(req.body);
        break;
      default:
        await logEvent('unknown_event', taskId, `Unknown event type: ${event}`, {});
        return res.status(400).json({ error: `Unknown event: ${event}` });
    }

    res.json({
      status: 'accepted',
      task_id: taskId,
      event,
      result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error(`[ERROR] Webhook processing failed:`, error);
    res.status(500).json({
      error: 'Processing failed',
      task_id: taskId,
      message: error.message,
    });
  }
});

// Start server
async function startServer() {
  await ensureLogDir();

  app.listen(PORT, () => {
    console.log(`
╔═════════════════════════════════════════════════════╗
║  Zapier Webhook Receiver - Active                  ║
║                                                     ║
║  Listening on: http://localhost:${PORT}              ║
║  Endpoint:     /webhook/zapier (POST)               ║
║  Health:       /health (GET)                        ║
║  Status:       /task-status/{id} (GET)              ║
║                                                     ║
║  Set in Zapier:                                     ║
║  ${process.env.ZAPIER_WEBHOOK_RECEIVER_URL || `http://localhost:${PORT}/webhook/zapier`}  ║
╚═════════════════════════════════════════════════════╝
    `);

    console.log('Supported events:');
    console.log('  - paraclau_file_changed');
    console.log('  - task_received');
    console.log('  - learning_batch_ready');
    console.log('  - doc_changed');
    console.log('  - handoff_request');
    console.log(`\nLogs: ${LOG_DIR}/`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[SHUTDOWN] Closing webhook receiver...');
  process.exit(0);
});
