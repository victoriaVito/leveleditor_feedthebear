# Agent Cheatsheet

Use this as the quick routing guide for helper agents in the Feed the Bear project.

All paths below are relative to the project root.

## Which agent to use

| Need | Use this canonical prompt | Use this skill |
|---|---|---|
| Google Sheets, Bridge, API auth, sync verification, live push | `docs/agents/API_GUARDIAN.md` | `~/.codex/skills/feed-the-bear-api-guardian/SKILL.md` |
| Lost content, browser-only state, manifests, recovery, restore paths, file traceability | `docs/agents/CONTENT_RECOVERY.md` | `~/.codex/skills/feed-the-bear-content-recovery/SKILL.md` |
| Procedural generation quality, discard reasons, pair crossings, blocker tuning, progression-worthiness | `docs/agents/PROCEDURAL_DESIGN_CRITIC.md` | `~/.codex/skills/feed-the-bear-procedural-design-critic/SKILL.md` |
| Documentation, Kingfluence structure, layout doubts, source-of-truth explanations | `docs/PROJECT_MASTER_HANDOFF.md` | Coordination file first; pair with another prompt if the question also touches API, recovery, or procedural quality |
| Multi-agent routing, handoff structure, queue state, `docs/PROJECT_MASTER_HANDOFF.md` task cards | `docs/COMMUNICATION_ROUTER.md` | Start from the router doc, then route into `docs/PROJECT_MASTER_HANDOFF.md` plus `API_GUARDIAN` if transport or persistence is involved |
| Dependency security, supply chain, lockfile drift, npm audit, poisoned packages | `docs/agents/SUPPLY_CHAIN_GUARDIAN.md` | Run `npm run audit:supply-chain` first; use the guardian prompt for review, triage, or allowlist updates |
| The same project prompt needs to work in Codex, Copilot, and Gemini | `docs/agents/CROSS_MODEL_PORTABLE_CORE.md` plus the matching wrapper | Use `CODEX_PORTABLE_WRAPPER.md`, `COPILOT_PORTABLE_WRAPPER.md`, or `GEMINI_PORTABLE_WRAPPER.md` without duplicating the shared project rules |

## Quick rule

- If the problem is about external systems or syncing: use `API Guardian`
- If the problem is about missing or lost state: use `Content Recovery`
- If the problem is about whether a generated level is good: use `Procedural Design Critic`
- If the problem is about documentation or publishing: start in `docs/PROJECT_MASTER_HANDOFF.md`
- If the problem is about how tasks should move between Claude, Codex, and Copilot: start in `docs/COMMUNICATION_ROUTER.md`
- If the problem is about dependency security or supply chain: use `Supply Chain Guardian`

## Canonical coordination surfaces

- Repo memory: `memoria.md`
- Topic change logs: `changes/README.md`
- Claude / Codex handoff: `docs/PROJECT_MASTER_HANDOFF.md`
- Documentation index: `docs/README.md`
- Design voice (external): [Notion — Level Design](https://www.notion.so/Level-Design-3195f99a540280d8a972d22c54e12728)
- AI-Bridge stable context: `~/Library/Application Support/AI-Bridge/shared-context.md`
