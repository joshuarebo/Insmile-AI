require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { FormData, File } = require('node:buffer') ? (() => {
  // Node 18+ has global FormData
  return { FormData: globalThis.FormData, File: globalThis.File };
})() : {};

const ctx = JSON.parse(fs.readFileSync(path.join(__dirname, 'test-context.json'), 'utf8'));
const BASE = 'http://localhost:3099/api';

async function test() {
  console.log('=== Scan Upload Test ===');
  console.log('Patient:', ctx.patientId);

  const app = require('../src/index-testable');
  const server = app.listen(3099);
  await new Promise(r => setTimeout(r, 500));

  try {
    // Create a small test image (1x1 pixel PNG)
    const pngBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );

    // Upload via multipart form
    console.log('\n--- Upload scan via /api/scans/upload ---');
    const formData = new FormData();
    formData.append('scan', new Blob([pngBuffer], { type: 'image/png' }), 'test-scan.png');
    formData.append('patientId', ctx.patientId);
    formData.append('scanType', 'xray');

    let res = await fetch(`${BASE}/scans/upload`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${ctx.token}` },
      body: formData,
    });

    if (res.status !== 201) {
      const err = await res.text();
      console.error('FAIL: upload returned', res.status, err);
      throw new Error('upload failed');
    }
    const scan = await res.json();
    console.log('PASS: scan uploaded');
    console.log('  id:', scan.id);
    console.log('  file_path:', scan.file_path);
    console.log('  patient_id:', scan.patient_id);
    console.log('  company_id:', scan.company_id);

    if (scan.company_id !== ctx.companyId) {
      console.error('FAIL: company_id mismatch'); throw new Error('isolation failed');
    }
    console.log('PASS: company isolation correct');

    // List scans
    console.log('\n--- List scans ---');
    res = await fetch(`${BASE}/scans`, {
      headers: { 'Authorization': `Bearer ${ctx.token}` },
    });
    const scans = await res.json();
    console.log('PASS: list returned', scans.length, 'scan(s)');

    // List scans by patient
    console.log('\n--- List scans by patient ---');
    res = await fetch(`${BASE}/scans/patient/${ctx.patientId}`, {
      headers: { 'Authorization': `Bearer ${ctx.token}` },
    });
    const patientScans = await res.json();
    if (!patientScans.find(s => s.id === scan.id)) {
      console.error('FAIL: scan not in patient list'); throw new Error('patient scan list failed');
    }
    console.log('PASS: scan found in patient scans');

    // Get scan image (signed URL redirect)
    console.log('\n--- Get scan image ---');
    res = await fetch(`${BASE}/scans/${scan.id}/image`, {
      headers: { 'Authorization': `Bearer ${ctx.token}` },
      redirect: 'manual',
    });
    if (res.status === 302 || res.status === 301) {
      console.log('PASS: image endpoint returned redirect to signed URL');
      console.log('  Location:', res.headers.get('location')?.slice(0, 80) + '...');
    } else if (res.status === 200) {
      console.log('PASS: image endpoint returned image directly');
    } else {
      const body = await res.text();
      console.error('FAIL: image endpoint returned', res.status, body);
      throw new Error('image fetch failed');
    }

    // Save scan ID for AI test
    ctx.scanId = scan.id;
    fs.writeFileSync(path.join(__dirname, 'test-context.json'), JSON.stringify(ctx, null, 2));
    console.log('\nScan ID saved for AI tests');

    console.log('\n✓ All scan upload tests passed!');
  } finally {
    server.close();
  }
}

test().catch(err => {
  console.error('Test failed:', err.message);
  process.exit(1);
});
