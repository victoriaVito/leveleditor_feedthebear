#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const LEVELS_DIR = path.join(ROOT, "levels");
const OTHER_LEVELS_DIR = path.join(LEVELS_DIR, "otherLevels");
const SCREENSHOTS_DIR = path.join(LEVELS_DIR, "screenshots");
const PROGRESSIONS_DIR = path.join(ROOT, "progressions");
const MANAGER_LIVE_PATH = path.join(PROGRESSIONS_DIR, "manager_progressions_live.json");
const MANAGER_METADATA_PATH = path.join(PROGRESSIONS_DIR, "manager_state", "level_manager_metadata.json");

const CURVES = {
  g: {
    summary: "Steady ramp: grows board size and pair count first, then increases blocker pressure.",
    slots: [
      { source: "lvl_012_image02_level_editor.json", tier: 2 },
      { source: "lvl_013_image03_level_editor.json", tier: 3 },
      { source: "lvl_014_image04_level_editor.json", tier: 4 },
      { source: "procedural_medium_5x5_005.json", tier: 5 },
      { source: "procedural_medium_5x5_006.json", tier: 5 },
      { source: "procedural_medium_6x6_001.json", tier: 6 },
      { source: "procedural_medium_6x6_006.json", tier: 7 },
      { source: "procedural_medium_6x6_007.json", tier: 8 },
      { source: "procedural_medium_7x7_001.json", tier: 8 },
      { source: "procedural_medium_7x7_004.json", tier: 9 }
    ]
  },
  h: {
    summary: "Blocker-led curve: earlier lane pressure, tighter corridors, one deliberate mid-curve spike.",
    slots: [
      { source: "lvl_021_image12_level_editor.json", tier: 2 },
      { source: "lvl_031_image22_level_editor.json", tier: 4 },
      { source: "procedural_medium_5x5_008.json", tier: 5 },
      { source: "procedural_medium_5x5_009.json", tier: 5 },
      { source: "procedural_medium_6x6_002.json", tier: 6 },
      { source: "procedural_medium_6x6_009.json", tier: 7 },
      { source: "procedural_medium_7x7_002.json", tier: 7 },
      { source: "procedural_medium_7x7_006.json", tier: 8 },
      { source: "procedular_reference_large_003.json", tier: 9 },
      { source: "procedular_reference_large_001.json", tier: 9 }
    ]
  },
  i: {
    summary: "Late-game curve: larger boards, more interacting pairs, and harder endgame compression.",
    slots: [
      { source: "lvl_041_image32_level_editor.json", tier: 4 },
      { source: "procedural_medium_5x5_003.json", tier: 5 },
      { source: "procedural_medium_6x6_008.json", tier: 6 },
      { source: "progression_3_level8.json", tier: 7 },
      { source: "procedural_medium_7x7_008.json", tier: 8 },
      { source: "procedural_medium_7x7_010.json", tier: 8 },
      { source: "procedular_reference_large_009.json", tier: 9 },
      { source: "procedular_reference_large_015.json", tier: 9 },
      { source: "progression_3_level10_v2.json", tier: 9 },
      { source: "progression_3_level_2_v2.json", tier: 10 }
    ]
  }
};

function tierDifficultyLabel(tier) {
  if (tier <= 3) return "EASY";
  if (tier <= 6) return "MEDIUM";
  return "HARD";
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function writeJson(filePath, payload) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch (_error) {
    return false;
  }
}

async function copyIfPresent(sourcePath, targetPath) {
  if (!(await fileExists(sourcePath))) return false;
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.copyFile(sourcePath, targetPath);
  return true;
}

async function findScreenshot(stem) {
  const candidates = [
    path.join(OTHER_LEVELS_DIR, `${stem}.png`),
    path.join(SCREENSHOTS_DIR, `${stem}.png`),
    path.join(LEVELS_DIR, `${stem}.png`)
  ];
  for (const candidate of candidates) {
    if (await fileExists(candidate)) return candidate;
  }
  return "";
}

function curatedLevelPayload(sourceData, progressionKey, slotNumber, tier, curveSummary, sourceFile) {
  const stem = `${progressionKey}_${slotNumber}`;
  const manualDifficulty = tierDifficultyLabel(tier);
  return {
    ...sourceData,
    id: stem,
    difficultyTier: tier,
    meta: {
      ...(sourceData.meta || {}),
      source_name: `${stem}.json`,
      source_level: sourceFile,
      curated_from: sourceFile,
      curated_for_progression: `progression_${progressionKey}`,
      curated_slot: slotNumber,
      curve_summary: curveSummary,
      manual_difficulty: manualDifficulty,
      curated_at: new Date().toISOString()
    }
  };
}

async function materializeProgression(progressionKey, definition) {
  const targetDir = path.join(LEVELS_DIR, `progression_${progressionKey}`);
  const bundleDir = path.join(ROOT, "bundles", `progression_${progressionKey}`);
  await fs.mkdir(targetDir, { recursive: true });
  await fs.mkdir(bundleDir, { recursive: true });

  await copyIfPresent(path.join(LEVELS_DIR, "tutorial_level.json"), path.join(targetDir, "tutorial_level.json"));
  await copyIfPresent(path.join(LEVELS_DIR, "tutorial_level.png"), path.join(targetDir, "tutorial_level.png"));

  const slots = [{ slot: 0, status: "reserved", label: "TUTORIAL" }];
  const summary = [];
  const csvRows = [[
    "progression_key",
    "progression_label",
    "slot",
    "file",
    "saved_path",
    "board",
    "pairs",
    "blockers",
    "moves",
    "difficulty",
    "status",
    "changed",
    "notes"
  ]];

  for (let index = 0; index < definition.slots.length; index += 1) {
    const entry = definition.slots[index];
    const slotNumber = index + 1;
    const sourcePath = path.join(OTHER_LEVELS_DIR, entry.source);
    const sourceData = await readJson(sourcePath);
    const stem = `${progressionKey}_${slotNumber}`;
    const targetJsonPath = path.join(targetDir, `${stem}.json`);
    const targetPngPath = path.join(targetDir, `${stem}.png`);
    const targetData = curatedLevelPayload(sourceData, progressionKey, slotNumber, entry.tier, definition.summary, entry.source);

    await writeJson(targetJsonPath, targetData);
    const screenshotSource = await findScreenshot(path.parse(entry.source).name);
    if (screenshotSource) await copyIfPresent(screenshotSource, targetPngPath);

    slots.push({
      slot: slotNumber,
      level_file: `levels/progression_${progressionKey}/${stem}.json`
    });

    const gridSize = targetData.gridSize || {};
    summary.push({
      slot: slotNumber,
      file: `${stem}.json`,
      source: entry.source,
      board: `${gridSize.cols}x${gridSize.rows}`,
      pairs: Array.isArray(targetData.pairs) ? targetData.pairs.length : 0,
      blockers: Array.isArray(targetData.blockers) ? targetData.blockers.length : 0,
      solutions: Number(targetData.solutionCount || 0),
      tier: entry.tier,
      manualDifficulty: tierDifficultyLabel(entry.tier)
    });

    csvRows.push([
      `progression_${progressionKey}`,
      `Progression ${progressionKey.toUpperCase()}`,
      String(slotNumber),
      `${stem}.json`,
      `levels/progression_${progressionKey}/${stem}.json`,
      `${targetData.gridSize.cols}x${targetData.gridSize.rows}`,
      String(Array.isArray(targetData.pairs) ? targetData.pairs.length : 0),
      String(Array.isArray(targetData.blockers) ? targetData.blockers.length : 0),
      String(Number(targetData.moves || 0)),
      tierDifficultyLabel(entry.tier),
      "OK",
      "FALSE",
      definition.summary
    ]);
  }

  const progressionConfig = {
    name: `progression_${progressionKey}`,
    locked: true,
    tutorial_level_file: "levels/tutorial_level.json",
    slots
  };

  await writeJson(path.join(PROGRESSIONS_DIR, `progression_${progressionKey}.json`), progressionConfig);
  await fs.writeFile(
    path.join(bundleDir, `progression_${progressionKey}_progression.csv`),
    `${csvRows.map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(",")).join("\n")}\n`,
    "utf8"
  );
  return { config: progressionConfig, summary };
}

async function updateManagerFiles(generatedConfigs) {
  const live = await readJson(MANAGER_LIVE_PATH);
  for (const [progressionKey, config] of Object.entries(generatedConfigs)) {
    live[`progression_${progressionKey}`] = config;
  }
  await writeJson(MANAGER_LIVE_PATH, live);

  const metadata = await readJson(MANAGER_METADATA_PATH);
  metadata.saved_at = new Date().toISOString();
  metadata.reason = "progression_ghi_created";
  metadata.active_tab = "progression_i";
  metadata.progression_order = [
    "progression_d",
    "progression_e",
    "progression_f",
    "progression_g",
    "progression_h",
    "progression_i",
    "otherLevels"
  ];
  await writeJson(MANAGER_METADATA_PATH, metadata);
}

async function main() {
  const generated = {};
  for (const [progressionKey, definition] of Object.entries(CURVES)) {
    generated[progressionKey] = await materializeProgression(progressionKey, definition);
  }
  await updateManagerFiles(Object.fromEntries(
    Object.entries(generated).map(([progressionKey, payload]) => [progressionKey, payload.config])
  ));

  console.log(JSON.stringify({
    ok: true,
    generated: Object.fromEntries(
      Object.entries(generated).map(([progressionKey, payload]) => [`progression_${progressionKey}`, payload.summary])
    )
  }, null, 2));
}

main().catch((error) => {
  console.error(error.stack || String(error));
  process.exit(1);
});
