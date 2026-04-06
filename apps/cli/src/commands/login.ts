import axios from 'axios';
import * as readline from 'readline';
import { saveLicense, saveToken, ensureConfigDir } from '../auth/license';

// Use local Supabase for development, production URL for deployed
const API_BASE = process.env.REALITYDB_API_URL || 'https://tfpcfvowqaoinzqwldrl.supabase.co/functions/v1';

async function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

export async function loginCommand(options: { apiKey?: string; token?: string }) {
  console.log('\n🔐 Authenticating with RealityDB...\n');
  
  let apiKey = options.apiKey;
  
  if (!apiKey) {
    apiKey = await prompt('Enter your API key (get it from https://realitydb.dev/dashboard): ');
  }
  
  if (!apiKey || apiKey.trim() === '') {
    console.error('\n❌ API key is required.\n');
    process.exit(1);
  }
  
  try {
    console.log('Verifying API key with Supabase...');
    
    // Call Supabase Edge Function
    const response = await axios.post(`${API_BASE}/validate-api-key`, {
      api_key: apiKey.trim()
    });
    
    const { license } = response.data;
    
    // Save license
    ensureConfigDir();
    saveLicense(license);
    saveToken({
      access_token: apiKey,
      refresh_token: '',
      expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
    });
    
    console.log(`\n✅ Successfully logged in!`);
    console.log(`   Email: ${license.email}`);
    console.log(`   Plan: ${license.tier.toUpperCase()}`);
    console.log(`\n   Run 'realitydb status' to see details\n`);
    
  } catch (error: any) {
    if (error.response?.status === 401) {
      console.error('\n❌ Invalid API key. Please check and try again.\n');
    } else if (error.response?.status === 400) {
      console.error(`\n❌ ${error.response.data.error}\n`);
    } else {
      console.error(`\n❌ Authentication failed: ${error.message}\n`);
    }
    process.exit(1);
  }
}