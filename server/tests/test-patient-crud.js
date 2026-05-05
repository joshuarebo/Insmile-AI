require('dotenv').config();
const fs = require('fs');
const path = require('path');

const ctx = JSON.parse(fs.readFileSync(path.join(__dirname, 'test-context.json'), 'utf8'));
const BASE = 'http://localhost:3099/api';
const headers = { 'Authorization': `Bearer ${ctx.token}`, 'Content-Type': 'application/json' };

async function test() {
  console.log('=== Patient CRUD Test ===');
  console.log('Using company:', ctx.companyName);

  // Start server
  const app = require('../src/index-testable');
  const server = app.listen(3099);
  await new Promise(r => setTimeout(r, 500));

  let patientId;

  try {
    // CREATE
    console.log('\n--- CREATE patient ---');
    let res = await fetch(`${BASE}/patients`, {
      method: 'POST', headers,
      body: JSON.stringify({
        full_name: 'Brian Otieno',
        phone: '+254712345678',
        email: 'brian@test.co.ke',
        date_of_birth: '1990-05-15',
        gender: 'male',
        sha_number: 'SHA-001234',
        nhif_number: 'NHIF-5678',
        insurance_provider: 'Jubilee Health',
        insurance_member_number: 'JUB-9012',
        preferred_language: 'en',
        allergies: ['penicillin'],
        medical_history: 'Mild hypertension',
      }),
    });
    if (res.status !== 201) {
      const err = await res.text();
      console.error('FAIL: create returned', res.status, err); throw new Error('create failed');
    }
    const patient = await res.json();
    patientId = patient.id;
    console.log('PASS: patient created, id:', patientId);
    console.log('  full_name:', patient.full_name);
    console.log('  sha_number:', patient.sha_number);
    console.log('  company_id:', patient.company_id);
    if (patient.company_id !== ctx.companyId) {
      console.error('FAIL: company_id mismatch!'); throw new Error('company isolation failed');
    }
    console.log('PASS: company_id matches authenticated user');

    // LIST
    console.log('\n--- LIST patients ---');
    res = await fetch(`${BASE}/patients`, { headers });
    const list = await res.json();
    if (!Array.isArray(list) || list.length === 0) {
      console.error('FAIL: list empty or not array'); throw new Error('list failed');
    }
    console.log('PASS: list returned', list.length, 'patient(s)');
    if (!list.find(p => p.id === patientId)) {
      console.error('FAIL: created patient not in list'); throw new Error('list missing patient');
    }
    console.log('PASS: created patient found in list');

    // GET by ID
    console.log('\n--- GET patient by ID ---');
    res = await fetch(`${BASE}/patients/${patientId}`, { headers });
    const fetched = await res.json();
    if (fetched.id !== patientId || fetched.full_name !== 'Brian Otieno') {
      console.error('FAIL: get returned wrong data'); throw new Error('get failed');
    }
    console.log('PASS: get by ID returned correct patient');

    // UPDATE
    console.log('\n--- UPDATE patient ---');
    res = await fetch(`${BASE}/patients/${patientId}`, {
      method: 'PUT', headers,
      body: JSON.stringify({ full_name: 'Brian Otieno Ochieng', phone: '+254798765432' }),
    });
    const updated = await res.json();
    if (updated.full_name !== 'Brian Otieno Ochieng') {
      console.error('FAIL: update did not apply'); throw new Error('update failed');
    }
    console.log('PASS: patient updated');
    console.log('  new name:', updated.full_name);
    console.log('  new phone:', updated.phone);

    // DELETE
    console.log('\n--- DELETE patient ---');
    res = await fetch(`${BASE}/patients/${patientId}`, { method: 'DELETE', headers });
    if (res.status !== 200) {
      console.error('FAIL: delete returned', res.status); throw new Error('delete failed');
    }
    console.log('PASS: patient deleted');

    // Verify deletion
    res = await fetch(`${BASE}/patients/${patientId}`, { headers });
    if (res.status !== 404) {
      console.error('FAIL: deleted patient still accessible'); throw new Error('delete verify failed');
    }
    console.log('PASS: deleted patient returns 404');

    // Re-create a patient for subsequent tests
    console.log('\n--- Re-create patient for later tests ---');
    res = await fetch(`${BASE}/patients`, {
      method: 'POST', headers,
      body: JSON.stringify({
        full_name: 'Amina Wanjiru',
        phone: '+254711222333',
        date_of_birth: '1985-03-20',
        gender: 'female',
        sha_number: 'SHA-9999',
        preferred_language: 'sw',
      }),
    });
    const permanentPatient = await res.json();
    console.log('PASS: test patient created:', permanentPatient.id);

    // Update context with patient ID
    ctx.patientId = permanentPatient.id;
    fs.writeFileSync(path.join(__dirname, 'test-context.json'), JSON.stringify(ctx, null, 2));

    console.log('\n✓ All patient CRUD tests passed!');
  } finally {
    server.close();
  }
}

test().catch(err => {
  console.error('Test failed:', err.message);
  process.exit(1);
});
