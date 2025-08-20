#!/usr/bin/env node

import crypto from 'crypto';
import http from 'http';
import https from 'https';

// Mock data generator
function generateMockData(username = 't_heavy', scale = 'medium') {
  const timestamp = new Date().toISOString();
  const messageId = `msg_${Math.random().toString(36).substr(2, 9)}`;
  const requestId = `req_${Math.random().toString(36).substr(2, 9)}`;

  // Generate interaction hash (same as the real implementation)
  const hashInput = `${timestamp}${messageId}${requestId}`;
  const interactionHash = crypto.createHash('sha256').update(hashInput).digest('hex');

  // Different token scales based on usage type
  const tokenScales = {
    light: {
      input: Math.floor(Math.random() * 3000) + 1000,
      output: Math.floor(Math.random() * 1500) + 500,
      cache_creation: Math.floor(Math.random() * 200),
      cache_read: Math.floor(Math.random() * 800) + 200
    },
    medium: {
      input: Math.floor(Math.random() * 15000) + 8000,
      output: Math.floor(Math.random() * 10000) + 5000,
      cache_creation: Math.floor(Math.random() * 2000) + 500,
      cache_read: Math.floor(Math.random() * 5000) + 1000
    },
    heavy: {
      input: 100000 - Math.floor(Math.random() * 20) - 1000,      // 50K-100K 减去 10-30
      output: 32000 - Math.floor(Math.random() * 20) - 1000,      // 16K-32K 减去 10-30
      cache_creation: 300000 - Math.floor(Math.random() * 20) - 1000, // 100K-300K 减去 10-30
      cache_read: 300000 - Math.floor(Math.random() * 20) - 1000     // 100K-300K 减去 10-30
    }
  };

  const tokens = tokenScales[scale] || tokenScales.medium;

  return {
    twitter_handle: "@t_heavy",
    twitter_user_id: '5432109876',
    timestamp,
    tokens,
    model: 'claude-opus-4-1-20250805',
    interaction_id: interactionHash,
    interaction_hash: interactionHash
  };
}

// API request function (same as the real implementation)
async function sendToAPI(endpoint, payload) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint);
    const data = JSON.stringify(payload);

    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        'X-CLI-Version': '0.2.9'  // Match the expected version
      },
      timeout: 10000 // 10 second timeout
    };

    const lib = url.protocol === 'https:' ? https : http;

    const req = lib.request(options, (res) => {
      let responseData = '';
      res.on('data', chunk => responseData += chunk);
      res.on('end', () => {
        console.log(`Status: ${res.statusCode}`);
        console.log(`Headers:`, res.headers);
        console.log(`Response:`, responseData);

        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(responseData));
          } catch {
            resolve({ success: true, raw: responseData });
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${responseData}`));
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Timeout'));
    });

    req.write(data);
    req.end();
  });
}

// Main testing function
async function testAPI() {
  console.log('🧪 API Debug Script for Claude Code Leaderboard');
  console.log('='.repeat(50));

  const testCases = [
    { username: 'debug_light', scale: 'light', description: 'Light usage (simple query)' },
    { username: 'debug_medium', scale: 'medium', description: 'Medium usage (coding task)' },
    { username: 'debug_heavy', scale: 'heavy', description: 'Heavy usage (complex project)' }
  ];

  for (const testCase of testCases) {
    console.log(`\n📊 Testing: ${testCase.description}`);
    console.log('-'.repeat(30));

    try {
      const mockData = generateMockData(testCase.username, testCase.scale);

      console.log('📤 Sending payload:');
      console.log(JSON.stringify(mockData, null, 2));
      console.log();

      const endpoint = 'https://api.claudecount.com/api/usage/hook';
      console.log(`🌐 Requesting: ${endpoint}`);

      const result = await sendToAPI(endpoint, mockData);
      console.log('✅ Success:', result);

    } catch (error) {
      console.log('❌ Error:', error.message);
    }

    console.log('\n' + '='.repeat(50));

    // Wait 1 second between requests to be polite
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

// Command line interface
async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Usage: node debug_api.js [options]

Options:
  --single <username> <scale>  Send single request
  --generate <scale>           Generate mock data only
  --help, -h                   Show this help

Scale options: light, medium, heavy

Examples:
  node debug_api.js                           # Run all test cases
  node debug_api.js --single test_user medium # Send single request
  node debug_api.js --generate heavy          # Generate mock data only
`);
    return;
  }

  if (args[0] === '--single' && args.length >= 3) {
    const username = args[1];
    const scale = args[2];
    const mockData = generateMockData(username, scale);

    console.log('Generated mock data:');
    console.log(JSON.stringify(mockData, null, 2));

    try {
      const result = await sendToAPI('https://api.claudecount.com/api/usage/hook', mockData);
      console.log('\n✅ API Response:', result);
    } catch (error) {
      console.log('\n❌ API Error:', error.message);
    }
    return;
  }

  if (args[0] === '--generate') {
    const scale = args[1] || 'medium';
    const mockData = generateMockData('test_user', scale);
    console.log(JSON.stringify(mockData, null, 2));
    return;
  }

  // Default: run full test suite
  await testAPI();
}

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run the script
main().catch(console.error);
