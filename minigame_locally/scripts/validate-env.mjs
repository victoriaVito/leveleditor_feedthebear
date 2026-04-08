#!/usr/bin/env node
/**
 * Environment Validator - Check that all required variables are configured
 * 
 * Usage:
 *   node scripts/validate-env.mjs
 *   npm run validate:env (if added to package.json)
 */

import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

const DEFAULT_PORTS = {
  ZAPIER_WEBHOOK_RECEIVER_PORT: 3000,
  TASK_ROUTER_PORT: 3001,
};

const REQUIRED_VARS_BY_PROFILE = {
  local: [
    'SPREADSHEET_ID',
  ],
  full: [
    'SPREADSHEET_ID',
    'ZAPIER_PARACLAU_WATCH_WEBHOOK',
    'ZAPIER_TASK_ROUTING_WEBHOOK',
    'ZAPIER_LEARNING_BATCH_WEBHOOK',
    'ZAPIER_DOC_PUBLISH_WEBHOOK',
    'ZAPIER_HANDOFF_WEBHOOK',
    'ZAPIER_CLAUDE_CALLBACK',
    'ZAPIER_CODEX_CALLBACK',
    'ZAPIER_COPILOT_CALLBACK',
    'ZAPIER_CLAUDE_WEBHOOK',
    'ZAPIER_CODEX_WEBHOOK',
    'ZAPIER_COPILOT_WEBHOOK',
  ],
};

// Optional but important variables
const OPTIONAL_VARS = [
  'ANTHROPIC_API_KEY',
  'OPENAI_API_KEY',
  'GOOGLE_API_KEY',
  'GITHUB_TOKEN',
  'KINGFLUENCE_API_TOKEN',
  'SLACK_WEBHOOK_ALERTS',
];

// Internal variables (set by system)
const INTERNAL_VARS = [
  'TASK_ROUTER_PORT',
  'LOG_LEVEL',
  'DEBUG',
];

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

function log(color, ...args) {
  console.log(`${color}${args.join(' ')}${colors.reset}`);
}

function checkFileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

function validateWebhookUrl(url) {
  if (!url) return { valid: false, reason: 'empty' };
  if (!url.startsWith('http')) return { valid: false, reason: 'invalid protocol' };
  try {
    new URL(url);
    return { valid: true };
  } catch {
    return { valid: false, reason: 'invalid URL format' };
  }
}

function getProfileArg() {
  const profileFlagIndex = process.argv.indexOf('--profile');
  if (profileFlagIndex !== -1) {
    return process.argv[profileFlagIndex + 1] || 'local';
  }
  return 'local';
}

function main() {
  console.clear();

  const profile = getProfileArg();
  if (!REQUIRED_VARS_BY_PROFILE[profile]) {
    log(colors.red, `Unknown validation profile: ${profile}`);
    log(colors.yellow, 'Supported profiles: local, full');
    process.exit(1);
  }
  const requiredVars = REQUIRED_VARS_BY_PROFILE[profile];

  log(colors.bold + colors.cyan, `
╔══════════════════════════════════════════════════════╗
║  Environment Validation                             ║
╚══════════════════════════════════════════════════════╝
  `);
  log(colors.cyan, `Profile: ${profile}`);

  let hasErrors = false;
  let hasWarnings = false;

  // 1. Check .env file exists
  const envPath = path.join(PROJECT_ROOT, '.env');
  const envExamplePath = path.join(PROJECT_ROOT, '.env.example');

  log(colors.cyan, '\n📋 Configuration Files');
  if (checkFileExists(envPath)) {
    log(colors.green, '  ✓ .env file exists');
  } else {
    log(colors.red, '  ✗ .env file NOT found');
    log(colors.yellow, `    Run: cp .env.example .env`);
    hasErrors = true;
  }

  if (checkFileExists(envExamplePath)) {
    log(colors.green, '  ✓ .env.example template exists');
  } else {
    log(colors.yellow, '  ⚠ .env.example not found (using defaults)');
  }

  // 2. Check required variables
  log(colors.cyan, '\n🔐 Required Variables');
  const missingRequired = [];

  for (const varName of requiredVars) {
    const value = process.env[varName];

    if (!value) {
      missingRequired.push(varName);
      log(colors.red, `  ✗ ${varName}`);
      hasErrors = true;
    } else if (varName.includes('WEBHOOK') && varName.includes('ZAPIER')) {
      // Validate webhook URLs
      const validation = validateWebhookUrl(value);
      if (validation.valid) {
        log(colors.green, `  ✓ ${varName} (${value.substring(0, 50)}...)`);
      } else {
        log(colors.red, `  ✗ ${varName} - ${validation.reason}`);
        hasErrors = true;
      }
    } else {
      log(colors.green, `  ✓ ${varName}`);
    }
  }

  // 3. Check optional variables
  log(colors.cyan, '\n⭐ Optional Variables');
  const missingOptional = [];

  for (const varName of OPTIONAL_VARS) {
    const value = process.env[varName];

    if (!value) {
      missingOptional.push(varName);
      log(colors.yellow, `  ⚠ ${varName} (not configured)`);
      hasWarnings = true;
    } else {
      log(colors.green, `  ✓ ${varName}`);
    }
  }

  // 4. Check internal variables
  log(colors.cyan, '\n⚙️  Internal Variables');
  for (const [varName, defaultPort] of Object.entries(DEFAULT_PORTS)) {
    const value = process.env[varName] || defaultPort;
    log(colors.green, `  ✓ ${varName} = ${value}`);
  }

  // 5. Check required directories
  log(colors.cyan, '\n📁 Required Directories');
  const requiredDirs = [
    { name: 'scripts', path: path.join(PROJECT_ROOT, 'scripts') },
    { name: 'logs', path: path.join(PROJECT_ROOT, 'logs') },
  ];

  for (const { name, path: dirPath } of requiredDirs) {
    if (checkFileExists(dirPath)) {
      log(colors.green, `  ✓ ${name}/`);
    } else {
      log(colors.yellow, `  ⚠ ${name}/ (will be created on first run)`);
    }
  }

  // 6. Check required scripts
  log(colors.cyan, '\n🔧 Required Scripts');
  const requiredScripts = [
    'zapier-webhook-receiver.mjs',
    'paraclau-watcher-zapier.js',
    'task-router-server.mjs',
    'learning-batch-processor.mjs',
    'doc-publisher-zapier.mjs',
  ];

  for (const script of requiredScripts) {
    const scriptPath = path.join(PROJECT_ROOT, 'scripts', script);
    if (checkFileExists(scriptPath)) {
      log(colors.green, `  ✓ ${script}`);
    } else {
      log(colors.red, `  ✗ ${script} NOT FOUND`);
      hasErrors = true;
    }
  }

  // 7. Summary
  log(colors.cyan, '\n═══════════════════════════════════════════════════════════');

  if (hasErrors) {
    log(colors.red, '\n❌ VALIDATION FAILED - Critical issues found');
    log(colors.yellow, '\nRequired actions:');
    if (!checkFileExists(envPath)) {
      log(colors.yellow, '  1. Create .env: cp .env.example .env');
    }
    log(colors.yellow, `  2. Fill in ${missingRequired.length} missing required variables in .env`);
    log(colors.yellow, `  3. Re-run: node scripts/validate-env.mjs --profile ${profile}`);
    process.exit(1);
  }

  if (hasWarnings) {
    log(colors.yellow, `\n⚠️  VALIDATION PASSED with ${missingOptional.length} warnings`);
    log(colors.yellow, '\nOptional configurations:');
    for (const varName of missingOptional) {
      log(colors.yellow, `  - ${varName}`);
    }
    log(colors.yellow, '\nYou can add these later for enhanced functionality.');
  } else {
    log(colors.green, '\n✅ VALIDATION PASSED - All required variables configured!');
  }

  log(colors.cyan, '\n═══════════════════════════════════════════════════════════');

  // Quick start guide
  log(colors.cyan, '\n🚀 Quick Start:');
  if (profile === 'local') {
    log(colors.green, '  npm run startup:zapier');
    log(colors.green, '  curl http://localhost:3000/health');
    log(colors.green, '  curl http://localhost:3001/health');
  } else {
    log(colors.green, '  npm run validate:env:full');
    log(colors.green, '  npm run startup:zapier');
  }

  log(colors.cyan, '\n📖 Documentation:');
  log(colors.green, '  ZAPIER_QUICK_START.md');
  log(colors.green, '  AGENTS_ZAPIER_INTEGRATION.md');

  process.exit(hasErrors ? 1 : 0);
}

main();
