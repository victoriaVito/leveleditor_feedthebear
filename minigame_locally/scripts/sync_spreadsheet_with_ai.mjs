#!/usr/bin/env node

/**
 * Full Spreadsheet + Parallel AI APIs Integration
 * 
 * This script:
 * 1. Tests parallel AI API calls
 * 2. Demonstrates enrichment pattern for game levels
 * 3. Can integrate with Drive/Sheets later
 */

import { syncAPIsInParallel } from './sync_apis_parallel.mjs';

async function enrichSheetWithAI(sheetData) {
  console.log('🤖 Enriching sheet data with AI insights...\n');

  const enrichedRows = [];

  for (const row of sheetData) {
    if (!row.name) continue;

    const prompt = `You are a game level designer. Analyze this game level name: "${row.name}". 
Provide a JSON response with:
- difficulty: "easy" | "medium" | "hard"
- genre: brief genre classification
- recommended_mechanics: array of 2-3 mechanics that would work well`;

    try {
      console.log(`⏳ Processing: ${row.name}`);
      const results = await syncAPIsInParallel(prompt);

      const successfulResults = results.filter((r) => r.success);
      enrichedRows.push({
        ...row,
        aiInsights: {
          processed: true,
          resultCount: successfulResults.length,
          timestamp: new Date().toISOString(),
        },
      });
      console.log(`✅ Done: ${row.name}\n`);
    } catch (error) {
      console.error(`❌ Error processing ${row.name}:`, error.message);
      enrichedRows.push({
        ...row,
        aiInsights: {
          processed: false,
          error: error.message,
        },
      });
    }
  }

  return enrichedRows;
}

async function main() {
  try {
    console.log('🎮 Minigame Spreadsheet + AI APIs Sync Pipeline\n');
    console.log('='.repeat(50));
    console.log('Testing Parallel AI APIs Integration');
    console.log('='.repeat(50) + '\n');

    // Demo data (replace with real sheet data later)
    const demoGameLevels = [
      { name: 'Level 01 - Tutorial Basics', id: 1 },
      { name: 'Level 02 - Double Jump', id: 2 },
      { name: 'Level 03 - Puzzle Time', id: 3 },
      { name: 'Level 04 - Boss Battle', id: 4 },
    ];

    console.log(`📊 Testing with ${demoGameLevels.length} demo game levels\n`);

    // Enrich demo data with AI APIs
    const enrichedData = await enrichSheetWithAI(demoGameLevels);

    const successCount = enrichedData.filter(
      (r) => r.aiInsights?.processed === true
    ).length;
    const failureCount = enrichedData.filter(
      (r) => r.aiInsights?.processed === false
    ).length;

    console.log('\n' + '='.repeat(50));
    console.log('Summary');
    console.log('='.repeat(50));
    console.log(`Total rows processed: ${enrichedData.length}`);
    console.log(`Successfully enriched: ${successCount}`);
    console.log(`Failed: ${failureCount}`);
    console.log(`Timestamp: ${new Date().toISOString()}\n`);

    // Return results for possible further processing
    return {
      success: true,
      sheetData: enrichedData,
      stats: {
        total: enrichedData.length,
        success: successCount,
        failed: failureCount,
      },
    };
  } catch (error) {
    console.error('\n❌ Pipeline failed:', error.message);
    process.exit(1);
  }
}

main();
