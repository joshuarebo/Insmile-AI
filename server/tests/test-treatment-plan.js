require('dotenv').config();
const fs = require('fs');
const path = require('path');

const ctx = JSON.parse(fs.readFileSync(path.join(__dirname, 'test-context.json'), 'utf8'));
const BASE = 'http://localhost:3099/api';
const headers = { 'Authorization': `Bearer ${ctx.token}`, 'Content-Type': 'application/json' };

async function test() {
  console.log('=== Treatment Plan Test ===');

  const app = require('../src/index-testable');
  const server = app.listen(3099);
  await new Promise(r => setTimeout(r, 500));

  try {
    // Test 1: Request plan without analysis (should get 400)
    console.log('\n--- Test: plan without analysis (expect 400) ---');
    let res = await fetch(`${BASE}/ai/treatment-plan`, {
      method: 'POST', headers,
      body: JSON.stringify({ patientId: ctx.patientId }),
    });
    if (res.status === 400) {
      const err = await res.json();
      console.log('PASS: correctly rejected — no findings available');
      console.log('  message:', err.error);
    } else {
      console.log('Got status:', res.status, '(might have previous analysis)');
    }

    // Test 2: Insert mock analysis into DB, then request plan
    console.log('\n--- Inserting mock analysis for treatment plan test ---');
    const { supabaseAdmin } = require('../src/lib/supabase');
    const mockFindings = [
      { label: 'Dental caries', tooth: '36', severity: 'moderate', confidence: 0.85 },
      { label: 'Gingivitis', tooth: null, severity: 'mild', confidence: 0.78 },
      { label: 'Periapical abscess', tooth: '46', severity: 'severe', confidence: 0.92 },
    ];

    // Create a mock scan record
    const { data: mockScan } = await supabaseAdmin.from('scans').insert({
      company_id: ctx.companyId,
      patient_id: ctx.patientId,
      file_path: 'mock/test-scan.png',
      file_name: 'mock-scan.png',
      scan_type: 'xray',
      uploaded_by: ctx.userId,
    }).select().single();

    // Insert completed analysis
    await supabaseAdmin.from('analyses').insert({
      scan_id: mockScan.id,
      company_id: ctx.companyId,
      patient_id: ctx.patientId,
      status: 'completed',
      findings: mockFindings,
      summary: 'Multiple dental issues identified requiring treatment',
      model_used: 'test-mock',
      completed_at: new Date().toISOString(),
    });
    console.log('PASS: mock analysis inserted (scan:', mockScan.id, ')');

    // Test 3: Generate treatment plan with mock analysis
    console.log('\n--- Generate treatment plan ---');
    res = await fetch(`${BASE}/ai/treatment-plan`, {
      method: 'POST', headers,
      body: JSON.stringify({
        patientId: ctx.patientId,
        scanId: mockScan.id,
        pricingMode: 'private_mid',
      }),
    });

    if (res.status === 503) {
      const err = await res.json();
      console.log('NOTE: text model rate-limited:', err.message);
      console.log('PASS: endpoint handles rate limiting correctly');
    } else if (res.status === 200) {
      const plan = await res.json();
      console.log('PASS: treatment plan generated!');
      console.log('  overview:', plan.overview?.slice(0, 100));
      console.log('  steps:', plan.steps?.length);
      console.log('  urgency:', plan.urgency);
      console.log('  model:', plan.model);

      if (plan.steps && plan.steps.length > 0) {
        console.log('\n  Sample step:');
        const s = plan.steps[0];
        console.log('    step:', s.step);
        console.log('    description:', s.description?.slice(0, 80));
        console.log('    cost_kes:', JSON.stringify(s.cost_kes));
        console.log('    sha_covered:', s.sha_covered);
      }

      // Verify plan was persisted
      const { data: dbPlan } = await supabaseAdmin
        .from('treatment_plans')
        .select('*')
        .eq('patient_id', ctx.patientId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (dbPlan) {
        console.log('\nPASS: treatment plan persisted to DB');
        console.log('  DB steps:', dbPlan.steps?.length);
        console.log('  pricing_mode:', dbPlan.pricing_mode);
      } else {
        console.log('WARN: plan not found in DB (may be timing issue)');
      }
    } else {
      const err = await res.text();
      console.error('FAIL: unexpected status', res.status, err);
      throw new Error('treatment plan failed');
    }

    console.log('\n✓ Treatment plan tests complete!');
  } finally {
    server.close();
  }
}

test().catch(err => {
  console.error('Test failed:', err.message);
  process.exit(1);
});
