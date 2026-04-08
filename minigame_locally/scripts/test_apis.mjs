#!/usr/bin/env node

/**
 * Test script for the parallel API sync module.
 * Shows available models and runs a test prompt.
 */

import { syncAPIsInParallel, listModels } from './sync_apis_parallel.mjs';

async function test() {
  console.log('🚀 Testing Parallel AI APIs\n');
  console.log('='.repeat(50));

  // Show all models and their status
  listModels();

  const testPrompt = 'Describe a video game level called "Crystal Cavern" in 1-2 sentences.';

  console.log(`📝 Test Prompt: "${testPrompt}"\n`);

  try {
    // Test with all active models by default
    const results = await syncAPIsInParallel(testPrompt);

    console.log('='.repeat(50));
    console.log(`\n📊 Summary:`);
    console.log(`  Total: ${results.length}`);
    console.log(`  Success: ${results.filter((r) => r.success).length}`);
    console.log(`  Skipped: ${results.filter((r) => r.skipped).length}`);
    console.log(`  Failed: ${results.filter((r) => !r.success && !r.skipped).length}`);
    console.log();

    // Also test selecting a specific model
    console.log('='.repeat(50));
    console.log('\n🎯 Testing specific model selection: gemini-2.5-flash\n');
    const specific = await syncAPIsInParallel(testPrompt, ['gemini-2.5-flash']);
    console.log(`Result: ${specific[0].success ? '✓' : '✗'}\n`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

test();
