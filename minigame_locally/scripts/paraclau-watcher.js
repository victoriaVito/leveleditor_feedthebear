#!/usr/bin/env node

/**
 * Paraclau File Watcher
 * Monitors docs/PROJECT_MASTER_HANDOFF.md for changes and syncs via Zapier
 * Provides protection: no delete, no truncate, auto-backup
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Configuration
const config = {
  paraclauPath: path.join(process.cwd(), 'docs', 'PROJECT_MASTER_HANDOFF.md'),
  backupDir: path.join(process.cwd(), '.paraclau_backups'),
  logFile: path.join(process.env.HOME, '.paraclau_sync.log'),
  zapierWebhook: process.env.ZAPIER_PARACLAU_WEBHOOK,
  localWebhook: process.env.LOCAL_PARACLAU_WEBHOOK || 'http://localhost:3000/paraclau-update',
  checkInterval: 500, // ms between file checks
  protectionRules: {
    minimalLength: 100, // bytes
    requiredSections: ['## Current Status', '## Canonical Files'],
    cannotDelete: true,
    cannotTruncate: true,
  },
};

// State tracking
let lastHash = null;
let lastSize = null;
let lastModTime = null;
let watchTimer = null;

/**
 * Logging helper
 */
function log(level, message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level}] ${message}`;
  console.log(logMessage);
  
  try {
    fs.appendFileSync(config.logFile, logMessage + '\n');
  } catch (e) {
    // Silent fail if can't write log
  }
}

/**
 * Calculate content hash
 */
function hashContent(content) {
  return crypto.createHash('md5').update(content).digest('hex');
}

/**
 * Create timestamped backup
 */
function createBackup(content, reason = 'auto') {
  try {
    if (!fs.existsSync(config.backupDir)) {
      fs.mkdirSync(config.backupDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const backupPath = path.join(config.backupDir, `paraclau_${timestamp}_${reason}.md`);
    fs.writeFileSync(backupPath, content, 'utf8');
    
    log('INFO', `✅ Backup created: ${path.basename(backupPath)}`);
    return backupPath;
  } catch (error) {
    log('ERROR', `Failed to create backup: ${error.message}`);
    return null;
  }
}

/**
 * Validate paraclau integrity
 */
function validateParaclau(content) {
  // Check length
  if (!content || content.length < config.protectionRules.minimalLength) {
    throw new Error('Content too short or empty (protection rule)');
  }
  
  // Check required sections
  for (const section of config.protectionRules.requiredSections) {
    if (!content.includes(section)) {
      throw new Error(`Missing required section: ${section}`);
    }
  }
  
  return true;
}

/**
 * Notify Zapier webhook
 */
async function notifyZapier(event) {
  if (!config.zapierWebhook) {
    log('WARN', 'ZAPIER_PARACLAU_WEBHOOK not set, skipping Zapier notification');
    return false;
  }
  
  try {
    const fetch = (await import('node-fetch')).default;
    const response = await fetch(config.zapierWebhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...event,
        timestamp: new Date().toISOString(),
        source: 'local-watcher',
        watcherVersion: '1.0',
      }),
      timeout: 10000,
    });
    
    log('INFO', `✅ Zapier notified (status: ${response.status})`);
    return response.ok;
  } catch (error) {
    log('ERROR', `Failed to notify Zapier: ${error.message}`);
    return false;
  }
}

/**
 * Notify local webhook
 */
async function notifyLocal(event) {
  if (!config.localWebhook) {
    return false;
  }
  
  try {
    const fetch = (await import('node-fetch')).default;
    const response = await fetch(config.localWebhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
      timeout: 5000,
    });
    
    log('INFO', `✅ Local webhook notified (status: ${response.status})`);
    return response.ok;
  } catch (error) {
    log('WARN', `Local webhook unreachable: ${error.message}`);
    return false;
  }
}

/**
 * Recovery from backup
 */
function recoverFromBackup() {
  try {
    const backups = fs.readdirSync(config.backupDir)
      .filter(f => f.startsWith('paraclau_'))
      .sort()
      .reverse();
    
    if (backups.length === 0) {
      log('ERROR', 'No backups available for recovery');
      return false;
    }
    
    const latestBackup = path.join(config.backupDir, backups[0]);
    const recovered = fs.readFileSync(latestBackup, 'utf8');
    fs.writeFileSync(config.paraclauPath, recovered, 'utf8');
    
    log('WARN', `🔄 Recovered from backup: ${backups[0]}`);
    return true;
  } catch (error) {
    log('ERROR', `Recovery failed: ${error.message}`);
    return false;
  }
}

/**
 * Handle file change
 */
async function handleFileChange() {
  try {
    // Check if file exists
    if (!fs.existsSync(config.paraclauPath)) {
      log('ERROR', 'Paraclau file deleted! Attempting recovery...');
      if (recoverFromBackup()) {
        await notifyZapier({
          type: 'protection_triggered',
          error: 'File deleted',
          action: 'recovered_from_backup',
        });
      }
      return;
    }
    
    // Read file
    const content = fs.readFileSync(config.paraclauPath, 'utf8');
    const stats = fs.statSync(config.paraclauPath);
    const hash = hashContent(content);
    
    // Skip if no change
    if (hash === lastHash && stats.size === lastSize) {
      return;
    }
    
    // Check for truncation
    if (lastSize && stats.size < lastSize * 0.5) {
      log('WARN', `File size reduced drastically (${lastSize} → ${stats.size}). Possible truncation.`);
      if (config.protectionRules.cannotTruncate) {
        recoverFromBackup();
        await notifyZapier({
          type: 'protection_triggered',
          error: 'Truncation detected',
          action: 'recovered_from_backup',
          oldSize: lastSize,
          newSize: stats.size,
        });
        return;
      }
    }
    
    // Validate content
    validateParaclau(content);
    
    // Create backup
    const backupPath = createBackup(content, 'change');
    
    // Update state
    lastHash = hash;
    lastSize = stats.size;
    lastModTime = stats.mtime;
    
    // Notify integrations
    const event = {
      type: 'file_modified',
      path: 'docs/PROJECT_MASTER_HANDOFF.md',
      hash,
      size: stats.size,
      backupPath: path.basename(backupPath),
      contentLength: content.length,
      lastModified: stats.mtime.toISOString(),
    };
    
    await notifyZapier(event);
    await notifyLocal(event);
    
    log('INFO', `🔄 Paraclau synced (hash: ${hash.slice(0, 8)})`);
  } catch (error) {
    log('ERROR', `Change handler error: ${error.message}`);
    
    // Attempt recovery
    if (error.message.includes('protection')) {
      log('INFO', 'Attempting recovery...');
      recoverFromBackup();
      
      await notifyZapier({
        type: 'protection_triggered',
        error: error.message,
        action: 'recovered',
      });
    }
  }
}

/**
 * Start watching file
 */
function startWatcher() {
  log('INFO', '🔍 Starting paraclau watcher...');
  log('INFO', `📁 File: ${config.paraclauPath}`);
  log('INFO', `📦 Backups: ${config.backupDir}`);
  log('INFO', `🔐 Protection: delete=${config.protectionRules.cannotDelete}, truncate=${config.protectionRules.cannotTruncate}`);
  
  // Initial state
  if (fs.existsSync(config.paraclauPath)) {
    const content = fs.readFileSync(config.paraclauPath, 'utf8');
    const stats = fs.statSync(config.paraclauPath);
    lastHash = hashContent(content);
    lastSize = stats.size;
    lastModTime = stats.mtime;
    log('INFO', `✅ Initial hash: ${lastHash.slice(0, 8)}`);
  }
  
  // Watch file
  fs.watch(config.paraclauPath, { persistent: true }, () => {
    if (watchTimer) clearTimeout(watchTimer);
    watchTimer = setTimeout(handleFileChange, config.checkInterval);
  });
  
  // Also watch for additions (in case file is recreated)
  fs.watch(path.dirname(config.paraclauPath), { persistent: true }, (eventType, filename) => {
    if (filename === 'PROJECT_MASTER_HANDOFF.md' && eventType === 'rename') {
      log('WARN', 'Paraclau file was renamed/recreated');
      handleFileChange();
    }
  });
  
  log('INFO', '✅ Watcher ready');
}

/**
 * Graceful shutdown
 */
process.on('SIGINT', () => {
  log('INFO', '👋 Shutting down watcher...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  log('INFO', '👋 Terminating watcher...');
  process.exit(0);
});

// Start
log('INFO', '🚀 Paraclau Watcher v1.0');
startWatcher();
