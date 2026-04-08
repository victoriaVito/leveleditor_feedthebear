import https from 'https';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Parallel API Synchronization Manager
 *
 * Available models registry. Each entry includes:
 *   - status: 'active' (works now) | 'no_credits' (key valid, needs billing) | 'no_key' (needs key)
 *   - provider: gemini | openai | claude
 *
 * Select a model by setting MODEL env var or passing it to syncAPIsInParallel().
 * Default: gemini-2.5-flash
 */

const MODELS = {
  // ── GEMINI (Google) ── covered by current API key ──
  'gemini-2.5-flash': {
    provider: 'gemini',
    status: 'active',
    label: 'Gemini 2.5 Flash (free)',
    apiKey: process.env.GOOGLE_API_KEY,
  },
  'gemini-flash-latest': {
    provider: 'gemini',
    status: 'active',
    label: 'Gemini Flash Latest (free)',
    apiKey: process.env.GOOGLE_API_KEY,
  },

  // ── GEMINI (quota exhausted on free tier) ──
  'gemini-2.5-pro': {
    provider: 'gemini',
    status: 'no_credits',
    label: 'Gemini 2.5 Pro (needs billing)',
    apiKey: process.env.GOOGLE_API_KEY,
  },
  'gemini-2.0-flash': {
    provider: 'gemini',
    status: 'no_credits',
    label: 'Gemini 2.0 Flash (needs billing)',
    apiKey: process.env.GOOGLE_API_KEY,
  },

  // ── OPENAI ── keys valid, needs API credits ──
  'gpt-4o-mini': {
    provider: 'openai',
    status: 'no_credits',
    label: 'GPT-4o Mini (needs API credits)',
    apiKey: process.env.OPENAI_API_KEY,
  },
  'gpt-4o': {
    provider: 'openai',
    status: 'no_credits',
    label: 'GPT-4o (needs API credits)',
    apiKey: process.env.OPENAI_API_KEY,
  },

  // ── CLAUDE ── key valid, needs API credits ──
  'claude-sonnet-4-5-20250929': {
    provider: 'claude',
    status: 'no_credits',
    label: 'Claude Sonnet 4.5 (needs API credits)',
    apiKey: process.env.ANTHROPIC_API_KEY,
  },
  'claude-haiku-3-5-20241022': {
    provider: 'claude',
    status: 'no_credits',
    label: 'Claude Haiku 3.5 (needs API credits)',
    apiKey: process.env.ANTHROPIC_API_KEY,
  },
};

const DEFAULT_MODEL = process.env.MODEL || 'gemini-2.5-flash';

/**
 * HTTPS POST helper (native, no axios)
 */
function httpsPost(url, body, headers, timeoutMs = 60000) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const data = JSON.stringify(body);
    const req = https.request(
      {
        hostname: parsedUrl.hostname,
        path: parsedUrl.pathname + parsedUrl.search,
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
        timeout: timeoutMs,
      },
      (res) => {
        let responseBody = '';
        res.on('data', (chunk) => (responseBody += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(responseBody) });
          } catch {
            resolve({ status: res.statusCode, data: responseBody });
          }
        });
      }
    );
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

/**
 * Call any model by name
 */
async function callModel(modelName, prompt) {
  const model = MODELS[modelName];
  if (!model) {
    return { api: modelName, success: false, error: `Unknown model: ${modelName}` };
  }

  if (model.status === 'no_credits') {
    return { api: model.label, success: false, error: 'skipped (needs billing/credits)', skipped: true };
  }

  if (model.status === 'no_key' || !model.apiKey) {
    return { api: model.label, success: false, error: 'skipped (no API key configured)', skipped: true };
  }

  try {
    if (model.provider === 'gemini') return await _callGemini(modelName, model, prompt);
    if (model.provider === 'openai') return await _callOpenAI(modelName, model, prompt);
    if (model.provider === 'claude') return await _callClaude(modelName, model, prompt);
    return { api: model.label, success: false, error: `Unknown provider: ${model.provider}` };
  } catch (error) {
    return { api: model.label, success: false, error: error.message };
  }
}

async function _callGemini(modelName, model, prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${model.apiKey}`;
  const res = await httpsPost(url, { contents: [{ parts: [{ text: prompt }] }] }, {});
  if (res.status === 200 && res.data.candidates?.[0]) {
    return { api: model.label, success: true, data: res.data.candidates[0].content.parts[0].text };
  }
  throw new Error(res.data.error?.message || `HTTP ${res.status}`);
}

async function _callOpenAI(modelName, model, prompt) {
  const res = await httpsPost(
    'https://api.openai.com/v1/chat/completions',
    { model: modelName, messages: [{ role: 'user', content: prompt }], max_tokens: 2000 },
    { Authorization: `Bearer ${model.apiKey}` }
  );
  if (res.status === 200) {
    return { api: model.label, success: true, data: res.data.choices[0].message.content.trim() };
  }
  throw new Error(res.data.error?.message || `HTTP ${res.status}`);
}

async function _callClaude(modelName, model, prompt) {
  const res = await httpsPost(
    'https://api.anthropic.com/v1/messages',
    { model: modelName, max_tokens: 2000, messages: [{ role: 'user', content: prompt }] },
    { 'x-api-key': model.apiKey, 'anthropic-version': '2024-10-22' }
  );
  if (res.status === 200 && res.data.content?.[0]) {
    return { api: model.label, success: true, data: res.data.content[0].text };
  }
  throw new Error(res.data.error?.message || `HTTP ${res.status}`);
}

/**
 * List all models with their status
 */
export function listModels() {
  console.log('\n📋 Available models:\n');
  const active = [];
  const inactive = [];
  for (const [name, model] of Object.entries(MODELS)) {
    const line = `  ${model.status === 'active' ? '✓' : '⊘'} ${name.padEnd(30)} ${model.label}`;
    if (model.status === 'active') active.push(line);
    else inactive.push(line);
  }
  console.log('  ── Active (ready to use) ──');
  active.forEach((l) => console.log(l));
  console.log('\n  ── Inactive (need billing) ──');
  inactive.forEach((l) => console.log(l));
  console.log(`\n  Default model: ${DEFAULT_MODEL}\n`);
}

/**
 * Execute selected models in parallel
 * @param {string} prompt
 * @param {string[]} modelNames - defaults to all active models
 */
export async function syncAPIsInParallel(prompt, modelNames) {
  const names = modelNames || Object.entries(MODELS).filter(([, m]) => m.status === 'active').map(([n]) => n);

  console.log(`🚀 Calling ${names.length} model(s): ${names.join(', ')}\n`);

  const results = await Promise.all(names.map((n) => callModel(n, prompt)));

  results.forEach((result) => {
    if (result.success) {
      console.log(`✓ ${result.api}: ${result.data.substring(0, 200)}...`);
    } else if (result.skipped) {
      console.log(`⊘ ${result.api}: ${result.error}`);
    } else {
      console.log(`✗ ${result.api}: ${result.error}`);
    }
  });
  console.log();

  return results;
}

/**
 * Sync Spreadsheet with AI insights
 */
export async function syncSheetWithAIInsights(sheetData) {
  console.log('📊 Syncing spreadsheet with AI insights...\n');
  const enrichedData = [];
  for (const row of sheetData) {
    const prompt = `Analyze this game level: "${row.name}". Provide a brief description focusing on difficulty and mechanics.`;
    try {
      const aiResults = await syncAPIsInParallel(prompt);
      enrichedData.push({ ...row, aiInsights: aiResults.filter((r) => r.success) });
    } catch (error) {
      console.error(`Failed to process row: ${row.name}`, error.message);
    }
  }
  return enrichedData;
}

async function main() {
  // Show available models
  listModels();

  // Run test with default active models
  const testPrompt = 'Generate a brief description of a mini-game level with increasing difficulty.';
  const results = await syncAPIsInParallel(testPrompt);

  console.log('📈 Summary:');
  console.log(`  Successful: ${results.filter((r) => r.success).length}`);
  console.log(`  Skipped: ${results.filter((r) => r.skipped).length}`);
  console.log(`  Failed: ${results.filter((r) => !r.success && !r.skipped).length}`);
}

export { main, MODELS, callModel };
