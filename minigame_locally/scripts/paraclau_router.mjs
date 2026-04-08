#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildRoutingDecision } from "./lib/coordination_routing.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..");
const PARACLAU_PATH = path.join(PROJECT_ROOT, "docs", "PROJECT_MASTER_HANDOFF.md");
const OUTPUT_DIR = path.join(PROJECT_ROOT, "output", "coordination");
const OUTPUT_JSON = path.join(OUTPUT_DIR, "paraclau_router_status.json");
const OUTPUT_MD = path.join(OUTPUT_DIR, "paraclau_router_report.md");

function extractRouterQueue(content) {
  const match = content.match(/## Router Queue\s*\n([\s\S]*?)(?=\n## |\n---\n|$)/);
  return match ? match[1].trim() : "";
}

function parseFieldLines(blockBody) {
  const fields = {};
  for (const rawLine of blockBody.split("\n")) {
    const line = rawLine.trim();
    const match = line.match(/^- ([A-Za-z][A-Za-z ]+):\s*(.*)$/);
    if (!match) continue;
    const key = match[1].trim().toLowerCase().replace(/\s+/g, "_");
    fields[key] = match[2].trim();
  }
  return fields;
}

function parseRouteCards(queueText) {
  const sections = [];
  let current = null;

  for (const rawLine of queueText.split("\n")) {
    const line = rawLine.replace(/\r$/, "");
    if (/^### ROUTE-[A-Za-z0-9_-]+/.test(line.trim())) {
      if (current) sections.push(current.join("\n").trim());
      current = [line.trim()];
      continue;
    }
    if (current) current.push(line);
  }

  if (current) sections.push(current.join("\n").trim());

  return sections.map((section) => {
    const lines = section.split("\n");
    const heading = lines.shift() || "";
    const idMatch = heading.match(/^###\s+(ROUTE-[A-Za-z0-9_-]+)/);
    const id = idMatch ? idMatch[1] : "ROUTE-UNKNOWN";
    const fields = parseFieldLines(lines.join("\n"));
    const routing = buildRoutingDecision({ type: fields.type || "" });
    const explicitOwner = String(fields.owner || "").trim().toLowerCase();
    const assignedAgent = explicitOwner && explicitOwner !== "auto" ? explicitOwner : routing.primary_agent;

    return {
      id,
      title: fields.title || "",
      summary: fields.summary || "",
      success: fields.success || "",
      status: fields.status || "pending",
      owner: explicitOwner || "auto",
      assigned_agent: assignedAgent,
      type: fields.type || "strategic_planning",
      priority: fields.priority || "normal",
      depends_on: fields.depends_on || "none",
      source: fields.source || "project_master_handoff",
      fallback_agents: routing.fallback_agents,
      estimated_time: routing.estimated_time,
      routing_reason: routing.routing_reason,
    };
  });
}

function buildReport(tasks) {
  const total = tasks.length;
  const byStatus = Object.create(null);
  const byAgent = Object.create(null);
  for (const task of tasks) {
    byStatus[task.status] = (byStatus[task.status] || 0) + 1;
    byAgent[task.assigned_agent] = (byAgent[task.assigned_agent] || 0) + 1;
  }

  return [
    "# Paraclau Router Report",
    "",
    `Generated at: ${new Date().toISOString()}`,
    "",
    "## Summary",
    "",
    `- Total tasks: ${total}`,
    ...Object.entries(byStatus).map(([status, count]) => `- Status ${status}: ${count}`),
    ...Object.entries(byAgent).map(([agent, count]) => `- Assigned to ${agent}: ${count}`),
    "",
    "## Tasks",
    "",
    ...tasks.flatMap((task) => [
      `### ${task.id} · ${task.title || "Untitled task"}`,
      "",
      `- Status: ${task.status}`,
      `- Type: ${task.type}`,
      `- Priority: ${task.priority}`,
      `- Owner: ${task.owner}`,
      `- Assigned Agent: ${task.assigned_agent}`,
      `- Fallback Agents: ${task.fallback_agents.join(", ")}`,
      `- Depends On: ${task.depends_on}`,
      `- Estimated Time: ${task.estimated_time}`,
      `- Routing Reason: ${task.routing_reason}`,
      `- Summary: ${task.summary || "None"}`,
      `- Success: ${task.success || "None"}`,
      "",
    ]),
  ].join("\n");
}

async function main() {
  const content = await fs.readFile(PARACLAU_PATH, "utf8");
  const queueText = extractRouterQueue(content);
  if (!queueText) {
    throw new Error("No '## Router Queue' section found in docs/PROJECT_MASTER_HANDOFF.md");
  }

  const tasks = parseRouteCards(queueText);
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  const payload = {
    generated_at: new Date().toISOString(),
    source: path.relative(PROJECT_ROOT, PARACLAU_PATH),
    total_tasks: tasks.length,
    tasks,
  };

  await fs.writeFile(OUTPUT_JSON, JSON.stringify(payload, null, 2), "utf8");
  await fs.writeFile(OUTPUT_MD, `${buildReport(tasks)}\n`, "utf8");

  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
  process.exit(1);
});
