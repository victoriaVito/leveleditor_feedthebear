#!/usr/bin/env node
/**
 * ROUTE-005 (CDP): Update the "Level Reconstructions" expand macro on Kingfluence
 * using an already-signed-in browser session (cookies), via Chrome DevTools Protocol.
 *
 * This avoids sharing tokens/passwords with the agent: you just sign in in the browser.
 *
 * Prereqs:
 * - Start Brave/Chrome with remote debugging, then sign in to Kingfluence:
 *   open -na "Brave Browser" --args --remote-debugging-port=9222
 *
 * Run:
 * - node scripts/update_kingfluence_recon_cdp.mjs
 *
 * Env:
 * - KINGFLUENCE_CDP_URL (default: http://127.0.0.1:9222)
 * - KINGFLUENCE_PAGE_ID (default: 990479168)
 * - KINGFLUENCE_EXPAND_TITLE (default: Level Reconstructions)
 */

const CDP_URL = process.env.KINGFLUENCE_CDP_URL || "http://127.0.0.1:9222";
const PAGE_ID = process.env.KINGFLUENCE_PAGE_ID || "990479168";
const EXPAND_TITLE = process.env.KINGFLUENCE_EXPAND_TITLE || "Level Reconstructions";
const BASE_URL = "https://kingfluence.com";

const NEW_RECON_BODY = String.raw`
<h3>Reconstruction Summary (2026-03-26)</h3>
<p>29 levels reconstructed or mapped from images. All data extracted from canonical JSON files.</p>
<table>
  <tbody>
    <tr><th>Category</th><th>Count</th><th>Action</th><th>Location</th></tr>
    <tr><td>Editor images (image11&#8211;28)</td><td>7</td><td>Reconstructed from screenshots</td><td><code>levels/image*_level_editor.json</code></td></tr>
    <tr><td>Timestamped variants</td><td>6</td><td>Reconstructed from screenshots</td><td><code>levels/p_2_4_new_*.json</code> etc.</td></tr>
    <tr><td>After-feedback aliases</td><td>23</td><td>Mapped to existing canonical JSONs</td><td>No new files &#8212; alias naming only</td></tr>
    <tr><td>Flow Free benchmark</td><td>16</td><td>Reconstructed from mobile screenshots</td><td><code>levels/benchmark_flow_free/ff_nivel*.json</code></td></tr>
    <tr><td>Contact sheets / non-levels</td><td>3</td><td>Skipped</td><td>&#8212;</td></tr>
  </tbody>
</table>

<h3>Editor Image Reconstructions (7 levels)</h3>
<table>
  <tbody>
    <tr><th>File</th><th>Grid</th><th>Pairs</th><th>Blockers</th></tr>
    <tr><td>image11_level_editor</td><td>5&#215;5</td><td>3</td><td>3</td></tr>
    <tr><td>image19_level_editor</td><td>5&#215;5</td><td>3</td><td>1</td></tr>
    <tr><td>image20_level_editor</td><td>5&#215;5</td><td>3</td><td>1</td></tr>
    <tr><td>image21_level_editor</td><td>5&#215;5</td><td>3</td><td>2</td></tr>
    <tr><td>image24_level_editor</td><td>5&#215;5</td><td>3</td><td>2</td></tr>
    <tr><td>image25_level_editor</td><td>5&#215;5</td><td>3</td><td>0</td></tr>
    <tr><td>image28_level_editor</td><td>5&#215;5</td><td>2</td><td>1</td></tr>
  </tbody>
</table>

<h3>Timestamped Variant Reconstructions (6 levels)</h3>
<table>
  <tbody>
    <tr><th>File</th><th>Grid</th><th>Pairs</th><th>Blockers</th></tr>
    <tr><td>p_2_4_new_20260310165931</td><td>6&#215;6</td><td>4</td><td>3</td></tr>
    <tr><td>p_2_5_new_20260310170335</td><td>7&#215;7</td><td>4</td><td>8</td></tr>
    <tr><td>p_2_6_new_20260310170645</td><td>6&#215;6</td><td>3</td><td>3</td></tr>
    <tr><td>p_2_9_new_20260310195328</td><td>8&#215;8</td><td>4</td><td>3</td></tr>
    <tr><td>p_4_c_new_20260311075908</td><td>7&#215;7</td><td>4</td><td>9</td></tr>
    <tr><td>level_2</td><td>5&#215;5</td><td>3</td><td>1</td></tr>
  </tbody>
</table>

<h3>Flow Free Benchmark Levels (16 levels)</h3>
<p>These levels were reconstructed from Flow Free mobile screenshots to establish difficulty benchmarks for FtB board design. All are classified as HARD.</p>
<table>
  <tbody>
    <tr><th>Level</th><th>Grid</th><th>Pairs</th><th>Blockers</th><th>Patterns</th></tr>
    <tr><td>ff_nivel3_8x8</td><td>8&#215;8</td><td>6</td><td>6</td><td>blocker_cluster_chokepoint, high_coverage_difficulty</td></tr>
    <tr><td>ff_nivel4_8x8</td><td>8&#215;8</td><td>6</td><td>4</td><td>long_distance_endpoints, high_coverage_difficulty</td></tr>
    <tr><td>ff_nivel5_8x8</td><td>8&#215;8</td><td>6</td><td>8</td><td>blocker_cluster_chokepoint, high_coverage_difficulty</td></tr>
    <tr><td>ff_nivel5_9x9</td><td>8&#215;9</td><td>8</td><td>0</td><td>zero_blocker_pure_interference, pair_scaling_benchmark</td></tr>
    <tr><td>ff_nivel6_8x8</td><td>8&#215;8</td><td>7</td><td>3</td><td>pair_scaling_benchmark, nested_route_structure</td></tr>
    <tr><td>ff_nivel6v2_8x8</td><td>8&#215;8</td><td>7</td><td>0</td><td>zero_blocker_pure_interference, nested_route_structure</td></tr>
    <tr><td>ff_nivel7a_8x8</td><td>8&#215;8</td><td>8</td><td>4</td><td>pair_scaling_benchmark, nested_route_structure</td></tr>
    <tr><td>ff_nivel7b_8x8</td><td>8&#215;8</td><td>8</td><td>12</td><td>zero_blocker_pure_interference, long_distance_endpoints</td></tr>
    <tr><td>ff_nivel9a_8x8</td><td>8&#215;8</td><td>7</td><td>8</td><td>blocker_cluster_chokepoint, nested_route_structure</td></tr>
    <tr><td>ff_nivel9b_9x9</td><td>9&#215;9</td><td>10</td><td>0</td><td>zero_blocker_pure_interference, pair_scaling_benchmark</td></tr>
    <tr><td>ff_nivel11_9x9</td><td>9&#215;9</td><td>9</td><td>4</td><td>pair_scaling_benchmark, nested_route_structure</td></tr>
    <tr><td>ff_nivel13_8x8</td><td>8&#215;8</td><td>7</td><td>0</td><td>zero_blocker_pure_interference, pair_scaling_benchmark</td></tr>
    <tr><td>ff_nivel15_9x9</td><td>9&#215;9</td><td>8</td><td>5</td><td>blocker_cluster_chokepoint, long_distance_endpoints</td></tr>
    <tr><td>ff_nivel16_8x8</td><td>8&#215;8</td><td>6</td><td>6</td><td>blocker_cluster_chokepoint, perimeter_wrap_route</td></tr>
    <tr><td>ff_nivel32_8x8</td><td>8&#215;8</td><td>7</td><td>4</td><td>long_distance_endpoints, nested_route_structure</td></tr>
    <tr><td>ff_nivel34_8x8</td><td>8&#215;8</td><td>7</td><td>4</td><td>long_distance_endpoints, nested_route_structure</td></tr>
  </tbody>
</table>

<h3>Pattern Glossary</h3>
<table>
  <tbody>
    <tr><th>Pattern</th><th>Description</th></tr>
    <tr><td><strong>blocker_cluster_chokepoint</strong></td><td>Blockers form clusters that create narrow passages, forcing specific route choices</td></tr>
    <tr><td><strong>zero_blocker_pure_interference</strong></td><td>No blockers &#8212; all difficulty comes from path interference between pairs</td></tr>
    <tr><td><strong>pair_scaling_benchmark</strong></td><td>High pair count relative to board size tests scaling behavior</td></tr>
    <tr><td><strong>nested_route_structure</strong></td><td>Solutions require paths that wrap around each other in nested patterns</td></tr>
    <tr><td><strong>long_distance_endpoints</strong></td><td>Pair endpoints placed far apart, forcing long paths that consume board space</td></tr>
    <tr><td><strong>perimeter_wrap_route</strong></td><td>Optimal solutions use board edges, creating wrap-around paths</td></tr>
    <tr><td><strong>high_coverage_difficulty</strong></td><td>Most board cells must be used, leaving minimal free space</td></tr>
  </tbody>
</table>
`.trim();

async function cdpFetch(endpoint) {
  const res = await fetch(`${CDP_URL}${endpoint}`);
  if (!res.ok) throw new Error(`CDP ${endpoint}: ${res.status} ${res.statusText}`);
  return res.json();
}

async function cdpSend(wsUrl, method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = Math.floor(Math.random() * 1e9);
    const WS = globalThis.WebSocket;
    if (!WS) return reject(new Error("WebSocket not available in this Node version."));
    const ws = new WS(wsUrl);
    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error(`CDP timeout: ${method}`));
    }, 30000);
    ws.addEventListener("open", () => ws.send(JSON.stringify({ id, method, params })));
    ws.addEventListener("message", (event) => {
      const msg = JSON.parse(typeof event.data === "string" ? event.data : event.data.toString());
      if (msg.id !== id) return;
      clearTimeout(timeout);
      ws.close();
      if (msg.error) reject(new Error(`CDP ${method}: ${msg.error.message}`));
      else resolve(msg.result);
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

async function main() {
  console.log("ROUTE-005 (CDP) — Kingfluence expand macro updater");
  console.log("===============================================\n");

  let version;
  try {
    version = await cdpFetch("/json/version");
    console.log(`Connected to CDP: ${version.Browser || "unknown"}`);
  } catch (err) {
    console.error(`ERROR: Cannot connect to CDP at ${CDP_URL}`);
    console.error("Start Brave with:");
    console.error('  open -na "Brave Browser" --args --remote-debugging-port=9222');
    process.exit(1);
  }

  const viewUrl = `${BASE_URL}/pages/viewpage.action?pageId=${PAGE_ID}`;
  const targets = await cdpFetch("/json");
  let target = targets.find((t) => t.type === "page" && t.url.includes(`pageId=${PAGE_ID}`));
  if (!target) {
    const created = await cdpSend(version.webSocketDebuggerUrl, "Target.createTarget", { url: viewUrl });
    const refreshed = await cdpFetch("/json");
    target = refreshed.find((t) => t.type === "page" && t.id === created.targetId);
    await new Promise((r) => setTimeout(r, 3500));
  }

  if (!target?.webSocketDebuggerUrl) {
    console.error("ERROR: Could not find/open a Kingfluence tab with a debugger WebSocket.");
    process.exit(1);
  }

  const wsUrl = target.webSocketDebuggerUrl;
  await cdpSend(wsUrl, "Page.enable");
  await cdpSend(wsUrl, "Runtime.enable");

  const currentUrl = await evalInPage(wsUrl, "window.location.href");
  if (String(currentUrl || "").match(/okta|login|sso/i)) {
    console.error("ERROR: Browser is on SSO/Okta login. Please sign in, then re-run this script.");
    console.error(`Current URL: ${currentUrl}`);
    process.exit(1);
  }

  // Execute the whole REST update inside the logged-in page context so cookies apply.
  const result = await evalInPage(
    wsUrl,
    `(() => {
      const PAGE_ID = ${JSON.stringify(PAGE_ID)};
      const EXPAND_TITLE = ${JSON.stringify(EXPAND_TITLE)};
      const NEW_RECON_BODY = ${JSON.stringify(NEW_RECON_BODY)};
      const API_URL = ${JSON.stringify(`${BASE_URL}/rest/api/content/`) } + PAGE_ID;

      const macroRe = new RegExp(
        '(<ac:structured-macro[^>]*ac:name=\"expand\"[^>]*>)' +
        '(.*?<ac:parameter[^>]*ac:name=\"title\"[^>]*>' + EXPAND_TITLE.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&') + '<\\\\/ac:parameter>.*?)' +
        '(<ac:rich-text-body>)([\\\\s\\\\S]*?)(<\\\\/ac:rich-text-body>)' +
        '([\\\\s\\\\S]*?<\\\\/ac:structured-macro>)',
        'i'
      );

      return (async () => {
        const getUrl = API_URL + '?expand=body.storage,version';
        const r = await fetch(getUrl, {
          method: 'GET',
          credentials: 'include',
          headers: { 'Accept': 'application/json' }
        });
        const text = await r.text();
        if (!r.ok) return { ok: false, stage: 'GET', status: r.status, body: text.slice(0, 600) };
        const data = JSON.parse(text);
        const body = data?.body?.storage?.value || '';
        const currentVersion = data?.version?.number;
        const title = data?.title || '';
        if (!macroRe.test(body)) {
          const idx = body.indexOf(EXPAND_TITLE);
          return {
            ok: false,
            stage: 'MATCH',
            error: 'Expand macro not matched',
            hasTitle: idx >= 0,
            context: idx >= 0 ? body.slice(Math.max(0, idx - 220), idx + 220) : ''
          };
        }
        const newBody = body.replace(macroRe, (match, g1, g2, g3, _old, g5, g6) => g1 + g2 + g3 + NEW_RECON_BODY + g5 + g6);

        const payload = {
          version: { number: Number(currentVersion || 0) + 1 },
          title,
          type: 'page',
          body: { storage: { value: newBody, representation: 'storage' } }
        };

        const put = await fetch(API_URL, {
          method: 'PUT',
          credentials: 'include',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'X-Atlassian-Token': 'no-check'
          },
          body: JSON.stringify(payload)
        });
        const putText = await put.text();
        if (!put.ok) return { ok: false, stage: 'PUT', status: put.status, body: putText.slice(0, 900) };
        const putJson = JSON.parse(putText);
        return { ok: true, newVersion: putJson?.version?.number, url: ${JSON.stringify(`${BASE_URL}/pages/viewpage.action?pageId=`)} + PAGE_ID };
      })();
    })()`
  );

  if (!result?.ok) {
    console.error("FAILED:", result);
    process.exit(1);
  }

  console.log("SUCCESS");
  console.log(`New version: ${result.newVersion}`);
  console.log(`URL: ${result.url}`);
}

main().catch((err) => {
  console.error("ERROR:", err?.stack || err?.message || err);
  process.exit(1);
});

