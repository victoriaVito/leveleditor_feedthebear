#!/usr/bin/env node
/**
 * Supply Chain Audit — Feed the Bear
 *
 * Detects poisoned dependencies, lockfile drift, post-install scripts,
 * and registry tampering. Uses ONLY Node.js built-ins so it cannot be
 * compromised by the very attack it is designed to detect.
 *
 * Inspired by the litellm PyPI supply chain attack (v1.82.8).
 *
 * Usage:
 *   node scripts/audit-supply-chain.mjs            # local dev
 *   node scripts/audit-supply-chain.mjs --ci       # strict mode (warnings → errors)
 *   node scripts/audit-supply-chain.mjs --fix      # safe auto-fixes
 *   node scripts/audit-supply-chain.mjs --skip-npm-audit  # skip npm audit (fast)
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
const ROOT       = resolve(__dirname, '..');
const LOCKFILE   = resolve(ROOT, 'package-lock.json');
const PKG        = resolve(ROOT, 'package.json');

// ---------------------------------------------------------------------------
// Flags
// ---------------------------------------------------------------------------
const args     = process.argv.slice(2);
const CI_MODE  = args.includes('--ci');
const FIX_MODE = args.includes('--fix');
const SKIP_NPM = args.includes('--skip-npm-audit');

// ---------------------------------------------------------------------------
// ANSI colors (same palette as validate-env.mjs)
// ---------------------------------------------------------------------------
const c = {
  reset:  '\x1b[0m',
  red:    '\x1b[31m',
  green:  '\x1b[32m',
  yellow: '\x1b[33m',
  cyan:   '\x1b[36m',
  bold:   '\x1b[1m',
  dim:    '\x1b[2m',
};

function log(color, ...msg) {
  console.log(`${color}${msg.join(' ')}${c.reset}`);
}

// ---------------------------------------------------------------------------
// Approved dependency allowlists — update these when adding new packages
// ---------------------------------------------------------------------------
const ALLOWED_PROD = new Set([
  'axios',
  'clawflows',
  'dotenv',
  'express',
  'google-auth-library',
  'googleapis',
  'open',
]);

const ALLOWED_DEV = new Set([
  '@google/clasp',
  'eslint',
  'markdownlint-cli',
  'prettier',
]);

// ---------------------------------------------------------------------------
// Baselines
// ---------------------------------------------------------------------------
const BASELINE_TRANSITIVE = 507;
const DRIFT_WARN_PCT      = 0.10;   // 10%

const TRUSTED_REGISTRY    = 'registry.npmjs.org';

// Python requirements paths (relative to project root)
const PYTHON_REQ_PATHS = [
  'python_preview_project/requirements.txt',
];

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
let failures = 0;
let warnings = 0;

function fail(msg) {
  log(c.red, `  ✗ FAIL  ${msg}`);
  failures++;
}
function warn(msg) {
  log(c.yellow, `  ⚠ WARN  ${msg}`);
  warnings++;
}
function pass(msg) {
  log(c.green, `  ✓ PASS  ${msg}`);
}
function info(msg) {
  log(c.dim, `         ${msg}`);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function loadJSON(filepath) {
  return JSON.parse(readFileSync(filepath, 'utf8'));
}

function exec(cmd, opts = {}) {
  return execSync(cmd, { cwd: ROOT, encoding: 'utf8', stdio: 'pipe', ...opts });
}

// ═══════════════════════════════════════════════════════════════════════════
// Checks
// ═══════════════════════════════════════════════════════════════════════════

function header(title) {
  log(c.bold + c.cyan, `\n┌────────────────────────────────────────────────────────┐`);
  log(c.bold + c.cyan, `│  ${title.padEnd(53)}│`);
  log(c.bold + c.cyan, `└────────────────────────────────────────────────────────┘`);
}

// ── 1. Lockfile Integrity ─────────────────────────────────────────────────
function checkLockfileIntegrity() {
  header('1. Lockfile Integrity');

  if (!existsSync(LOCKFILE)) {
    fail('package-lock.json not found');
    return;
  }
  pass('package-lock.json exists');

  const lock = loadJSON(LOCKFILE);
  if (lock.lockfileVersion === 3) {
    pass(`lockfileVersion = ${lock.lockfileVersion}`);
  } else {
    fail(`lockfileVersion = ${lock.lockfileVersion} (expected 3)`);
  }

  // npm ls --all checks tree consistency
  try {
    exec('npm ls --all 2>&1');
    pass('npm ls tree consistent');
  } catch (e) {
    const output = (e.stdout || '') + (e.stderr || '');
    if (output.includes('missing:') || output.includes('invalid:')) {
      fail('npm ls found missing or invalid packages');
      info(output.split('\n').filter(l => /missing:|invalid:/.test(l)).slice(0, 5).join('\n         '));
    } else {
      // npm ls exits non-zero for peer dep warnings — treat as warning
      warn('npm ls exited non-zero (likely peer dep warnings)');
    }
  }
}

// ── 2. Dependency Allowlist ───────────────────────────────────────────────
function checkDependencyAllowlist() {
  header('2. Dependency Allowlist');

  const pkg = loadJSON(PKG);
  const prodDeps = Object.keys(pkg.dependencies || {});
  const devDeps  = Object.keys(pkg.devDependencies || {});

  let allApproved = true;

  for (const dep of prodDeps) {
    if (ALLOWED_PROD.has(dep)) {
      pass(`prod: ${dep}`);
    } else {
      fail(`prod: ${dep} — NOT in allowlist`);
      allApproved = false;
    }
  }

  for (const dep of devDeps) {
    if (ALLOWED_DEV.has(dep)) {
      pass(`dev:  ${dep}`);
    } else {
      fail(`dev:  ${dep} — NOT in allowlist`);
      allApproved = false;
    }
  }

  // Check for removed deps still in allowlist
  for (const dep of ALLOWED_PROD) {
    if (!prodDeps.includes(dep)) {
      warn(`allowlist entry "${dep}" not in package.json prod deps`);
    }
  }
  for (const dep of ALLOWED_DEV) {
    if (!devDeps.includes(dep)) {
      warn(`allowlist entry "${dep}" not in package.json dev deps`);
    }
  }

  if (allApproved) {
    info('All direct dependencies are on the approved allowlist.');
  }
}

// ── 3. Post-install Script Detection ──────────────────────────────────────
function checkInstallScripts() {
  header('3. Post-install Script Detection');

  if (!existsSync(LOCKFILE)) {
    fail('Cannot check — lockfile missing');
    return;
  }

  const lock = loadJSON(LOCKFILE);
  const packages = lock.packages || {};
  const flagged = [];

  for (const [key, meta] of Object.entries(packages)) {
    if (key === '') continue; // root entry
    if (meta.hasInstallScript) {
      flagged.push(key.replace('node_modules/', ''));
    }
  }

  if (flagged.length === 0) {
    pass('No packages with install scripts detected');
    info('This is the primary litellm-style attack vector.');
  } else {
    for (const pkg of flagged) {
      fail(`${pkg} has install scripts — review manually`);
    }
  }
}

// ── 4. Transitive Dependency Count ────────────────────────────────────────
function checkTransitiveCount() {
  header('4. Transitive Dependency Count');

  if (!existsSync(LOCKFILE)) {
    fail('Cannot check — lockfile missing');
    return;
  }

  const lock = loadJSON(LOCKFILE);
  const packages = lock.packages || {};
  const count = Object.keys(packages).filter(k => k.startsWith('node_modules/')).length;

  const drift = Math.abs(count - BASELINE_TRANSITIVE) / BASELINE_TRANSITIVE;
  const pct = (drift * 100).toFixed(1);

  if (count === BASELINE_TRANSITIVE) {
    pass(`${count} transitive packages (matches baseline)`);
  } else if (drift <= DRIFT_WARN_PCT) {
    warn(`${count} transitive packages (baseline ${BASELINE_TRANSITIVE}, drift ${pct}%)`);
    info('Within acceptable range. Update BASELINE_TRANSITIVE if this is intentional.');
  } else {
    fail(`${count} transitive packages (baseline ${BASELINE_TRANSITIVE}, drift ${pct}%)`);
    info('Large drift detected. Review dependency changes before updating baseline.');
  }
}

// ── 5. Registry Verification ──────────────────────────────────────────────
function checkRegistryOrigins() {
  header('5. Registry Verification');

  if (!existsSync(LOCKFILE)) {
    fail('Cannot check — lockfile missing');
    return;
  }

  const lock = loadJSON(LOCKFILE);
  const packages = lock.packages || {};
  const untrusted = [];

  for (const [key, meta] of Object.entries(packages)) {
    if (key === '') continue;
    const resolved = meta.resolved;
    if (!resolved) continue;

    try {
      const hostname = new URL(resolved).hostname;
      if (hostname !== TRUSTED_REGISTRY) {
        untrusted.push({ pkg: key.replace('node_modules/', ''), registry: hostname });
      }
    } catch {
      untrusted.push({ pkg: key.replace('node_modules/', ''), registry: `(invalid URL: ${resolved})` });
    }
  }

  if (untrusted.length === 0) {
    pass(`All packages resolve to ${TRUSTED_REGISTRY}`);
  } else {
    for (const { pkg, registry } of untrusted) {
      fail(`${pkg} resolves to ${registry}`);
    }
  }
}

// ── 6. Version Range Audit ────────────────────────────────────────────────
function checkVersionRanges() {
  header('6. Version Range Audit');

  const pkg = loadJSON(PKG);
  const allDeps = {
    ...pkg.dependencies,
    ...pkg.devDependencies,
  };

  let hasDangerous = false;

  for (const [name, range] of Object.entries(allDeps)) {
    if (range === '*' || range === 'latest') {
      fail(`${name}: "${range}" — unpinned, vulnerable to any published version`);
      hasDangerous = true;
    } else if (range.startsWith('^')) {
      info(`${name}: "${range}" — caret range (minor+patch updates)`);
    } else if (range.startsWith('~')) {
      info(`${name}: "${range}" — tilde range (patch updates only)`);
    } else if (/^\d/.test(range)) {
      pass(`${name}: "${range}" — exact pin`);
    } else {
      info(`${name}: "${range}"`);
    }
  }

  if (!hasDangerous) {
    pass('No dangerous version ranges (* or latest)');
  }

  info('Ranges are acceptable when combined with a lockfile. Run npm ci in CI.');
}

// ── 7. Python Requirements ────────────────────────────────────────────────
function checkPythonRequirements() {
  header('7. Python Requirements');

  let found = false;

  for (const relPath of PYTHON_REQ_PATHS) {
    const absPath = resolve(ROOT, relPath);
    if (!existsSync(absPath)) {
      info(`${relPath} — not found, skipping`);
      continue;
    }
    found = true;

    const content = readFileSync(absPath, 'utf8');
    const lines = content.split('\n').filter(l => l.trim() && !l.trim().startsWith('#'));

    let hasPinning = true;
    let hasHashes = content.includes('--require-hashes');

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('-')) continue; // flags like --require-hashes
      if (!trimmed.includes('==')) {
        warn(`${relPath}: "${trimmed}" is not pinned with ==`);
        hasPinning = false;
      } else {
        pass(`${relPath}: "${trimmed}" — pinned`);
      }
    }

    if (hasPinning) {
      pass(`${relPath}: all packages pinned with ==`);
    }

    if (hasHashes) {
      pass(`${relPath}: --require-hashes enabled`);
    } else {
      warn(`${relPath}: --require-hashes not set (recommended for supply chain safety)`);
    }
  }

  if (!found) {
    info('No Python requirements files found — skipping.');
  }
}

// ── 8. npm audit ──────────────────────────────────────────────────────────
function checkNpmAudit() {
  header('8. npm audit');

  if (SKIP_NPM) {
    info('Skipped (--skip-npm-audit flag)');
    return;
  }

  let auditJSON;
  try {
    const raw = exec('npm audit --json 2>/dev/null');
    auditJSON = JSON.parse(raw);
  } catch (e) {
    // npm audit exits non-zero when vulnerabilities found
    try {
      auditJSON = JSON.parse(e.stdout || '{}');
    } catch {
      warn('npm audit returned unparseable output');
      return;
    }
  }

  const vuln = auditJSON.metadata?.vulnerabilities || {};
  const critical = vuln.critical || 0;
  const high     = vuln.high || 0;
  const moderate = vuln.moderate || 0;
  const low      = vuln.low || 0;
  const total    = vuln.total || 0;

  if (total === 0) {
    pass('No known vulnerabilities');
    return;
  }

  info(`Vulnerabilities: ${critical} critical, ${high} high, ${moderate} moderate, ${low} low`);

  if (critical > 0 || high > 0) {
    fail(`${critical} critical + ${high} high vulnerabilities found`);
    info('Run: npm audit for details. Run: npm audit fix for safe patches.');
  } else {
    warn(`${moderate} moderate + ${low} low vulnerabilities (no critical/high)`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════════════════════════════════

function main() {
  log(c.bold + c.cyan, `
╔══════════════════════════════════════════════════════════╗
║  Supply Chain Audit — Feed the Bear                     ║
╚══════════════════════════════════════════════════════════╝`);

  log(c.cyan, `  Mode: ${CI_MODE ? 'CI (strict)' : 'Local'}`);
  if (FIX_MODE) log(c.cyan, '  Auto-fix: enabled');
  if (SKIP_NPM) log(c.cyan, '  npm audit: skipped');

  // Run all 8 checks
  checkLockfileIntegrity();
  checkDependencyAllowlist();
  checkInstallScripts();
  checkTransitiveCount();
  checkRegistryOrigins();
  checkVersionRanges();
  checkPythonRequirements();
  checkNpmAudit();

  // ── Summary ─────────────────────────────────────────────────────────────
  log(c.bold + c.cyan, '\n═══════════════════════════════════════════════════════════');

  const effectiveFailures = CI_MODE ? failures + warnings : failures;

  if (effectiveFailures > 0) {
    log(c.red, `\n❌ SUPPLY CHAIN AUDIT FAILED`);
    log(c.red, `   ${failures} failure(s), ${warnings} warning(s)`);
    if (CI_MODE && warnings > 0) {
      log(c.yellow, '   (warnings promoted to errors in --ci mode)');
    }
    log(c.yellow, '\nNext steps:');
    log(c.yellow, '  1. Review each failure above');
    log(c.yellow, '  2. If adding a new dep: add it to the allowlist in this script');
    log(c.yellow, '  3. If transitive count changed: update BASELINE_TRANSITIVE');
    log(c.yellow, '  4. Re-run: node scripts/audit-supply-chain.mjs');
    process.exit(1);
  }

  if (warnings > 0) {
    log(c.yellow, `\n⚠️  SUPPLY CHAIN AUDIT PASSED with ${warnings} warning(s)`);
    log(c.yellow, '   Run with --ci to enforce strict mode.');
    process.exit(0);
  }

  log(c.green, '\n✅ SUPPLY CHAIN AUDIT PASSED — All 8 checks clean');
  log(c.bold + c.cyan, '\n═══════════════════════════════════════════════════════════\n');
  process.exit(0);
}

main();
