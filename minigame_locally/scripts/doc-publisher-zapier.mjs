#!/usr/bin/env node
/**
 * Documentation Publisher - Zapier Integration
 * 
 * Watches documentation files for changes and publishes to:
 * - Confluence (via REST API)
 * - Google Sheets (specified ranges)
 * - GitHub Wiki (if enabled)
 * 
 * Triggers:
 *   - memoria.md changes
 *   - Design docs with [publish: true] frontmatter
 *   - PROCEDURAL_ML_DESIGN.md changes
 * 
 * Workflow:
 *   1. Detect file change
 *   2. Claude formats to Confluence HTML
 *   3. Codex adds macros/formatting
 *   4. Publish to target(s)
 *   5. Notify via Slack
 * 
 * Usage:
 *   npm run publish:docs-zapier
 *   or: node scripts/doc-publisher-zapier.mjs
 */

import fs from 'fs/promises';
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
  docsDir: PROJECT_ROOT,
  watchFiles: [
    'memoria.md',
    'FEED_THE_BEAR_GDD.md',
    'PROCEDURAL_ML_DESIGN.md',
    'docs/LEVEL_DESIGN.md',
    'AGENTS.md',
    'AGENT_CHEATSHEET.md',
  ],
  zapierWebhook: process.env.ZAPIER_DOC_PUBLISH_WEBHOOK || '',
  logFile: path.join(PROJECT_ROOT, 'logs', 'doc-publisher.log'),
  checkInterval: 5000, // 5 seconds
};

// Track file hashes
const fileHashes = new Map();

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
 * Calculate file hash
 */
function calculateHash(content) {
  return crypto.createHash('md5').update(content).digest('hex');
}

/**
 * Parse YAML frontmatter from markdown
 */
function parseFrontmatter(content) {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    return { metadata: {}, content: content };
  }

  const frontmatter = match[1];
  const body = content.slice(match[0].length);

  // Simple YAML parsing
  const metadata = {};
  const lines = frontmatter.split('\n');

  for (const line of lines) {
    const [key, ...valueParts] = line.split(':');
    if (key && valueParts.length > 0) {
      let value = valueParts.join(':').trim();

      // Parse arrays: "- item1\n- item2"
      if (value.startsWith('[') && value.endsWith(']')) {
        value = value.slice(1, -1).split(',').map((v) => v.trim());
      }
      // Parse booleans
      else if (value === 'true') value = true;
      else if (value === 'false') value = false;

      metadata[key.trim()] = value;
    }
  }

  return { metadata, content: body };
}

/**
 * Build publish targets from metadata
 */
function getPublishTargets(metadata) {
  const targets = [];

  if (!metadata.publish_targets) {
    return targets;
  }

  const rawTargets = Array.isArray(metadata.publish_targets)
    ? metadata.publish_targets
    : [metadata.publish_targets];

  for (const target of rawTargets) {
    const t = target.toLowerCase().trim();
    if (['confluence', 'sheets', 'github-wiki', 'notion'].includes(t)) {
      targets.push(t);
    }
  }

  return targets;
}

/**
 * Send to Zapier for processing
 */
async function sendToZapier(payload) {
  return new Promise((resolve, reject) => {
    if (!CONFIG.zapierWebhook) {
      resolve({ skipped: true, reason: 'No webhook configured' });
      return;
    }

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
          reject(new Error(`HTTP ${res.statusCode}`));
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

/**
 * Process document change
 */
async function processDocChange(filename) {
  try {
    const filePath = path.join(CONFIG.docsDir, filename);
    const content = await fs.readFile(filePath, 'utf8');
    const hash = calculateHash(content);

    // Check if file actually changed
    const previousHash = fileHashes.get(filename);
    if (previousHash === hash) {
      return; // No actual change
    }

    fileHashes.set(filename, hash);

    // Parse metadata
    const { metadata, content: body } = parseFrontmatter(content);
    const publishTargets = getPublishTargets(metadata);

    // Always publish memoria.md and design docs
    if (filename === 'memoria.md' || filename.includes('DESIGN') || filename.includes('PROCEDURAL')) {
      if (!publishTargets.includes('confluence')) {
        publishTargets.push('confluence');
      }
    }

    if (publishTargets.length === 0) {
      await logEvent('INFO', `No publish targets for ${filename}`, {});
      return;
    }

    await logEvent('INFO', `Publishing ${filename}`, {
      targets: publishTargets,
      size: content.length,
    });

    // Prepare Zapier payload
    const taskId = `DOC-${Date.now()}`;
    const payload = {
      event: 'doc_changed',
      timestamp: new Date().toISOString(),
      task_id: taskId,
      file: filename,
      file_path: filePath,
      content_hash: hash,
      frontmatter: metadata,
      content_length: content.length,
      content_preview: body.slice(0, 500),
      publish_targets: publishTargets,
      source: 'local-file-watcher',
    };

    // Send to Zapier
    try {
      await sendToZapier(payload);
      await logEvent('SUCCESS', `Document published`, {
        task_id: taskId,
        file: filename,
        targets: publishTargets,
      });
    } catch (error) {
      await logEvent('ERROR', `Zapier publish failed: ${error.message}`, { file: filename });
    }
  } catch (error) {
    await logEvent('ERROR', `Failed to process ${filename}: ${error.message}`, {});
  }
}

/**
 * Check all watched files for changes
 */
async function checkForChanges() {
  for (const filename of CONFIG.watchFiles) {
    try {
      const filePath = path.join(CONFIG.docsDir, filename);

      // Check if file exists
      try {
        await fs.access(filePath);
      } catch {
        continue; // File not found
      }

      // Process if changed
      const content = await fs.readFile(filePath, 'utf8');
      const hash = calculateHash(content);
      const previousHash = fileHashes.get(filename);

      if (previousHash !== hash) {
        await processDocChange(filename);
      }

      // Ensure hash is tracked
      fileHashes.set(filename, hash);
    } catch (error) {
      await logEvent('WARN', `Error checking ${filename}: ${error.message}`, {});
    }
  }
}

/**
 * Start watcher
 */
async function startWatcher() {
  // Ensure logs directory exists
  try {
    await fs.mkdir(path.dirname(CONFIG.logFile), { recursive: true });
  } catch (err) {
    console.error('Failed to create logs directory:', err);
  }

  await logEvent('INFO', 'Documentation publisher started', {
    watch_dir: CONFIG.docsDir,
    files: CONFIG.watchFiles,
    interval: CONFIG.checkInterval,
  });

  console.log(`
╔═════════════════════════════════════════════════════╗
║  Documentation Publisher - Active                  ║
║                                                     ║
║  Watch dir: ${CONFIG.docsDir}
║  Interval: ${CONFIG.checkInterval}ms                          ║
║  Log: ${CONFIG.logFile}
║                                                     ║
║  Watching:                                          ║
║  - memoria.md                                       ║
║  - FEED_THE_BEAR_GDD.md                             ║
║  - PROCEDURAL_ML_DESIGN.md                          ║
║  - docs/LEVEL_DESIGN.md                             ║
║  - AGENTS.md                                        ║
║  - AGENT_CHEATSHEET.md                              ║
║                                                     ║
║  On change → Zapier → Claude format → Confluence   ║
╚═════════════════════════════════════════════════════╝
  `);

  // Initial scan
  await checkForChanges();

  // Polling loop
  const interval = setInterval(() => {
    checkForChanges().catch((err) => {
      logEvent('ERROR', `Check loop error: ${err.message}`, {});
    });
  }, CONFIG.checkInterval);

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n[SHUTDOWN] Closing documentation publisher...');
    clearInterval(interval);
    process.exit(0);
  });
}

// Start
startWatcher();
