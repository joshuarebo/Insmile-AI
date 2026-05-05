require('dotenv').config();
const { supabaseAdmin } = require('../src/lib/supabase');
const { createClient } = require('@supabase/supabase-js');
const http = require('http');
const fs = require('fs');
const path = require('path');

const TEST_EMAIL = `test-${Date.now()}@insmile-test.co.ke`;
const TEST_PASSWORD = 'TestPassword123!';
const TEST_CLINIC = 'Mombasa Dental Clinic';

async function test() {
  console.log('=== Complete Auth + Middleware Test ===');
  console.log('Test email:', TEST_EMAIL);

  // Step 1: Create user (auto-confirmed for testing)
  console.log('\n--- Step 1: Create user via admin ---');
  const { data: createData, error: createErr } = await supabaseAdmin.auth.admin.createUser({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: 'Dr. Amina Wanjiku', clinic_name: TEST_CLINIC },
  });
  if (createErr) { console.error('FAIL:', createErr.message); process.exit(1); }
  console.log('PASS: user created:', createData.user.id);

  // Step 2: Sign in to get token
  console.log('\n--- Step 2: Sign in ---');
  const anonClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
  const { data: signInData, error: signInErr } = await anonClient.auth.signInWithPassword({
    email: TEST_EMAIL, password: TEST_PASSWORD,
  });
  if (signInErr) { console.error('FAIL:', signInErr.message); process.exit(1); }
  const token = signInData.session.access_token;
  console.log('PASS: signed in, token length:', token.length);

  // Step 3: Start server temporarily
  console.log('\n--- Step 3: Start server for API tests ---');
  const app = require('../src/index-testable');
  const server = app.listen(3099);
  await new Promise(r => setTimeout(r, 500));

  // Step 4: Test unauthenticated request (should get 401)
  console.log('\n--- Step 4: Test unauthenticated request ---');
  let res = await fetch('http://localhost:3099/api/patients');
  if (res.status !== 401) {
    console.error('FAIL: expected 401, got:', res.status);
    server.close(); process.exit(1);
  }
  console.log('PASS: unauthenticated request rejected (401)');

  // Step 5: Test authenticated request (should create profile via middleware fallback)
  console.log('\n--- Step 5: Test authenticated request (triggers profile creation) ---');
  res = await fetch('http://localhost:3099/api/patients', {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (res.status !== 200) {
    const body = await res.text();
    console.error('FAIL: expected 200, got:', res.status, body);
    server.close(); process.exit(1);
  }
  const patients = await res.json();
  console.log('PASS: authenticated request succeeded, patients:', patients.length);

  // Step 6: Verify profile was created by middleware
  console.log('\n--- Step 6: Verify profile exists ---');
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('*, companies(*)')
    .eq('id', createData.user.id)
    .single();

  if (!profile) { console.error('FAIL: profile still not created'); server.close(); process.exit(1); }
  console.log('PASS: profile exists');
  console.log('  full_name:', profile.full_name);
  console.log('  role:', profile.role);
  console.log('  company:', profile.companies?.name);

  // Step 7: Test /api/auth/me
  console.log('\n--- Step 7: Test /api/auth/me ---');
  res = await fetch('http://localhost:3099/api/auth/me', {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  const me = await res.json();
  if (res.status !== 200) { console.error('FAIL:', me); server.close(); process.exit(1); }
  console.log('PASS: /api/auth/me works');
  console.log('  user.email:', me.user.email);
  console.log('  profile.role:', me.profile.role);

  // Save context for next tests
  const ctx = {
    userId: createData.user.id,
    email: TEST_EMAIL,
    companyId: profile.company_id,
    token,
    companyName: profile.companies?.name,
  };
  fs.writeFileSync(path.join(__dirname, 'test-context.json'), JSON.stringify(ctx, null, 2));
  console.log('\nContext saved for subsequent tests');

  server.close();
  console.log('\n✓ All auth + middleware tests passed!');
}

test().catch(err => {
  console.error('Unhandled:', err);
  process.exit(1);
});
