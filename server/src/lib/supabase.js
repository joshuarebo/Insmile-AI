const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set — database features will fail.');
}

const supabaseAdmin = createClient(supabaseUrl || '', supabaseServiceKey || '', {
  auth: { autoRefreshToken: false, persistSession: false },
});

function createClientForUser(accessToken) {
  return createClient(supabaseUrl || '', supabaseAnonKey || '', {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

module.exports = { supabaseAdmin, createClientForUser };
