export const ROUTING_RULES = {
  code_generation: {
    primary: "codex",
    fallback: ["copilot", "claude"],
    estimated_time: "30-60min",
  },
  design_critique: {
    primary: "claude",
    fallback: ["copilot"],
    estimated_time: "20-40min",
  },
  level_validation: {
    primary: "copilot",
    fallback: ["claude"],
    estimated_time: "10-20min",
  },
  validation: {
    primary: "copilot",
    fallback: ["claude"],
    estimated_time: "5-15min",
  },
  api_integration: {
    primary: "codex",
    fallback: ["claude", "copilot"],
    estimated_time: "45-90min",
  },
  documentation: {
    primary: "claude",
    fallback: ["codex", "copilot"],
    estimated_time: "20-40min",
  },
  strategic_planning: {
    primary: "claude",
    fallback: ["codex", "copilot"],
    estimated_time: "40-80min",
  },
  testing: {
    primary: "copilot",
    fallback: ["codex"],
    estimated_time: "15-30min",
  },
  debugging: {
    primary: "copilot",
    fallback: ["claude", "codex"],
    estimated_time: "30-60min",
  },
};

export function buildRoutingDecision(task = {}) {
  const type = String(task.type || "").trim();
  const rule = ROUTING_RULES[type] || ROUTING_RULES.strategic_planning;

  return {
    primary_agent: rule.primary,
    fallback_agents: rule.fallback,
    estimated_time: rule.estimated_time,
    routing_reason: `Type: ${type || "strategic_planning"}`,
  };
}
