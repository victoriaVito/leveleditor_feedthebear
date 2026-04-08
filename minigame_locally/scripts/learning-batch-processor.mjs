#!/usr/bin/env node
/**
 * Learning Batch Processor - Procedural ML Pipeline
 * 
 * Polls Google Sheets for learning entries (approved/rejected levels).
 * Batches entries and sends to Claude for analysis + ML recommendations.
 * Triggers Codex to apply ML config updates.
 * 
 * Workflow:
 *   1. Query Google Sheets for learning entries
 *   2. Batch 5+ entries for efficiency
 *   3. Send to Claude for pattern analysis
 *   4. Codex updates ML configs based on recommendations
 *   5. Log improvements to PROCEDURAL_ML_DESIGN.md
 * 
 * Usage:
 *   npm run process:learning-batch
 *   or: node scripts/learning-batch-processor.mjs
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import http from 'http';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

const CONFIG = {
  pollingInterval: 60000, // 1 minute
  batchSize: 5,
  zapierWebhook: process.env.ZAPIER_LEARNING_BATCH_WEBHOOK || '',
  claudeCallback: process.env.ZAPIER_CLAUDE_CALLBACK || '',
  codexCallback: process.env.ZAPIER_CODEX_CALLBACK || '',
  logFile: path.join(PROJECT_ROOT, 'logs', 'learning-batch-processor.log'),
};

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
 * Calculate statistical summary from batch
 */
function calculateStatistics(entries) {
  const tagCounts = {};
  let totalRating = 0;
  let ratingCount = 0;

  for (const entry of entries) {
    const rating = entry.player_rating || 0;
    if (rating > 0) {
      totalRating += rating;
      ratingCount++;
    }

    const tags = entry.tags || [];
    for (const tag of tags) {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    }
  }

  // Sort tags by frequency
  const topReasons = Object.entries(tagCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([reason, count]) => ({
      reason,
      count,
      pct: ((count / entries.length) * 100).toFixed(1),
    }));

  const approvedCount = entries.filter((e) => e.status === 'approved').length;
  const rejectedCount = entries.filter((e) => e.status === 'rejected').length;

  return {
    total_entries: entries.length,
    approved_count: approvedCount,
    rejected_count: rejectedCount,
    approval_rate: ((approvedCount / entries.length) * 100).toFixed(1),
    avg_rating: ratingCount > 0 ? (totalRating / ratingCount).toFixed(1) : 0,
    top_rejection_reasons: topReasons,
  };
}

/**
 * Extract learning data from mock storage
 * In production, this would query Google Sheets API
 */
async function fetchLearningData() {
  try {
    const learningFile = path.join(PROJECT_ROOT, 'learned_patterns.json');

    // Try to read existing learning data
    let allEntries = [];
    try {
      const content = await fs.readFile(learningFile, 'utf8');
      const data = JSON.parse(content);
      allEntries = Array.isArray(data) ? data : data.entries || [];
    } catch (err) {
      // File may not exist yet
      allEntries = [];
    }

    // Filter entries that haven't been processed yet
    const unprocessedEntries = allEntries
      .filter((e) => e.status && (e.status === 'approved' || e.status === 'rejected'))
      .filter((e) => !e.batch_processed)
      .slice(0, CONFIG.batchSize);

    return unprocessedEntries;
  } catch (error) {
    await logEvent('ERROR', `Failed to fetch learning data: ${error.message}`, {});
    return [];
  }
}

/**
 * Mark entries as processed
 */
async function markEntriesAsProcessed(batchId, entryIds) {
  try {
    const learningFile = path.join(PROJECT_ROOT, 'learned_patterns.json');

    const content = await fs.readFile(learningFile, 'utf8');
    const data = JSON.parse(content);
    const entries = Array.isArray(data) ? data : data.entries || [];

    // Mark entries as processed
    for (const entry of entries) {
      if (entryIds.includes(entry.id)) {
        entry.batch_processed = true;
        entry.batch_id = batchId;
        entry.processed_at = new Date().toISOString();
      }
    }

    await fs.writeFile(learningFile, JSON.stringify(entries, null, 2), 'utf8');
    await logEvent('INFO', `Marked ${entryIds.length} entries as processed`, { batch_id: batchId });
  } catch (error) {
    await logEvent('WARN', `Failed to mark entries as processed: ${error.message}`, {});
  }
}

/**
 * Send learning batch to Zapier for Claude analysis
 */
async function sendToZapier(payload) {
  return new Promise((resolve, reject) => {
    const url = new URL(CONFIG.zapierWebhook);
    const data = JSON.stringify(payload);

    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    };

    const req = http.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ success: true, status: res.statusCode });
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${responseData}`));
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

/**
 * Process learning batch
 */
async function processBatch() {
  try {
    const entries = await fetchLearningData();

    if (entries.length === 0) {
      await logEvent('INFO', 'No learning entries to process', { batch_size: CONFIG.batchSize });
      return;
    }

    await logEvent('INFO', `Processing batch of ${entries.length} entries`, {});

    // Calculate statistics
    const stats = calculateStatistics(entries);

    // Prepare Zapier payload
    const batchId = `BATCH-${Date.now()}`;
    const payload = {
      event: 'learning_batch_ready',
      timestamp: new Date().toISOString(),
      batch_id: batchId,
      entry_count: entries.length,
      approved_count: stats.approved_count,
      rejected_count: stats.rejected_count,
      entries: entries.map((e) => ({
        id: e.id,
        status: e.status,
        tags: e.tags || [],
        feedback_text: e.feedback_text || '',
        player_rating: e.player_rating || 0,
        generation_params: e.generation_params || {},
      })),
      statistical_summary: stats,
      claude_analysis_hook: CONFIG.claudeCallback,
      codex_callback_hook: CONFIG.codexCallback,
    };

    // Send to Zapier
    if (CONFIG.zapierWebhook) {
      try {
        await sendToZapier(payload);
        await logEvent('SUCCESS', `Batch sent to Zapier`, { batch_id: batchId, entries: entries.length });

        // Mark entries as processed
        await markEntriesAsProcessed(batchId, entries.map((e) => e.id));
      } catch (error) {
        await logEvent('ERROR', `Failed to send batch to Zapier: ${error.message}`, {});
      }
    } else {
      await logEvent('WARN', 'No Zapier webhook configured, skipping batch send', {});
    }

    // Log statistics
    console.log('\n📊 Learning Batch Statistics:');
    console.log(`   Entries: ${stats.total_entries} (${stats.approved_count} approved, ${stats.rejected_count} rejected)`);
    console.log(`   Approval Rate: ${stats.approval_rate}%`);
    console.log(`   Avg Rating: ${stats.avg_rating}/5`);
    console.log(`   Top Rejection Reasons:`);
    stats.top_rejection_reasons.forEach((r, i) => {
      console.log(`     ${i + 1}. ${r.reason}: ${r.count} (${r.pct}%)`);
    });
  } catch (error) {
    await logEvent('ERROR', `Batch processing failed: ${error.message}`, {});
  }
}

/**
 * Start polling loop
 */
async function startPoller() {
  await logEvent('INFO', 'Learning batch processor started', {
    interval: CONFIG.pollingInterval,
    batch_size: CONFIG.batchSize,
  });

  console.log(`
╔═════════════════════════════════════════════════════╗
║  Learning Batch Processor - Active                 ║
║                                                     ║
║  Polling interval: ${CONFIG.pollingInterval}ms              ║
║  Batch size: ${CONFIG.batchSize}                          ║
║  Log: ${CONFIG.logFile}
║                                                     ║
║  Workflow:                                          ║
║  1. Poll for learning entries                      ║
║  2. Calculate statistics                           ║
║  3. Send to Zapier → Claude                        ║
║  4. Claude analyzes patterns                       ║
║  5. Codex updates ML configs                       ║
╚═════════════════════════════════════════════════════╝
  `);

  // Initial run
  await processBatch();

  // Polling loop
  const interval = setInterval(() => {
    processBatch().catch((err) => {
      logEvent('ERROR', `Polling error: ${err.message}`, {});
    });
  }, CONFIG.pollingInterval);

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n[SHUTDOWN] Closing learning batch processor...');
    clearInterval(interval);
    process.exit(0);
  });
}

// Ensure logs directory exists
(async () => {
  try {
    const logsDir = path.dirname(CONFIG.logFile);
    await fs.mkdir(logsDir, { recursive: true });
  } catch (err) {
    console.error('Failed to create logs directory:', err);
  }

  startPoller();
})();
