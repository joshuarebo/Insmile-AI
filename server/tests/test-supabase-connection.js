require('dotenv').config();
const { supabaseAdmin } = require('../src/lib/supabase');

async function test() {
  console.log('Testing Supabase connectivity...');
  console.log('URL:', process.env.SUPABASE_URL);

  // Test 1: Query companies table (should be empty but not error)
  const { data: companies, error: compErr } = await supabaseAdmin.from('companies').select('id').limit(1);
  if (compErr) {
    console.error('FAIL: companies query error:', compErr.message);
    process.exit(1);
  }
  console.log('PASS: companies table accessible, rows:', companies.length);

  // Test 2: Query profiles table
  const { data: profiles, error: profErr } = await supabaseAdmin.from('profiles').select('id').limit(1);
  if (profErr) {
    console.error('FAIL: profiles query error:', profErr.message);
    process.exit(1);
  }
  console.log('PASS: profiles table accessible, rows:', profiles.length);

  // Test 3: Query patients table
  const { data: patients, error: patErr } = await supabaseAdmin.from('patients').select('id').limit(1);
  if (patErr) {
    console.error('FAIL: patients query error:', patErr.message);
    process.exit(1);
  }
  console.log('PASS: patients table accessible, rows:', patients.length);

  // Test 4: Query scans table
  const { data: scans, error: scanErr } = await supabaseAdmin.from('scans').select('id').limit(1);
  if (scanErr) {
    console.error('FAIL: scans query error:', scanErr.message);
    process.exit(1);
  }
  console.log('PASS: scans table accessible, rows:', scans.length);

  // Test 5: Query analyses table
  const { data: analyses, error: anaErr } = await supabaseAdmin.from('analyses').select('id').limit(1);
  if (anaErr) {
    console.error('FAIL: analyses query error:', anaErr.message);
    process.exit(1);
  }
  console.log('PASS: analyses table accessible, rows:', analyses.length);

  // Test 6: Query treatment_plans table
  const { data: plans, error: planErr } = await supabaseAdmin.from('treatment_plans').select('id').limit(1);
  if (planErr) {
    console.error('FAIL: treatment_plans query error:', planErr.message);
    process.exit(1);
  }
  console.log('PASS: treatment_plans table accessible, rows:', plans.length);

  // Test 7: Query chat_sessions table
  const { data: chats, error: chatErr } = await supabaseAdmin.from('chat_sessions').select('id').limit(1);
  if (chatErr) {
    console.error('FAIL: chat_sessions query error:', chatErr.message);
    process.exit(1);
  }
  console.log('PASS: chat_sessions table accessible, rows:', chats.length);

  // Test 8: Check storage bucket exists
  const { data: buckets, error: bucketErr } = await supabaseAdmin.storage.listBuckets();
  if (bucketErr) {
    console.error('FAIL: storage bucket list error:', bucketErr.message);
    process.exit(1);
  }
  const scansBucket = buckets.find(b => b.name === 'scans');
  if (!scansBucket) {
    console.error('FAIL: scans storage bucket not found. Available:', buckets.map(b => b.name));
    process.exit(1);
  }
  console.log('PASS: scans storage bucket exists');

  console.log('\n✓ All Supabase connectivity tests passed!');
}

test().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
