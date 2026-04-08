#!/usr/bin/env node

import fs from "fs/promises";
import path from "path";

const PROJECT_ROOT = process.cwd();
const DEFAULT_PATHS = {
  learning: path.join(PROJECT_ROOT, ".local", "toolkit_state", "learning_state.json"),
  bundle: path.join(PROJECT_ROOT, ".local", "browser_state_exports", "latest_browser_state_bundle.json"),
  snapshot: path.join(PROJECT_ROOT, "output", "procedural", "procedural_learning_snapshot.json"),
  playtest: path.join(PROJECT_ROOT, "playtest", "playtest_events.jsonl")
};

const FEATURE_KEYS = ["boardWidth", "boardHeight", "pairs", "blockers", "moves", "solutions"];

function parseArgs(argv) {
  const args = {
    learning: DEFAULT_PATHS.learning,
    bundle: DEFAULT_PATHS.bundle,
    snapshot: DEFAULT_PATHS.snapshot,
    playtest: DEFAULT_PATHS.playtest,
    jsonOut: ""
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === "--help" || arg === "-h") {
      args.help = true;
      continue;
    }
    if (arg === "--learning" && next) {
      args.learning = path.resolve(PROJECT_ROOT, next);
      i += 1;
      continue;
    }
    if (arg.startsWith("--learning=")) {
      args.learning = path.resolve(PROJECT_ROOT, arg.slice("--learning=".length));
      continue;
    }
    if (arg === "--bundle" && next) {
      args.bundle = path.resolve(PROJECT_ROOT, next);
      i += 1;
      continue;
    }
    if (arg.startsWith("--bundle=")) {
      args.bundle = path.resolve(PROJECT_ROOT, arg.slice("--bundle=".length));
      continue;
    }
    if (arg === "--snapshot" && next) {
      args.snapshot = path.resolve(PROJECT_ROOT, next);
      i += 1;
      continue;
    }
    if (arg.startsWith("--snapshot=")) {
      args.snapshot = path.resolve(PROJECT_ROOT, arg.slice("--snapshot=".length));
      continue;
    }
    if (arg === "--playtest" && next) {
      args.playtest = path.resolve(PROJECT_ROOT, next);
      i += 1;
      continue;
    }
    if (arg.startsWith("--playtest=")) {
      args.playtest = path.resolve(PROJECT_ROOT, arg.slice("--playtest=".length));
      continue;
    }
    if (arg === "--json" && next && !next.startsWith("--")) {
      args.jsonOut = path.resolve(PROJECT_ROOT, next);
      i += 1;
      continue;
    }
    if (arg.startsWith("--json=")) {
      args.jsonOut = path.resolve(PROJECT_ROOT, arg.slice("--json=".length));
      continue;
    }
    if (arg === "--json") {
      args.jsonOut = path.join(PROJECT_ROOT, "procedural_learning_audit.json");
      continue;
    }
    if (arg === "--output" && next && !next.startsWith("--")) {
      args.jsonOut = path.resolve(PROJECT_ROOT, next);
      i += 1;
      continue;
    }
    if (arg.startsWith("--output=")) {
      args.jsonOut = path.resolve(PROJECT_ROOT, arg.slice("--output=".length));
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return args;
}

function helpText() {
  return [
    "Usage: node scripts/audit_procedural_learning.mjs [options]",
    "",
    "Options:",
    "  --learning <path>   Path to learning_state.json",
    "  --bundle <path>     Path to latest_browser_state_bundle.json",
    "  --snapshot <path>   Path to procedural_learning_snapshot.json",
    "  --playtest <path>   Path to playtest_events.jsonl",
    "  --json <path>       Write machine-readable JSON output to file",
    "  --output <path>     Alias for --json",
    "  -h, --help          Show this message"
  ].join("\n");
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readJson(filePath) {
  const text = await fs.readFile(filePath, "utf8");
  return JSON.parse(text);
}

async function readText(filePath) {
  return fs.readFile(filePath, "utf8");
}

function stableStringify(value) {
  return JSON.stringify(sortValue(value));
}

function sortValue(value) {
  if (Array.isArray(value)) {
    return value.map(sortValue);
  }
  if (value && typeof value === "object") {
    return Object.keys(value).sort().reduce((acc, key) => {
      acc[key] = sortValue(value[key]);
      return acc;
    }, {});
  }
  return value;
}

function toNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function formatNumber(value, digits = 2) {
  return Number.isFinite(value) ? value.toFixed(digits) : "n/a";
}

function formatPct(value, digits = 1) {
  return Number.isFinite(value) ? `${(value * 100).toFixed(digits)}%` : "n/a";
}

function familyOf(entry) {
  const context = String(entry?.context || "");
  if (context.startsWith("session:")) return "session";
  if (context.startsWith("reference_")) return "reference";
  if (context.startsWith("editor_")) return "editor";
  return "other";
}

function sourceLabel(entry) {
  const context = String(entry?.context || "");
  if (context) return context;
  const sourceFile = String(entry?.source_file || "");
  if (sourceFile) return sourceFile;
  return "unknown";
}

function entryBucket(entry, fallback = "unknown") {
  return entry?.bucket || fallback;
}

function featureVector(entry) {
  const features = entry?.features && typeof entry.features === "object" ? entry.features : {};
  return {
    level: toNumber(features.level),
    boardWidth: toNumber(features.boardWidth),
    boardHeight: toNumber(features.boardHeight),
    pairs: toNumber(features.pairs),
    blockers: toNumber(features.blockers),
    moves: toNumber(features.moves),
    solutions: toNumber(features.solutions)
  };
}

function featureSignature(entry, bucket) {
  return [
    entryBucket(entry, bucket),
    String(entry?.context || ""),
    stableStringify(featureVector(entry))
  ].join(" | ");
}

function meanOf(rows) {
  if (!rows.length) return null;
  const totals = FEATURE_KEYS.reduce((acc, key) => {
    acc[key] = 0;
    return acc;
  }, {});
  for (const row of rows) {
    for (const key of FEATURE_KEYS) {
      totals[key] += row.features[key];
    }
  }
  const out = { count: rows.length };
  for (const key of FEATURE_KEYS) {
    out[key] = totals[key] / rows.length;
  }
  return out;
}

function relativeDelta(fromValue, toValue) {
  if (!Number.isFinite(fromValue) || fromValue === 0) return 0;
  return (toValue - fromValue) / fromValue;
}

function driftSummary(globalMean, familyMean) {
  const deltas = FEATURE_KEYS.map((key) => relativeDelta(globalMean[key], familyMean[key]));
  const driftScore = deltas.reduce((sum, delta) => sum + Math.abs(delta), 0) / deltas.length;
  return {
    driftScore,
    deltas: FEATURE_KEYS.reduce((acc, key) => {
      acc[key] = relativeDelta(globalMean[key], familyMean[key]);
      return acc;
    }, {})
  };
}

function summarizeEntries(entries, bucket) {
  const annotated = entries.map((entry) => ({
    bucket,
    family: familyOf(entry),
    context: String(entry?.context || ""),
    signature: featureSignature(entry, bucket),
    features: featureVector(entry),
    raw: entry
  }));

  const duplicates = new Map();
  for (const row of annotated) {
    const current = duplicates.get(row.signature) || [];
    current.push(row);
    duplicates.set(row.signature, current);
  }

  const duplicateGroups = [...duplicates.entries()]
    .filter(([, rows]) => rows.length > 1)
    .map(([signature, rows]) => ({
      signature,
      count: rows.length,
      family: rows[0].family,
      bucket: rows[0].bucket,
      context: rows[0].context,
      features: rows[0].features
    }))
    .sort((left, right) => right.count - left.count);

  const invalidApprovals = annotated.filter((row) => {
    if (row.bucket !== "approved") return false;
    return row.features.solutions <= 0 || row.features.moves < row.features.pairs || !Number.isFinite(row.features.moves);
  });

  const familyMap = new Map();
  for (const row of annotated) {
    const current = familyMap.get(row.family) || [];
    current.push(row);
    familyMap.set(row.family, current);
  }

  const families = [...familyMap.entries()]
    .map(([family, rows]) => {
      const approved = rows.filter((row) => row.bucket === "approved");
      const rejected = rows.filter((row) => row.bucket === "rejected");
      const corrections = rows.filter((row) => row.bucket === "corrections");
      const mean = meanOf(rows);
      return {
        family,
        count: rows.length,
        approved: approved.length,
        rejected: rejected.length,
        corrections: corrections.length,
        approvalRate: rows.length ? approved.length / rows.length : 0,
        mean,
        sourceMix: rows
          .reduce((acc, row) => {
            const label = sourceLabel(row.raw);
            acc[label] = (acc[label] || 0) + 1;
            return acc;
          }, {})
      };
    })
    .sort((left, right) => right.count - left.count);

  return {
    annotated,
    duplicateGroups,
    invalidApprovals,
    families,
    mean: meanOf(annotated)
  };
}

function topContexts(rows, limit = 5) {
  const counts = new Map();
  for (const row of rows) {
    const key = row.context || "unknown";
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([context, count]) => ({ context, count }))
    .sort((left, right) => right.count - left.count || left.context.localeCompare(right.context))
    .slice(0, limit);
}

function renderTable(rows, columns) {
  if (!rows.length) return "";
  const widths = columns.map((column) => {
    const values = rows.map((row) => String(column.value(row)));
    return Math.max(column.label.length, ...values.map((value) => value.length));
  });
  const header = columns.map((column, index) => column.label.padEnd(widths[index])).join("  ");
  const separator = widths.map((width) => "-".repeat(width)).join("  ");
  const body = rows.map((row) =>
    columns.map((column, index) => String(column.value(row)).padEnd(widths[index])).join("  ")
  );
  return [header, separator, ...body].join("\n");
}

function formatFamilyDeltas(globalMean, familyMean) {
  return FEATURE_KEYS
    .filter((key) => key !== "level")
    .map((key) => `${key} ${formatPct(relativeDelta(globalMean[key], familyMean[key]), 1)}`)
    .join(", ");
}

function buildLearningArtifactSummary(raw, sourcePath) {
  const approved = Array.isArray(raw?.approved) ? raw.approved : [];
  const rejected = Array.isArray(raw?.rejected) ? raw.rejected : [];
  const corrections = Array.isArray(raw?.corrections) ? raw.corrections : [];
  const all = [
    ...approved.map((entry) => ({ ...entry, bucket: "approved" })),
    ...rejected.map((entry) => ({ ...entry, bucket: "rejected" })),
    ...corrections.map((entry) => ({ ...entry, bucket: "corrections" }))
  ];
  const summary = {
    sourcePath,
    counts: {
      approved: approved.length,
      rejected: rejected.length,
      corrections: corrections.length,
      total: all.length
    },
    byBucket: {
      approved: summarizeEntries(approved, "approved"),
      rejected: summarizeEntries(rejected, "rejected"),
      corrections: summarizeEntries(corrections, "corrections")
    }
  };

  const mixMap = new Map();
  for (const row of all.map((entry) => ({
    bucket: entry.bucket,
    family: familyOf(entry),
    context: String(entry?.context || ""),
    raw: entry,
    features: featureVector(entry)
  }))) {
    const key = row.family;
    const current = mixMap.get(key) || {
      family: key,
      approved: 0,
      rejected: 0,
      corrections: 0,
      total: 0,
      contexts: []
    };
    current[row.bucket] += 1;
    current.total += 1;
    current.contexts.push(row);
    mixMap.set(key, current);
  }

  const globalMean = meanOf(all.map((entry) => ({
    features: featureVector(entry)
  })));
  const families = [...mixMap.values()]
    .map((family) => {
      const rows = family.contexts;
      const mean = meanOf(rows);
      const drift = globalMean && mean ? driftSummary(globalMean, mean) : null;
      return {
        family: family.family,
        approved: family.approved,
        rejected: family.rejected,
        corrections: family.corrections,
        total: family.total,
        approvalRate: family.total ? family.approved / family.total : 0,
        rejectedRate: family.total ? family.rejected / family.total : 0,
        mean,
        drift,
        topContexts: topContexts(rows, 4)
      };
    })
    .sort((left, right) => right.total - left.total || left.family.localeCompare(right.family));

  const familyAudit = families.reduce((acc, family) => {
    acc[family.family] = family;
    return acc;
  }, {});

  return {
    ...summary,
    families: familyAudit,
    familyList: families,
    duplicates: {
      totalGroups: summary.byBucket.approved.duplicateGroups.length + summary.byBucket.rejected.duplicateGroups.length + summary.byBucket.corrections.duplicateGroups.length,
      groups: [
        ...summary.byBucket.approved.duplicateGroups,
        ...summary.byBucket.rejected.duplicateGroups,
        ...summary.byBucket.corrections.duplicateGroups
      ].slice(0, 15)
    },
    invalidApprovals: {
      count: summary.byBucket.approved.invalidApprovals.length,
      families: summary.byBucket.approved.invalidApprovals.reduce((acc, row) => {
        acc[row.family] = (acc[row.family] || 0) + 1;
        return acc;
      }, {}),
      rows: summary.byBucket.approved.invalidApprovals.slice(0, 12)
    },
    globalMean
  };
}

async function loadLearningArtifact(args) {
  const candidates = [
    { kind: "repo-learning", path: args.learning },
    { kind: "bundle", path: args.bundle },
    { kind: "sqlite", path: path.join(PROJECT_ROOT, ".local", "ftb_local_store.db") }
  ];

  for (const candidate of candidates) {
    if (candidate.kind === "sqlite") continue;
    if (!(await fileExists(candidate.path))) continue;
    if (candidate.kind === "repo-learning") {
      const raw = await readJson(candidate.path);
      return { kind: candidate.kind, path: candidate.path, raw };
    }
    if (candidate.kind === "bundle") {
      const raw = await readJson(candidate.path);
      const learning = raw?.snapshots?.learning?.payload;
      if (learning && typeof learning === "object") {
        return { kind: candidate.kind, path: candidate.path, raw: learning };
      }
    }
  }

  throw new Error("No learning artifact found. Expected .local/toolkit_state/learning_state.json or .local/browser_state_exports/latest_browser_state_bundle.json.");
}

async function loadSnapshotArtifact(snapshotPath) {
  if (!(await fileExists(snapshotPath))) return null;
  const raw = await readJson(snapshotPath);
  const approved = Array.isArray(raw?.latest_approved) ? raw.latest_approved : [];
  const rejected = Array.isArray(raw?.latest_rejected) ? raw.latest_rejected : [];
  const corrections = Array.isArray(raw?.latest_corrections) ? raw.latest_corrections : [];
  return {
    path: snapshotPath,
    exportedAt: raw?.exported_at || "",
    source: raw?.source || "",
    counts: {
      approved: approved.length,
      rejected: rejected.length,
      corrections: corrections.length,
      total: approved.length + rejected.length + corrections.length
    },
    raw
  };
}

async function loadBundleArtifact(bundlePath) {
  if (!(await fileExists(bundlePath))) return null;
  const raw = await readJson(bundlePath);
  const learning = raw?.snapshots?.learning?.payload;
  if (!learning || typeof learning !== "object") return null;
  const approved = Array.isArray(learning.approved) ? learning.approved : [];
  const rejected = Array.isArray(learning.rejected) ? learning.rejected : [];
  const corrections = Array.isArray(learning.corrections) ? learning.corrections : [];
  return {
    path: bundlePath,
    counts: {
      approved: approved.length,
      rejected: rejected.length,
      corrections: corrections.length,
      total: approved.length + rejected.length + corrections.length
    },
    raw: learning
  };
}

async function loadPlaytestArtifact(playtestPath) {
  if (!(await fileExists(playtestPath))) return null;
  const content = await readText(playtestPath);
  const rows = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      try {
        return JSON.parse(line);
      } catch (error) {
        throw new Error(`Failed to parse JSONL line ${index + 1} in ${playtestPath}: ${error.message}`);
      }
    });

  const solved = rows.filter((row) => row.solved === true);
  const invalidSolved = rows.filter((row) => row.solved === true && String(row.validation_status || "") === "INVALID");
  const manual = rows.filter((row) => String(row.save_reason || "") === "manual");
  const validate = rows.filter((row) => String(row.save_reason || "") === "validate");
  const avgHistory = rows.length
    ? rows.reduce((sum, row) => sum + toNumber(row.history_length), 0) / rows.length
    : 0;

  return {
    path: playtestPath,
    counts: {
      total: rows.length,
      solved: solved.length,
      invalidSolved: invalidSolved.length,
      manual: manual.length,
      validate: validate.length
    },
    avgHistory,
    rows,
    invalidSolvedRows: invalidSolved.slice(0, 12)
  };
}

function printSummary(result, snapshot, playtest) {
  const learning = result;
  console.log("Procedural Learning Audit");
  console.log(`Learning source: ${learning.sourcePath} (${learning.sourceKind})`);
  console.log(`Counts: ${learning.counts.approved} approved, ${learning.counts.rejected} rejected, ${learning.counts.corrections} corrections, ${learning.counts.total} total`);
  console.log("");

  console.log("Source mix");
  console.log(renderTable(learning.familyList, [
    { label: "Family", value: (row) => row.family },
    { label: "Approved", value: (row) => row.approved },
    { label: "Rejected", value: (row) => row.rejected },
    { label: "Total", value: (row) => row.total },
    { label: "Approval%", value: (row) => formatPct(row.approvalRate, 1) },
    { label: "Top contexts", value: (row) => row.topContexts.map((item) => `${item.context}(${item.count})`).join(", ") }
  ]));
  console.log("");

  console.log("Duplicates");
  console.log(`Exact duplicate groups: ${learning.duplicates.totalGroups}`);
  if (learning.duplicates.groups.length) {
    learning.duplicates.groups.slice(0, 8).forEach((group, index) => {
      console.log(`${index + 1}. [${group.family}] ${group.context} x${group.count}`);
      console.log(`   ${group.signature}`);
    });
  } else {
    console.log("None found.");
  }
  console.log("");

  console.log("Invalid approvals");
  console.log(`Suspicious approved entries: ${learning.invalidApprovals.count}`);
  if (learning.invalidApprovals.count) {
    console.log(renderTable(
      learning.invalidApprovals.rows.map((row) => ({
        family: row.family,
        context: row.context,
        features: row.features
      })),
      [
        { label: "Family", value: (row) => row.family },
        { label: "Context", value: (row) => row.context },
        { label: "Features", value: (row) => `pairs=${row.features.pairs}, blockers=${row.features.blockers}, moves=${row.features.moves}, solutions=${row.features.solutions}` }
      ]
    ));
  }
  console.log("");

  console.log("Feature drift");
  console.log(renderTable(
    learning.familyList.map((row) => ({
      family: row.family,
      count: row.total,
      mean: row.mean,
      drift: row.drift
    })),
    [
      { label: "Family", value: (row) => row.family },
      { label: "Count", value: (row) => row.count },
      { label: "Board W", value: (row) => formatNumber(row.mean?.boardWidth) },
      { label: "Board H", value: (row) => formatNumber(row.mean?.boardHeight) },
      { label: "Pairs", value: (row) => formatNumber(row.mean?.pairs) },
      { label: "Blockers", value: (row) => formatNumber(row.mean?.blockers) },
      { label: "Moves", value: (row) => formatNumber(row.mean?.moves) },
      { label: "Solutions", value: (row) => formatNumber(row.mean?.solutions) },
      { label: "Drift", value: (row) => `${formatPct(row.drift?.driftScore || 0, 1)} | ${formatFamilyDeltas(learning.globalMean, row.mean)}` }
    ]
  ));
  console.log("");

  if (snapshot) {
    const stale = snapshot.counts.approved !== learning.counts.approved ||
      snapshot.counts.rejected !== learning.counts.rejected ||
      snapshot.counts.corrections !== learning.counts.corrections;
    console.log("Snapshot check");
    console.log(`Export: ${snapshot.path}`);
    console.log(`Counts: ${snapshot.counts.approved} approved, ${snapshot.counts.rejected} rejected, ${snapshot.counts.corrections} corrections`);
    console.log(stale ? "Status: stale relative to the live repo learning file." : "Status: matches the live repo learning file.");
    console.log("");
  }

  if (playtest) {
    console.log("Playtest check");
    console.log(`File: ${playtest.path}`);
    console.log(`Records: ${playtest.counts.total} total, ${playtest.counts.solved} solved, ${playtest.counts.invalidSolved} solved but INVALID`);
    console.log(`Save reasons: ${playtest.counts.manual} manual, ${playtest.counts.validate} validate`);
    console.log(`Average history length: ${formatNumber(playtest.avgHistory)}`);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(helpText());
    return;
  }

  const artifact = await loadLearningArtifact(args);
  const parsed = buildLearningArtifactSummary(artifact.raw, artifact.path);
  const result = {
    sourceKind: artifact.kind,
    sourcePath: artifact.path,
    ...parsed
  };

  const bundle = await loadBundleArtifact(args.bundle);
  const snapshot = await loadSnapshotArtifact(args.snapshot);
  const playtest = await loadPlaytestArtifact(args.playtest);

  printSummary(result, snapshot, playtest);

  if (bundle) {
    console.log("");
    console.log("Bundle check");
    console.log(`Bundle: ${bundle.path}`);
    console.log(`Counts: ${bundle.counts.approved} approved, ${bundle.counts.rejected} rejected, ${bundle.counts.corrections} corrections`);
    const stale = bundle.counts.approved !== result.counts.approved ||
      bundle.counts.rejected !== result.counts.rejected ||
      bundle.counts.corrections !== result.counts.corrections;
    console.log(stale ? "Status: stale relative to the live repo learning file." : "Status: matches the live repo learning file.");
  }

  if (args.jsonOut) {
    await fs.writeFile(args.jsonOut, `${JSON.stringify({
      generatedAt: new Date().toISOString(),
      learning: result,
      bundle,
      snapshot,
      playtest
    }, null, 2)}\n`, "utf8");
    console.log("");
    console.log(`Wrote JSON audit to ${args.jsonOut}`);
  }
}

main().catch((error) => {
  console.error(`audit_procedural_learning failed: ${error.message}`);
  process.exitCode = 1;
});
