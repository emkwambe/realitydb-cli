import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { clearLicense, clearToken, loadLicense } from '../auth/license';

// ============================================
// Configuration
// ============================================

const CONFIG_DIR = path.join(os.homedir(), '.realitydb');
const CACHE_FILE = path.join(CONFIG_DIR, '.cache');

// ============================================
// Helper Functions
// ============================================

function clearCache(): void {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      fs.unlinkSync(CACHE_FILE);
    }
  } catch (error) {
    // Ignore cache clear errors
  }
}

function clearAllData(): void {
  clearLicense();
  clearToken();
  clearCache();
}

function getLicenseInfo(): { email?: string; tier?: string } | null {
  const license = loadLicense();
  if (!license) return null;
  return {
    email: license.email,
    tier: license.tier
  };
}

// ============================================
// Confirmation Prompts
// ============================================

async function confirmLogout(force: boolean): Promise<boolean> {
  if (force) return true;
  
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    readline.question('Are you sure you want to log out? (y/N): ', (answer: string) => {
      readline.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

async function confirmClearAll(force: boolean): Promise<boolean> {
  if (force) return true;
  
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    readline.question('⚠️  This will remove all local license data. Continue? (y/N): ', (answer: string) => {
      readline.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

// ============================================
// Main Logout Command
// ============================================

interface LogoutOptions {
  force?: boolean;
  clearAll?: boolean;
}

export async function logoutCommand(options: LogoutOptions = {}): Promise<void> {
  const licenseInfo = getLicenseInfo();
  
  // Check if already logged out
  if (!licenseInfo && !options.clearAll) {
    console.log(`
╔═══════════════════════════════════════════════════════════════╗
║  ℹ️  Already logged out                                       ║
║                                                               ║
║  No active session found.                                     ║
║                                                               ║
║  Run 'realitydb login' to authenticate.                      ║
╚═══════════════════════════════════════════════════════════════╝
    `);
    return;
  }
  
  // Handle clear-all mode
  if (options.clearAll) {
    console.log(`
╔═══════════════════════════════════════════════════════════════╗
║  ⚠️  Clear All Local Data                                     ║
║                                                               ║
║  This will remove:                                           ║
║    • License information                                     ║
║    • Authentication tokens                                   ║
║    • Local cache                                             ║
║    • Configuration files                                     ║
╚═══════════════════════════════════════════════════════════════╝
    `);
    
    const confirmed = await confirmClearAll(options.force || false);
    if (!confirmed) {
      console.log('\n❌ Clear all cancelled.\n');
      return;
    }
    
    clearAllData();
    
    console.log(`
╔═══════════════════════════════════════════════════════════════╗
║  ✅ All local data cleared                                    ║
║                                                               ║
║  • License removed                                           ║
║  • Tokens removed                                            ║
║  • Cache cleared                                             ║
║                                                               ║
║  Run 'realitydb login' to authenticate again.               ║
╚═══════════════════════════════════════════════════════════════╝
    `);
    return;
  }
  
  // Normal logout
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║  🔐 Logout Confirmation                                       ║
║                                                               ║
║  Currently logged in as: ${licenseInfo?.email || 'unknown'}                    ║
║  Plan: ${licenseInfo?.tier?.toUpperCase() || 'unknown'}                                ║
╚═══════════════════════════════════════════════════════════════╝
  `);
  
  const confirmed = await confirmLogout(options.force || false);
  
  if (!confirmed) {
    console.log('\n❌ Logout cancelled.\n');
    return;
  }
  
  // Clear license and tokens
  clearLicense();
  clearToken();
  
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║  ✅ Successfully logged out                                   ║
║                                                               ║
║  Your local license and tokens have been removed.            ║
║                                                               ║
║  Run 'realitydb login' to authenticate again.               ║
║  Run 'realitydb logout --clear-all' to remove all local data.║
╚═══════════════════════════════════════════════════════════════╝
  `);
}

// ============================================
// Export for testing
// ============================================

export default logoutCommand;