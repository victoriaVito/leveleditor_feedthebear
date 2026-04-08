#!/usr/bin/env node
/**
 * Paraclau File Watcher - Enhanced with Zapier Integration
 * 
 * Watches docs/PROJECT_MASTER_HANDOFF.md for changes and triggers Zapier notifications.
 * Also parses action items and routes them intelligently.
 * 
 * Features:
 *   - File hash tracking (MD5) to detect real changes
 *   - Automatic backups before modifications
 *   - Content validation (required sections check)
 *   - Zapier webhook notification
 *   - Action item parsing and routing
 *   - Detailed logging
 * 
 * Usage:
 *   npm run watch:paraclau-zapier
 *   or: node scripts/paraclau-watcher-zapier.js
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import http from 'http';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

const CONFIG = {
  watchFile: path.join(PROJECT_ROOT, 'docs', 'PROJECT_MASTER_HANDOFF.md'),
  zapierWebhook: process.env.ZAPIER_PARACLAU_WATCH_WEBHOOK || '',
  localWebhook: process.env.LOCAL_PARACLAU_WEBHOOK || 'http://localhost:3000/webhook/zapier',
  checkInterval: 1000, // 1 second
  backupDir: path.join(PROJECT_ROOT, '.paraclau_backups'),
  logFile: path.join(process.env.HOME, '.paraclau_sync.log'),
  minFileSize: 100,
  requiredSections: [
    '## Current Status',
    '## Documentation Contract',
    '## Pending publish checks',
  ],
};

// State tracking
let lastHash = null;
let isProcessing = false;

/**
 * Calculate MD5 hash of file content
 */
function calculateHash(content) {
  return crypto.createHash('md5').update(content).digest('hex');
}

/**
 * Log events to file and console
 */
function logEvent(level, message, data = {}) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    ...data,
  };

  const logLine = JSON.stringify(logEntry) + '\n';

  // Write to file
  fs.appendFileSync(CONFIG.logFile, logLine, 'utf8');

  // Write to console
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
 * Create backup before significant changes
 */
async function createBackup(content) {
  try {
    if (!fs.existsSync(CONFIG.backupDir)) {
      fs.mkdirSync(CONFIG.backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(CONFIG.backupDir, `paraclau_${timestamp}.md`);
    fs.writeFileSync(backupPath, content, 'utf8');

    logEvent('INFO', `Backup created`, { path: backupPath, size: content.length });
    return backupPath;
  } catch (error) {
    logEvent('ERROR', `Backup failed: ${error.message}`, {});
    throw error;
  }
}

/**
 * Validate paraclau content
 */
function validateContent(content) {
  const issues = [];

  // Check minimum size
  if (content.length < CONFIG.minFileSize) {
    issues.push(`File size (${content.length}) below minimum (${CONFIG.minFileSize})`);
  }

  // Check required sections
  for (const section of CONFIG.requiredSections) {
    if (!content.includes(section)) {
      issues.push(`Missing required section: ${section}`);
    }
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

/**
 * Parse action items from changed content
 */
function parseActionItems(content) {
  const actionItems = [];
  const actionRegex = /- \[ ?\] ([^:\n]+):\s*([^\n]+)/g;

  let match;
  while ((match = actionRegex.exec(content)) !== null) {
    const [, agent, action] = match;
    actionItems.push({
      agent: agent.trim(),
      action: action.trim(),
      status: 'pending',
    });
  }

  return actionItems;
}

/**
 * Extract changed sections from diff
 */
function extractChangedSections(oldContent, newContent) {
  const oldLines = oldContent.split('\n');
  const newLines = newContent.split('\n');
  const changedSections = [];

  // Simple diff: find lines that changed
  const maxLength = Math.max(oldLines.length, newLines.length);
  let currentSection = null;

  for (let i = 0; i < maxLength; i++) {
    const oldLine = oldLines[i] || '';
    const newLine = newLines[i] || '';

    if (oldLine !== newLine) {
      // Check if this is a section header
      if (newLine.startsWith('#')) {
        currentSection = newLine.replace(/^#+\s*/, '');
      }

      if (currentSection) {
        changedSections.push({
          section: currentSection,
          line_number: i + 1,
          old_content: oldLine,
          new_content: newLine,
        });
      }
    }
  }

  return changedSections;
}

/**
 * Send webhook notification to Zapier
 */
async function notifyZapier(payload) {
  return new Promise((resolve, reject) => {
    const url = new URL(CONFIG.zapierWebhook);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(JSON.stringify(payload)),
      },
    };

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          logEvent('SUCCESS', `Zapier webhook sent`, { status: res.statusCode });
          resolve({ success: true, status: res.statusCode });
        } else {
          logEvent('WARN', `Zapier webhook response`, { status: res.statusCode, body: data });
          reject(new Error(`HTTP ${res.statusCode}`));
        }
      });
    });

    req.on('error', (error) => {
      logEvent('ERROR', `Zapier webhook failed: ${error.message}`, {});
      reject(error);
    });

    req.write(JSON.stringify(payload));
    req.end();
  });
}

/**
 * Send webhook notification to local server
 */
async function notifyLocal(payload) {
  return new Promise((resolve, reject) => {
    const url = new URL(CONFIG.localWebhook);
    const options = {
      hostname: url.hostname,
      port: url.port || 3000,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(JSON.stringify(payload)),
      },
    };

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          logEvent('SUCCESS', `Local webhook sent`, { status: res.statusCode });
          resolve({ success: true, status: res.statusCode });
        } else {
          logEvent('WARN', `Local webhook response`, { status: res.statusCode });
          reject(new Error(`HTTP ${res.statusCode}`));
        }
      });
    });

    req.on('error', (error) => {
      logEvent('WARN', `Local webhook not available: ${error.message}`, {});
      // Don't reject - local webhook is optional
      resolve({ success: false, reason: error.message });
    });

    req.write(JSON.stringify(payload));
    req.end();
  });
}

/**
 * Process file change
 */
async function processFileChange(oldContent, newContent) {
  if (isProcessing) {
    logEvent('WARN', 'Already processing a change, skipping', {});
    return;
  }

  isProcessing = true;

  try {
    // Validate content
    const validation = validateContent(newContent);
    if (!validation.valid) {
      logEvent('ERROR', 'Content validation failed', { issues: validation.issues });

      // Restore from backup if size dropped significantly
      if (newContent.length < oldContent.length * 0.5) {
        logEvent('ERROR', 'Content truncated >50%, restoring backup', {});
        const backups = fs.readdirSync(CONFIG.backupDir).sort().reverse();
        if (backups.length > 0) {
          const latestBackup = path.join(CONFIG.backupDir, backups[0]);
          const restoredContent = fs.readFileSync(latestBackup, 'utf8');
          fs.writeFileSync(CONFIG.watchFile, restoredContent, 'utf8');
          logEvent('SUCCESS', 'Content restored from backup', { source: backups[0] });
        }
      }

      return;
    }

    // Create backup of old content
    await createBackup(oldContent);

    // Extract changed sections
    const changedSections = extractChangedSections(oldContent, newContent);
    const actionItems = parseActionItems(newContent);

    // Prepare Zapier payload
    const payload = {
      event: 'paraclau_file_changed',
      timestamp: new Date().toISOString(),
      task_id: `paraclau-${Date.now()}`,
      file: 'docs/PROJECT_MASTER_HANDOFF.md',
      file_size: newContent.length,
      sections_changed: changedSections.slice(0, 10), // Limit to first 10
      action_items: actionItems,
      change_summary: {
        total_sections_changed: changedSections.length,
        action_items_found: actionItems.length,
        agents_involved: [...new Set(actionItems.map((a) => a.agent))],
      },
    };

    logEvent('INFO', `File changed: ${changedSections.length} sections, ${actionItems.length} actions`, {
      size: newContent.length,
    });

    // Send notifications
    try {
      if (CONFIG.zapierWebhook) {
        await notifyZapier(payload);
      }
    } catch (error) {
      logEvent('WARN', 'Zapier notification skipped', { reason: error.message });
    }

    // Always try local webhook
    await notifyLocal(payload);

    logEvent('SUCCESS', 'File change processed', { task_id: payload.task_id });
  } catch (error) {
    logEvent('ERROR', `Processing failed: ${error.message}`, { stack: error.stack });
  } finally {
    isProcessing = false;
  }
}

/**
 * Main watch loop
 */
function startWatcher() {
  logEvent('INFO', 'Paraclau watcher started', { file: CONFIG.watchFile, interval: CONFIG.checkInterval });

  // Initial hash
  try {
    const initialContent = fs.readFileSync(CONFIG.watchFile, 'utf8');
    lastHash = calculateHash(initialContent);
    logEvent('INFO', 'Initial file hash computed', { hash: lastHash });
  } catch (error) {
    logEvent('ERROR', `Failed to read initial file: ${error.message}`, {});
    return;
  }

  let lastContent = fs.readFileSync(CONFIG.watchFile, 'utf8');

  // Watch loop
  const interval = setInterval(() => {
    try {
      const currentContent = fs.readFileSync(CONFIG.watchFile, 'utf8');
      const currentHash = calculateHash(currentContent);

      if (currentHash !== lastHash) {
        logEvent('INFO', 'File change detected', { old_hash: lastHash, new_hash: currentHash });
        processFileChange(lastContent, currentContent);

        lastHash = currentHash;
        lastContent = currentContent;
      }
    } catch (error) {
      logEvent('ERROR', `Watch loop error: ${error.message}`, {});
    }
  }, CONFIG.checkInterval);

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n[SHUTDOWN] Closing paraclau watcher...');
    clearInterval(interval);
    process.exit(0);
  });
}

// Start
console.log(`
╔═════════════════════════════════════════════════════╗
║  Paraclau Watcher - Active                         ║
║                                                     ║
║  Watching:  ${CONFIG.watchFile}
║  Interval:  ${CONFIG.checkInterval}ms                          ║
║  Backups:   ${CONFIG.backupDir}
║  Logs:      ${CONFIG.logFile}
╚═════════════════════════════════════════════════════╝
`);

startWatcher();
