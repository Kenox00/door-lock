#!/usr/bin/env node

/**
 * Pre-flight Check Script
 * Verifies that the backend is properly configured before starting
 */

const fs = require('fs');
const path = require('path');

console.log('\n🔍 Door Lock Backend - Pre-flight Check\n');

const checks = [];
let allPassed = true;

// Check 1: Node version
const nodeVersion = process.version;
const requiredNodeVersion = 16;
const currentNodeVersion = parseInt(nodeVersion.slice(1).split('.')[0]);

if (currentNodeVersion >= requiredNodeVersion) {
  checks.push({ name: 'Node.js Version', status: '✅', detail: `${nodeVersion} (>= v16 required)` });
} else {
  checks.push({ name: 'Node.js Version', status: '❌', detail: `${nodeVersion} (v16+ required)` });
  allPassed = false;
}

// Check 2: .env file exists
if (fs.existsSync(path.join(__dirname, '../.env'))) {
  checks.push({ name: '.env file', status: '✅', detail: 'Found' });
} else {
  checks.push({ name: '.env file', status: '⚠️', detail: 'Not found - copy .env.example to .env' });
  allPassed = false;
}

// Check 3: Required directories
const requiredDirs = ['src', 'uploads'];
requiredDirs.forEach(dir => {
  if (fs.existsSync(path.join(__dirname, '..', dir))) {
    checks.push({ name: `Directory: ${dir}/`, status: '✅', detail: 'Exists' });
  } else {
    checks.push({ name: `Directory: ${dir}/`, status: '❌', detail: 'Missing' });
    allPassed = false;
  }
});

// Check 4: node_modules
if (fs.existsSync(path.join(__dirname, '../node_modules'))) {
  checks.push({ name: 'Dependencies', status: '✅', detail: 'Installed' });
} else {
  checks.push({ name: 'Dependencies', status: '❌', detail: 'Run: npm install' });
  allPassed = false;
}

// Display results
checks.forEach(check => {
  console.log(`${check.status} ${check.name.padEnd(25)} - ${check.detail}`);
});

console.log('\n' + '─'.repeat(60) + '\n');

if (allPassed) {
  console.log('✅ All checks passed! Ready to start the server.\n');
  console.log('Run: npm run dev\n');
  process.exit(0);
} else {
  console.log('⚠️  Some checks failed. Please fix the issues above.\n');
  console.log('Quick fixes:');
  console.log('  1. Copy .env.example to .env and configure');
  console.log('  2. Run: npm install');
  console.log('  3. Run this check again\n');
  process.exit(1);
}
