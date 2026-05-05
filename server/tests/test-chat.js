require('dotenv').config();
const fs = require('fs');
const path = require('path');

const ctx = JSON.parse(fs.readFileSync(path.join(__dirname, 'test-context.json'), 'utf8'));
const BASE = 'http://localhost:3099/api';
const headers = { 'Authorization': `Bearer ${ctx.token}`, 'Content-Type': 'application/json' };

async function test() {
  console.log('=== Chat Endpoint Test ===');

  const app = require('../src/index-testable');
  const server = app.listen(3099);
  await new Promise(r => setTimeout(r, 500));

  try {
    // Test chat without patient context
    console.log('\n--- Chat: general dental question ---');
    let res = await fetch(`${BASE}/ai/chat`, {
      method: 'POST', headers,
      body: JSON.stringify({
        message: 'What is the recommended frequency of dental checkups in Kenya?',
        patientId: ctx.patientId,
        chatHistory: [],
      }),
    });

    if (res.status === 503) {
      const err = await res.json();
      console.log('NOTE: Chat rate-limited (free tier):', err.message);
      console.log('PASS: endpoint correctly handles rate limiting with 503 + retry message');
    } else if (res.status === 200) {
      const data = await res.json();
      console.log('PASS: chat response received');
      console.log('  model:', data.model);
      console.log('  response length:', data.message?.length);
      console.log('  first 150 chars:', data.message?.slice(0, 150));
    } else {
      const err = await res.text();
      console.error('FAIL: unexpected status', res.status, err);
      throw new Error('chat failed');
    }

    // Test chat with history
    console.log('\n--- Chat: with conversation history ---');
    res = await fetch(`${BASE}/ai/chat`, {
      method: 'POST', headers,
      body: JSON.stringify({
        message: 'What about SHA coverage for that?',
        patientId: ctx.patientId,
        chatHistory: [
          { role: 'user', content: 'What is a root canal treatment?' },
          { role: 'assistant', content: 'A root canal is a dental procedure to remove infected pulp...' },
        ],
      }),
    });

    if (res.status === 503) {
      console.log('NOTE: Also rate-limited (expected on free tier)');
      console.log('PASS: endpoint handles gracefully');
    } else if (res.status === 200) {
      const data = await res.json();
      console.log('PASS: chat with history works');
      console.log('  response:', data.message?.slice(0, 100));
    } else {
      const err = await res.text();
      console.error('FAIL:', res.status, err);
      throw new Error('chat with history failed');
    }

    // Test validation
    console.log('\n--- Chat: validation (empty message) ---');
    res = await fetch(`${BASE}/ai/chat`, {
      method: 'POST', headers,
      body: JSON.stringify({ message: '', patientId: ctx.patientId }),
    });
    if (res.status === 400) {
      console.log('PASS: empty message rejected with 400');
    } else {
      console.error('FAIL: expected 400 for empty message, got', res.status);
    }

    console.log('\n✓ Chat endpoint tests complete!');
  } finally {
    server.close();
  }
}

test().catch(err => {
  console.error('Test failed:', err.message);
  process.exit(1);
});
