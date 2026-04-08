/**
 * Google OAuth 2.0 Setup - Interactive
 * 
 * This script helps you set up OAuth 2.0 credentials for Google Sheets access
 */

import open from 'open';
import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
];

function createInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
}

async function prompt(rl, question) {
  return new Promise(resolve => {
    rl.question(question, resolve);
  });
}

async function setupOAuth() {
  console.log('\n🔐 Google OAuth 2.0 Setup\n');
  console.log('='.repeat(60));
  console.log('\nThis will help you set up OAuth credentials.\n');
  
  const rl = createInterface();
  
  // Step 1: Check for credentials.json
  const credPath = path.join(__dirname, '../credentials.json');
  
  if (!fs.existsSync(credPath)) {
    console.log('\n⚠️  credentials.json not found!\n');
    console.log('You need to create OAuth credentials first:');
    console.log('\n1. Go to: https://console.cloud.google.com/apis/credentials');
    console.log('2. Click "Create Credentials" → OAuth 2.0 Client ID');
    console.log('3. Choose "Desktop application"');
    console.log('4. Download the JSON file');
    console.log('5. Save it as: credentials.json in this directory\n');
    
    const hasFile = await prompt(rl, 'Did you save credentials.json? (yes/no): ');
    
    if (hasFile.toLowerCase() !== 'yes') {
      console.log('\nSetup cancelled.\n');
      rl.close();
      return;
    }
  }
  
  // Step 2: Load credentials
  try {
    const credentials = JSON.parse(fs.readFileSync(credPath, 'utf8'));
    const { client_id, client_secret, redirect_uris } = credentials.installed || credentials.web || {};
    
    const auth = new google.auth.OAuth2(
      client_id,
      client_secret,
      redirect_uris?.[0] || 'http://localhost:3000/callback'
    );
    
    // Generate auth URL
    const authUrl = auth.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
    });
    
    console.log('\n📝 Opening Google login page...\n');
    console.log('URL: ' + authUrl + '\n');
    
    // Try to open browser
    try {
      await open(authUrl);
      console.log('✅ Browser opened automatically\n');
    } catch {
      console.log('ℹ️  If browser didn\'t open, visit the URL above\n');
    }
    
    // Get authorization code
    const code = await prompt(rl, 'Enter the authorization code from the page: ');
    
    // Exchange code for token
    console.log('\n⏳ Getting access token...\n');
    
    let token;
    try {
      const response = await auth.getToken(code);
      token = response.tokens;
    } catch (error) {
      console.log('❌ Error: Invalid authorization code\n');
      console.log('Make sure you copied the entire code.\n');
      rl.close();
      return;
    }
    
    // Save token
    const tokenPath = path.join(__dirname, '../.token.json');
    fs.writeFileSync(tokenPath, JSON.stringify(token, null, 2));
    
    console.log('✅ Token saved to .token.json\n');
    console.log('='.repeat(60));
    console.log('\n🎉 OAuth setup complete!\n');
    console.log('You can now run:');
    console.log('  npm run sync:sheets:local');
    console.log('  npm run sync:drive-sheets    (sync Drive to Sheets)\n');
    
  } catch (error) {
    console.log('\n❌ Error: ' + error.message + '\n');
  }
  
  rl.close();
}

setupOAuth();
