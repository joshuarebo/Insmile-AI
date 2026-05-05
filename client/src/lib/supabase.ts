import { createClient } from '@supabase/supabase-js';

// Strip any whitespace/newlines that may be injected by build systems
const supabaseUrl = (process.env.REACT_APP_SUPABASE_URL || '').replace(/\s/g, '');
const supabaseAnonKey = (process.env.REACT_APP_SUPABASE_ANON_KEY || '').replace(/\s/g, '');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    '[Insmile] Supabase env vars missing at build time. ' +
    'Add REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY to Vercel and redeploy.'
  );
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key-will-fail-on-auth'
);
