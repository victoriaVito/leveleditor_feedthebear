# Supply Chain Security Changes

## 2026-03-25 — Initial supply chain audit infrastructure

**Context:** The litellm PyPI supply chain attack (version 1.82.8) demonstrated that a single poisoned package can exfiltrate SSH keys, cloud credentials, API keys, and shell history. The existing CI security job only checked for hardcoded secrets — zero protection against poisoned dependencies.

**Baseline snapshot:**
- 507 transitive npm packages
- 0 packages with install scripts
- All packages resolve to `registry.npmjs.org`
- 7 production deps, 4 dev deps
- Python: only `Pillow>=10.0.0` (unpinned — flagged as warning)

**Changes:**
- Created `scripts/audit-supply-chain.mjs` — 8-check supply chain audit using only Node.js built-ins
  - Lockfile integrity (exists, version 3, `npm ls` consistency)
  - Dependency allowlist (hardcoded approved list)
  - Post-install script detection (primary litellm vector)
  - Transitive dependency count baseline (507, 10% drift threshold)
  - Registry verification (all must be `registry.npmjs.org`)
  - Version range audit (flags `*` and `latest`)
  - Python requirements pinning check
  - npm audit (critical/high = fail)
- Added npm scripts: `audit:supply-chain`, `audit:supply-chain:ci`, `preinstall` hook
- Added `supply-chain` CI job to `.github/workflows/zapier-ci.yml`
- Switched CI `validate` and `lint` jobs from `npm install` to `npm ci`
- Added lockfile and audit script to CI path triggers
- Created `docs/agents/SUPPLY_CHAIN_GUARDIAN.md` agent prompt
- Updated `AGENT_CHEATSHEET.md` with supply chain routing
- Updated `docs/README.md` and `changes/README.md` indexes
