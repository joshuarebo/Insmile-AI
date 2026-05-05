import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || '';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    'Missing REACT_APP_SUPABASE_URL or REACT_APP_SUPABASE_ANON_KEY. ' +
    'Add them to your .env file or Vercel environment variables and rebuild.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
