#!/usr/bin/env node

import crypto from 'crypto';
import https from 'https';

// 生成随机interaction_id和interaction_hash
function generateInteractionData() {
  const timestamp = new Date().toISOString();
  const randomId = crypto.randomBytes(16).toString('hex');
  const interaction_id = `int_${randomId}`;
  const interaction_hash = crypto.createHash('sha256')
    .update(`${timestamp}${interaction_id}${Math.random()}`)
    .digest('hex');
  
  return { timestamp, interaction_id, interaction_hash };
}

// 发送API请求
async function sendRequest(payload) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    
    const options = {
      hostname: 'api.claudecount.com',
      port: 443,
      path: '/api/usage/hook',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        'X-CLI-Version': '0.2.9'
      },
      timeout: 10000
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', chunk => responseData += chunk);
      res.on('end', () => {
        console.log(`📡 Status: ${res.statusCode} | Response: ${responseData}`);
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ success: true, data: responseData });
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${responseData}`));
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.write(data);
    req.end();
  });
}

// 主函数 - 执行可配置次数的请求
async function runTestScript() {
  // 从环境变量获取配置，如果没有则使用默认值
  const totalRuns = parseInt(process.env.RUNS) || 10;
  const delaySeconds = parseInt(process.env.DELAY) || 1;
  
  console.log('🧪 开始批量测试API接口');
  console.log('='.repeat(50));
  console.log(`🎯 总共运行: ${totalRuns} 次`);
  console.log(`⏱️ 请求间隔: ${delaySeconds} 秒`);
  console.log('='.repeat(50));
  
  const basePayload = {
    "twitter_handle": "@AwesomeCC_",
    "twitter_user_id": "5432109882",
    "tokens": {
      "input": 98980,
      "output": 30990,
      "cache_creation": 238991,
      "cache_read": 298991
    },
    "model": "claude-sonnet-4-20250514"
  };

  let successCount = 0;
  let failureCount = 0;

  for (let i = 1; i <= totalRuns; i++) {
    console.log(`\n🚀 第 ${i} 次请求:`);
    console.log('-'.repeat(30));

    try {
      // 生成新的时间戳和交互数据
      const { timestamp, interaction_id, interaction_hash } = generateInteractionData();
      
      const payload = {
        ...basePayload,
        timestamp,
        interaction_id,
        interaction_hash
      };

      console.log(`📤 时间戳: ${timestamp}`);
      console.log(`🔗 交互ID: ${interaction_id}`);
      console.log(`🔒 交互Hash: ${interaction_hash.substring(0, 16)}...`);

      await sendRequest(payload);
      successCount++;
      console.log('✅ 请求成功');

    } catch (error) {
      failureCount++;
      console.log(`❌ 请求失败: ${error.message}`);
    }

    // 每次请求间隔，避免过于频繁
    if (i < totalRuns) {
      console.log(`⏳ 等待${delaySeconds}秒...`);
      await new Promise(resolve => setTimeout(resolve, delaySeconds * 1000));
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('📊 测试结果汇总:');
  console.log(`✅ 成功: ${successCount} 次`);
  console.log(`❌ 失败: ${failureCount} 次`);
  console.log(`📈 成功率: ${((successCount / totalRuns) * 100).toFixed(1)}%`);
}

// 错误处理
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ 未处理的Promise拒绝:', reason);
  process.exit(1);
});

// 启动脚本
console.log('🎯 Claude Count API 批量测试脚本');
console.log('📋 将执行10次请求到: https://api.claudecount.com/api/usage/hook');
console.log('');

runTestScript().catch(console.error);
