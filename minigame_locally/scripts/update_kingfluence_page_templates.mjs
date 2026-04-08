#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const BASE_URL = "https://kingfluence.com";
const CDP_URL = process.env.KINGFLUENCE_CDP_URL || "http://127.0.0.1:9222";
const CAREER_PAGE_ID = "961710850";
const FTB_PAGE_ID = "990479168";

const CAREER_PAGE_TITLE = "Level design career - the final guide - 2026";
const FTB_PAGE_TITLE = "Feed the bear - level design";

const CAREER_LEVEL_BADGES = [
  ["L8 Intern", "Grey"],
  ["L9 Associate", "Grey"],
  ["L10 Designer", "Blue"],
  ["L11 Senior", "Blue"],
  ["L12 Principal / Lead", "Yellow"],
  ["L13 Sr Principal / Sr Lead", "Red"]
].map(([title, colour]) => (
  `<ac:structured-macro ac:name="status"><ac:parameter ac:name="title">${title}</ac:parameter><ac:parameter ac:name="colour">${colour}</ac:parameter></ac:structured-macro>`
)).join("&#160;\n  ");

const CAREER_SECTION_EMOJIS = [
  ["summary", "📋"],
  ["overview", "🧭"],
  ["overview and philosophy", "🧭"],
  ["career path", "🪜"],
  ["your pdp", "📈"],
  ["how to use it", "📈"],
  ["talent month", "🌟"],
  ["end of year", "🌟"],
  ["core links", "🔗"],
  ["quick links", "🔗"]
];

const CAREER_SECTION_BADGES = [
  {
    match: ["summary"],
    badges: [["Guide", "Blue"], ["Start Here", "Green"], ["Career Growth", "Yellow"]]
  },
  {
    match: ["overview"],
    badges: [["Principles", "Blue"], ["Craft", "Grey"], ["Expectations", "Yellow"]]
  },
  {
    match: ["career path"],
    badges: [["L8 to L13", "Blue"], ["IC", "Grey"], ["Leadership", "Yellow"]]
  },
  {
    match: ["your pdp", "how to use it"],
    badges: [["PDP", "Green"], ["Template", "Blue"], ["Action Plan", "Yellow"]]
  },
  {
    match: ["talent month", "end of year"],
    badges: [["Feedback", "Yellow"], ["Calibration", "Red"], ["Growth", "Blue"]]
  },
  {
    match: ["quick links", "core links"],
    badges: [["Resources", "Blue"], ["Support", "Grey"], ["Useful Links", "Green"]]
  }
];

function readEnvValue(key) {
  if (process.env[key]) return process.env[key];
  const envFiles = [
    path.join(process.cwd(), ".env"),
    path.join(process.env.HOME || "", ".env")
  ];
  for (const envPath of envFiles) {
    if (!envPath || !fs.existsSync(envPath)) continue;
    const content = fs.readFileSync(envPath, "utf8");
    for (const rawLine of content.split(/\r?\n/)) {
      let line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      if (line.startsWith("export ")) line = line.slice(7).trim();
      const eqIndex = line.indexOf("=");
      if (eqIndex === -1) continue;
      const candidateKey = line.slice(0, eqIndex).trim();
      if (candidateKey !== key) continue;
      let value = line.slice(eqIndex + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (value) return value;
    }
  }
  return "";
}

function stripTags(value) {
  return String(value || "")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&#160;/g, " ")
    .replace(/&mdash;|&#8212;/g, " — ")
    .replace(/&ndash;|&#8211;/g, " – ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeHeadingKey(title) {
  return stripTags(title).toLowerCase();
}

function getCareerSectionEmoji(title) {
  const normalized = normalizeHeadingKey(title);
  for (const [key, emoji] of CAREER_SECTION_EMOJIS) {
    if (normalized.includes(key)) return emoji;
  }
  return "📄";
}

function makeStatusBadge(title, colour) {
  return `<ac:structured-macro ac:name="status"><ac:parameter ac:name="title">${title}</ac:parameter><ac:parameter ac:name="colour">${colour}</ac:parameter></ac:structured-macro>`;
}

function getCareerSectionBadgeMarkup(title) {
  const normalized = normalizeHeadingKey(title);
  const config = CAREER_SECTION_BADGES.find((entry) => entry.match.some((token) => normalized.includes(token)));
  if (!config) return "";
  const badges = config.badges.map(([label, colour]) => makeStatusBadge(label, colour)).join("&#160;");
  return `<p>${badges}</p>`;
}

function decorateCareerVisibleHeadings(body) {
  const headingMap = [
    ["Summary: Your Career Path Is Up to You", "📋 Summary: Your Career Path Is Up to You"],
    ["Overview &amp; Philosophy", "🧭 Overview &amp; Philosophy"],
    ["Career Path: L8 → L13", "🪜 Career Path: L8 → L13"],
    ["Your PDP — How to Use It", "📈 Your PDP — How to Use It"],
    ["End of Year &amp; Feedback — Talent Month", "🌟 End of Year &amp; Feedback — Talent Month"],
    ["Quick Links &amp; Resources", "🔗 Quick Links &amp; Resources"]
  ];
  let current = body;
  let changed = false;
  headingMap.forEach(([plain, decorated]) => {
    const plainMarkup = `<h2>${plain}</h2>`;
    const decoratedMarkup = `<h2>${decorated}</h2>`;
    if (current.includes(decoratedMarkup)) return;
    if (current.includes(plainMarkup)) {
      current = current.replace(plainMarkup, decoratedMarkup);
      changed = true;
    }
  });
  return { body: current, changed };
}

function injectCareerSectionBadgeRows(body) {
  let current = body;
  let changed = false;
  const seen = new Set();
  current = current.replace(/<h2>(.*?)<\/h2>/g, (match, title) => {
    const cleanTitle = stripTags(title);
    if (seen.has(cleanTitle)) return match;
    seen.add(cleanTitle);
    const badgeRow = getCareerSectionBadgeMarkup(cleanTitle);
    if (!badgeRow) return match;
    const nextChunk = current.slice(current.indexOf(match) + match.length, current.indexOf(match) + match.length + 300);
    if (nextChunk.includes("ac:name=\"status\"")) return match;
    changed = true;
    return `${match}${badgeRow}`;
  });
  return { body: current, changed };
}

function decorateCareerPanelTitles(body) {
  let current = body;
  let changed = false;
  if (current.includes("<ac:parameter ac:name=\"title\">Level Design Career Guide</ac:parameter>")) {
    current = current.replace(
      "<ac:parameter ac:name=\"title\">Level Design Career Guide</ac:parameter>",
      "<ac:parameter ac:name=\"title\">🪜 Level Design Career Guide</ac:parameter>"
    );
    changed = true;
  }
  if (current.includes("<ac:parameter ac:name=\"title\">Quick Facts</ac:parameter>")) {
    current = current.replace(
      "<ac:parameter ac:name=\"title\">Quick Facts</ac:parameter>",
      "<ac:parameter ac:name=\"title\">📌 Quick Facts</ac:parameter>"
    );
    changed = true;
  }
  return { body: current, changed };
}

function addCareerHeaderLevelBadges(body) {
  if (body.includes("L8 Intern") && body.includes("IC Path")) return { body, changed: false };
  const badgeParagraph = `<p>\n  ${CAREER_LEVEL_BADGES}\n</p><p>${makeStatusBadge("IC Path", "Grey")}&#160;${makeStatusBadge("Leadership Path", "Yellow")}&#160;${makeStatusBadge("Updated in Codex", "Blue")}</p>`;
  const panelRe = /(<ac:structured-macro\b[^>]*ac:name="panel"[^>]*>[\s\S]*?<ac:parameter\b[^>]*ac:name="title"[^>]*>(?:[^<]*?)Level Design Career Guide<\/ac:parameter>[\s\S]*?<ac:rich-text-body>)([\s\S]*?)(<\/ac:rich-text-body>[\s\S]*?<\/ac:structured-macro>)/i;
  if (panelRe.test(body)) {
    return {
      body: body.replace(panelRe, (_m, g1, g2, g3) => `${g1}${g2}${badgeParagraph}${g3}`),
      changed: true
    };
  }
  const infoRe = /(<ac:structured-macro\b[^>]*ac:name="info"[^>]*>[\s\S]*?<ac:rich-text-body>)([\s\S]*?<h3>\s*Level Design Career, PDP, and Talent Month Guide 2026\s*<\/h3>[\s\S]*?)(<\/ac:rich-text-body>[\s\S]*?<\/ac:structured-macro>)/i;
  if (infoRe.test(body)) {
    return {
      body: body.replace(infoRe, (_m, g1, g2, g3) => `${g1}${g2}${badgeParagraph}${g3}`),
      changed: true
    };
  }
  throw new Error("Could not find a supported career header block.");
}

function wrapCareerH2Sections(cellContent) {
  if (cellContent.includes("📋 Summary: Your Career Path Is Up to You") && cellContent.includes('ac:name="expand"')) {
    return { content: cellContent, changed: false };
  }
  const h2Re = /<h2\b[^>]*>[\s\S]*?<\/h2>/gi;
  const matches = [...cellContent.matchAll(h2Re)];
  if (!matches.length) return { content: cellContent, changed: false };

  let result = "";
  let cursor = 0;
  let changed = false;

  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index];
    const h2Tag = match[0];
    const start = match.index || 0;
    const end = start + h2Tag.length;
    const nextStart = index + 1 < matches.length ? (matches[index + 1].index || cellContent.length) : cellContent.length;
    const before = cellContent.slice(cursor, start);
    const sectionContent = cellContent.slice(end, nextStart);
    const cleanTitle = stripTags(h2Tag);
    const normalized = normalizeHeadingKey(cleanTitle);
    const shouldWrap = CAREER_SECTION_EMOJIS.some(([key]) => normalized.includes(key));

    result += before;
    if (shouldWrap) {
      const emoji = getCareerSectionEmoji(cleanTitle);
      const badgeRow = getCareerSectionBadgeMarkup(cleanTitle);
      result += (
        `<ac:structured-macro ac:name="expand">` +
        `<ac:parameter ac:name="title">${emoji} ${cleanTitle}</ac:parameter>` +
        `<ac:rich-text-body>${h2Tag}${badgeRow}${sectionContent}</ac:rich-text-body>` +
        `</ac:structured-macro>`
      );
      changed = true;
    } else {
      result += `${h2Tag}${sectionContent}`;
    }
    cursor = nextStart;
  }

  if (cursor < cellContent.length) result += cellContent.slice(cursor);
  return { content: result, changed };
}

function wrapCareerMainColumnSections(body) {
  const cellRe = /(<ac:layout-cell\b[^>]*>)([\s\S]*?)(<\/ac:layout-cell>)/gi;
  const matches = [...body.matchAll(cellRe)];
  if (matches.length >= 2) {
    const target = matches[1];
    const original = target[0];
    const wrapped = wrapCareerH2Sections(target[2]);
    if (!wrapped.changed) return { body, changed: false };
    const replacement = `${target[1]}${wrapped.content}${target[3]}`;
    return {
      body: body.slice(0, target.index) + replacement + body.slice((target.index || 0) + original.length),
      changed: true
    };
  }
  const hrIndex = body.indexOf("<hr");
  const start = hrIndex >= 0 ? body.indexOf(">", hrIndex) + 1 : 0;
  if (start < 0) throw new Error("Could not determine a career content section to wrap.");
  const prefix = body.slice(0, start);
  const remainder = body.slice(start);
  const wrapped = wrapCareerH2Sections(remainder);
  if (!wrapped.changed) return { body, changed: false };
  return {
    body: `${prefix}${wrapped.content}`,
    changed: true
  };
}

function updateFtbDate(body) {
  if (!body.includes("Last updated: March 2026")) return { body, changed: false };
  return {
    body: body.replace("Last updated: March 2026", "Last updated: April 2026"),
    changed: true
  };
}

function addCareerCodexFooter(body) {
  if (body.includes("Maintained with Codex") || body.includes("updated with a Codex script")) {
    return { body, changed: false };
  }
  const footerMacro = [
    `<ac:structured-macro ac:name="note">`,
    `<ac:parameter ac:name="title">🤖 Maintained with Codex</ac:parameter>`,
    `<ac:rich-text-body>`,
    `<p>${makeStatusBadge("Codex Script", "Blue")}&#160;${makeStatusBadge("Victoria Serrano", "Grey")}&#160;${makeStatusBadge("Contact for updates", "Yellow")}</p>`,
    `<p>This page was last updated using a Codex script maintained by Victoria Serrano. If you want changes, additions, or corrections, please contact Victoria Serrano.</p>`,
    `</ac:rich-text-body>`,
    `</ac:structured-macro>`
  ].join("");
  const finalParagraph = /(<p><em>Last Updated: 2026<\/em>\s*<em>For the Level Design Craft at King<\/em><\/p>)/i;
  if (finalParagraph.test(body)) {
    return {
      body: body.replace(finalParagraph, `${footerMacro}$1`),
      changed: true
    };
  }
  const lastLayoutClose = body.lastIndexOf("</ac:layout>");
  if (lastLayoutClose >= 0) {
    return {
      body: `${body.slice(0, lastLayoutClose)}${footerMacro}${body.slice(lastLayoutClose)}`,
      changed: true
    };
  }
  return {
    body: `${body}${footerMacro}`,
    changed: true
  };
}

function transformCareerBody(body) {
  let current = body;
  const changes = [];

  const titles = decorateCareerPanelTitles(current);
  current = titles.body;
  if (titles.changed) changes.push("Added icons to the career header and Quick Facts panel titles.");

  const header = addCareerHeaderLevelBadges(current);
  current = header.body;
  if (header.changed) changes.push("Added level badge row to career header panel.");

  const expands = wrapCareerMainColumnSections(current);
  current = expands.body;
  if (expands.changed) changes.push("Wrapped the 6 main H2 career sections in expand macros inside the main layout column.");

  const footer = addCareerCodexFooter(current);
  current = footer.body;
  if (footer.changed) changes.push("Added a Codex maintenance footer with contact guidance for future updates.");

  const visibleHeadings = decorateCareerVisibleHeadings(current);
  current = visibleHeadings.body;
  if (visibleHeadings.changed) changes.push("Added visible emoji prefixes directly to the main H2 section headings.");

  const sectionBadges = injectCareerSectionBadgeRows(current);
  current = sectionBadges.body;
  if (sectionBadges.changed) changes.push("Added colored badge rows directly under the main career sections for stronger visual contrast.");

  return { body: current, changes };
}

function transformFtbBody(body) {
  const updated = updateFtbDate(body);
  const changes = updated.changed ? ["Updated FtB header date from March 2026 to April 2026."] : [];
  return { body: updated.body, changes };
}

function verifyCareerBody(body) {
  return {
    hasExpandMacros: (body.match(/ac:name="expand"/g) || []).length >= 5,
    hasHeaderBadges: body.includes("L8 Intern"),
    hasPathBadges: body.includes("IC Path") && body.includes("Leadership Path"),
    hasVisibleOverviewEmoji: body.includes("<h2>🧭 Overview &amp; Philosophy</h2>") || body.includes("<h2>🧭 Overview and Philosophy</h2>"),
    hasVisibleCareerPathEmoji: body.includes("<h2>🪜 Career Path: L8 → L13</h2>"),
    hasCodexFooter: body.includes("Maintained with Codex") || body.includes("updated using a Codex script"),
    hasQuickFactsIcon: body.includes("📌 Quick Facts"),
    hasHeaderIcon: body.includes("🪜 Level Design Career Guide")
  };
}

function verifyFtbBody(body) {
  return {
    hasAprilDate: body.includes("Last updated: April 2026"),
    stillHasHeaderPanel: body.includes("Feed the Bear — Level Design")
  };
}

async function cdpFetchJson(endpoint) {
  let response;
  try {
    response = await fetch(`${CDP_URL}${endpoint}`);
  } catch (error) {
    throw new Error(`CDP connection failed at ${CDP_URL}${endpoint}: ${error.message}`);
  }
  if (!response.ok) {
    throw new Error(`CDP ${endpoint} failed: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

async function cdpSend(wsUrl, method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = Math.floor(Math.random() * 1e9);
    const ws = new WebSocket(wsUrl);
    const timeout = setTimeout(() => {
      try {
        ws.close();
      } catch (err) {
        // ignore close errors
      }
      reject(new Error(`CDP timeout for ${method}`));
    }, 30000);

    ws.addEventListener("open", () => {
      ws.send(JSON.stringify({ id, method, params }));
    });
    ws.addEventListener("message", (event) => {
      const payload = JSON.parse(typeof event.data === "string" ? event.data : event.data.toString());
      if (payload.id !== id) return;
      clearTimeout(timeout);
      ws.close();
      if (payload.error) reject(new Error(`CDP ${method} error: ${payload.error.message}`));
      else resolve(payload.result);
    });
    ws.addEventListener("error", (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

async function evalInPage(wsUrl, expression) {
  const result = await cdpSend(wsUrl, "Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true
  });
  return result?.result?.value;
}

async function ensureKingfluencePageTarget(pageId) {
  const version = await cdpFetchJson("/json/version");
  const existingTargets = await cdpFetchJson("/json");
  const pageFragment = `pageId=${pageId}`;
  let target = existingTargets.find((entry) => entry.type === "page" && String(entry.url || "").includes(pageFragment));
  if (!target) {
    const created = await cdpSend(version.webSocketDebuggerUrl, "Target.createTarget", {
      url: `${BASE_URL}/pages/viewpage.action?pageId=${pageId}`
    });
    await new Promise((resolve) => setTimeout(resolve, 3000));
    const refreshedTargets = await cdpFetchJson("/json");
    target = refreshedTargets.find((entry) => entry.type === "page" && entry.id === created.targetId);
  }
  if (!target?.webSocketDebuggerUrl) throw new Error("Could not obtain a CDP page target for Kingfluence.");
  await cdpSend(target.webSocketDebuggerUrl, "Page.enable");
  await cdpSend(target.webSocketDebuggerUrl, "Runtime.enable");
  const currentUrl = await evalInPage(target.webSocketDebuggerUrl, "window.location.href");
  if (String(currentUrl || "").match(/okta|login|sso/i)) {
    throw new Error(`Browser session is on SSO/Okta (${currentUrl}). Sign in first, then re-run.`);
  }
  return target.webSocketDebuggerUrl;
}

async function pageContextRequest(wsUrl, endpoint, method = "GET", body = null) {
  const expression = `(() => {
    const endpoint = ${JSON.stringify(endpoint)};
    const method = ${JSON.stringify(method)};
    const payload = ${JSON.stringify(body)};
    const headers = {
      "Accept": "application/json"
    };
    if (method !== "GET") {
      headers["Content-Type"] = "application/json";
      headers["X-Atlassian-Token"] = "no-check";
    }
    return fetch(endpoint, {
      method,
      credentials: "include",
      headers,
      body: payload ? JSON.stringify(payload) : undefined
    }).then(async (response) => ({
      ok: response.ok,
      status: response.status,
      text: await response.text()
    }));
  })()`;
  return evalInPage(wsUrl, expression);
}

function authMode() {
  const token = readEnvValue("CONFLUENCE_TOKEN");
  if (token) {
    return { type: "token", token };
  }
  return { type: "cdp" };
}

async function getPage(pageId, auth) {
  const endpoint = `${BASE_URL}/rest/api/content/${pageId}?expand=body.storage,version`;
  if (auth.type === "token") {
    const response = await fetch(endpoint, {
      headers: {
        "Authorization": `Bearer ${auth.token}`,
        "Accept": "application/json"
      }
    });
    if (!response.ok) {
      throw new Error(`GET page ${pageId} failed: ${response.status} ${await response.text()}`);
    }
    return response.json();
  }
  const wsUrl = await ensureKingfluencePageTarget(pageId);
  const result = await pageContextRequest(wsUrl, endpoint, "GET");
  if (!result?.ok) {
    throw new Error(`CDP GET page ${pageId} failed: ${result?.status} ${result?.text?.slice(0, 600)}`);
  }
  return JSON.parse(result.text);
}

async function putPage(pageId, title, body, currentVersion, auth) {
  const endpoint = `${BASE_URL}/rest/api/content/${pageId}`;
  const payload = {
    id: pageId,
    type: "page",
    title,
    version: { number: Number(currentVersion) + 1 },
    body: {
      storage: {
        value: body,
        representation: "storage"
      }
    }
  };
  if (auth.type === "token") {
    const response = await fetch(endpoint, {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${auth.token}`,
        "Accept": "application/json",
        "Content-Type": "application/json",
        "X-Atlassian-Token": "no-check"
      },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      throw new Error(`PUT page ${pageId} failed: ${response.status} ${await response.text()}`);
    }
    return response.json();
  }
  const wsUrl = await ensureKingfluencePageTarget(pageId);
  const result = await pageContextRequest(wsUrl, endpoint, "PUT", payload);
  if (!result?.ok) {
    throw new Error(`CDP PUT page ${pageId} failed: ${result?.status} ${result?.text?.slice(0, 900)}`);
  }
  return JSON.parse(result.text);
}

function buildOutputSnapshotPath(pageId) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return path.join(process.cwd(), "output", "confluence", `page_${pageId}_before_${stamp}.html`);
}

function saveSnapshot(pageId, body) {
  const outPath = buildOutputSnapshotPath(pageId);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, body, "utf8");
  return outPath;
}

function runSelfTest() {
  const careerSample = [
    `<ac:layout><ac:layout-section ac:type="two_left_sidebar">`,
    `<ac:layout-cell><p>Quick Facts</p></ac:layout-cell>`,
    `<ac:layout-cell><h2>Summary: Your Career Path Is Up to You</h2><p>Alpha</p><h2>Overview &amp; Philosophy</h2><p>Beta</p><h2>Career Path: L8 → L13</h2><p>Gamma</p><h2>Your PDP — How to Use It</h2><p>Delta</p><h2>End of Year &amp; Feedback — Talent Month</h2><p>Epsilon</p><h2>Quick Links &amp; Resources</h2><p>Zeta</p></ac:layout-cell>`,
    `</ac:layout-section></ac:layout>`,
    `<ac:structured-macro ac:name="panel"><ac:parameter ac:name="title">Level Design Career Guide</ac:parameter><ac:rich-text-body><p>Header</p></ac:rich-text-body></ac:structured-macro>`
  ].join("");
  const headerResult = addCareerHeaderLevelBadges(careerSample);
  const expandResult = wrapCareerMainColumnSections(headerResult.body);
  const checks = verifyCareerBody(expandResult.body);
  if (!checks.hasExpandMacros || !checks.hasHeaderBadges) {
    throw new Error(`Self-test failed: ${JSON.stringify(checks)}`);
  }
  console.log("Self-test passed.");
}

async function main() {
  if (process.argv.includes("--self-test")) {
    runSelfTest();
    return;
  }

  const auth = authMode();
  console.log(`Kingfluence page template updater`);
  console.log(`Auth mode: ${auth.type}`);

  const pages = [
    {
      id: CAREER_PAGE_ID,
      expectedTitle: CAREER_PAGE_TITLE,
      transform: transformCareerBody,
      verify: verifyCareerBody
    },
    {
      id: FTB_PAGE_ID,
      expectedTitle: FTB_PAGE_TITLE,
      transform: transformFtbBody,
      verify: verifyFtbBody
    }
  ];

  for (const page of pages) {
    console.log(`\nFetching page ${page.id}...`);
    const current = await getPage(page.id, auth);
    const title = current.title || page.expectedTitle;
    const body = current?.body?.storage?.value || "";
    const version = Number(current?.version?.number || 0);
    const snapshotPath = saveSnapshot(page.id, body);
    console.log(`  Title: ${title}`);
    console.log(`  Version: ${version}`);
    console.log(`  Snapshot: ${snapshotPath}`);

    const transformed = page.transform(body);
    if (!transformed.changes.length) {
      console.log("  No content changes needed.");
      const checks = page.verify(body);
      console.log(`  Verify: ${JSON.stringify(checks)}`);
      continue;
    }

    console.log(`  Changes:`);
    transformed.changes.forEach((entry) => console.log(`    - ${entry}`));

    const result = await putPage(page.id, title, transformed.body, version, auth);
    console.log(`  Published version ${result?.version?.number}`);

    const refreshed = await getPage(page.id, auth);
    const checks = page.verify(refreshed?.body?.storage?.value || "");
    console.log(`  Verify: ${JSON.stringify(checks)}`);
  }
}

main().catch((error) => {
  console.error(`ERROR: ${error.message}`);
  if (String(error.message || "").includes("CDP")) {
    console.error(`Start Chrome with remote debugging and ensure Kingfluence is signed in.`);
    console.error(`Example: open -na 'Google Chrome' --args --remote-debugging-port=9222 --remote-allow-origins='*'`);
  }
  process.exit(1);
});
