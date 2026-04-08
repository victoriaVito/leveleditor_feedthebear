#!/usr/bin/env node
import path from "node:path";
import os from "node:os";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, readdir, stat, writeFile, rm } from "node:fs/promises";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const ROOT_DIR = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const PROGRESSIONS_DIR = path.join(ROOT_DIR, "progressions");
const BUNDLES_DIR = path.join(ROOT_DIR, "bundles");
const DEFAULT_OUTPUT_DIR = path.join(BUNDLES_DIR, "progression_exports");

function safeName(value) {
  return String(value || "").trim().replace(/\.json$/i, "").replace(/[^a-zA-Z0-9._-]+/g, "_");
}

async function pathExists(targetPath) {
  try {
    await stat(targetPath);
    return true;
  } catch (_err) {
    return false;
  }
}

async function findProgressionJson(identifier) {
  const safe = safeName(identifier);
  if (!safe) return "";
  const candidatePaths = [
    path.join(PROGRESSIONS_DIR, `${safe}.json`),
    path.join(PROGRESSIONS_DIR, identifier)
  ];
  for (const candidate of candidatePaths) {
    if (await pathExists(candidate)) return candidate;
  }
  const entries = await readdir(PROGRESSIONS_DIR, { withFileTypes: true }).catch(() => []);
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
    if (safeName(entry.name) === safe) return path.join(PROGRESSIONS_DIR, entry.name);
  }
  return "";
}

async function exportBundleFolder(folderPath, outputDir) {
  const folderName = path.basename(folderPath);
  const zipPath = path.join(outputDir, `${folderName}.zip`);
  await mkdir(outputDir, { recursive: true });
  await execFileAsync("zip", ["-rq", zipPath, folderName], { cwd: path.dirname(folderPath) });
  return zipPath;
}

async function exportProgressionJson(jsonPath, outputDir) {
  const progressionName = path.parse(jsonPath).name;
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "ftb-progression-export-"));
  const rootFolder = path.join(tempDir, progressionName);
  await mkdir(rootFolder, { recursive: true });
  await writeFile(path.join(rootFolder, path.basename(jsonPath)), await readFile(jsonPath), "utf8");
  await writeFile(path.join(rootFolder, "manifest.json"), JSON.stringify({
    source: path.relative(ROOT_DIR, jsonPath),
    created_at: new Date().toISOString(),
    progression_name: progressionName
  }, null, 2), "utf8");
  const zipPath = path.join(outputDir, `${progressionName}.zip`);
  await mkdir(outputDir, { recursive: true });
  await execFileAsync("zip", ["-rq", zipPath, progressionName], { cwd: tempDir });
  await rm(tempDir, { recursive: true, force: true });
  return zipPath;
}

async function main() {
  const identifier = process.argv[2] || "";
  const outputDir = process.argv[3] ? path.resolve(process.argv[3]) : DEFAULT_OUTPUT_DIR;
  const progressionJson = await findProgressionJson(identifier);
  if (!progressionJson) {
    throw new Error(`Unknown progression: ${identifier}`);
  }

  const progressionName = path.parse(progressionJson).name;
  const bundleFolder = path.join(BUNDLES_DIR, progressionName);
  const bundleZip = `${bundleFolder}.zip`;

  if (await pathExists(bundleZip)) {
    const parsed = JSON.parse(await readFile(progressionJson, "utf8"));
    console.log(JSON.stringify({
      ok: true,
      progressionName,
      sourceType: "existing_bundle_zip",
      progressionJson: path.relative(ROOT_DIR, progressionJson),
      bundleFolder: path.relative(ROOT_DIR, bundleFolder),
      artifactPath: path.relative(ROOT_DIR, bundleZip),
      slotCount: Array.isArray(parsed.slots) ? parsed.slots.length : null
    }, null, 2));
    return;
  }

  if (await pathExists(bundleFolder)) {
    const artifactPath = await exportBundleFolder(bundleFolder, outputDir);
    const parsed = JSON.parse(await readFile(progressionJson, "utf8"));
    console.log(JSON.stringify({
      ok: true,
      progressionName,
      sourceType: "bundle_folder",
      progressionJson: path.relative(ROOT_DIR, progressionJson),
      bundleFolder: path.relative(ROOT_DIR, bundleFolder),
      artifactPath: path.relative(ROOT_DIR, artifactPath),
      slotCount: Array.isArray(parsed.slots) ? parsed.slots.length : null
    }, null, 2));
    return;
  }

  const artifactPath = await exportProgressionJson(progressionJson, outputDir);
  const parsed = JSON.parse(await readFile(progressionJson, "utf8"));
  console.log(JSON.stringify({
    ok: true,
    progressionName,
    sourceType: "progression_json",
    progressionJson: path.relative(ROOT_DIR, progressionJson),
    bundleFolder: path.relative(ROOT_DIR, bundleFolder),
    artifactPath: path.relative(ROOT_DIR, artifactPath),
    slotCount: Array.isArray(parsed.slots) ? parsed.slots.length : null
  }, null, 2));
}

main().catch((err) => {
  console.error(JSON.stringify({ ok: false, error: String(err.message || err) }, null, 2));
  process.exit(1);
});
