import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: __dirname + '/../../.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('\n❌ Missing required Supabase env vars: SUPABASE_URL and/or SUPABASE_SERVICE_KEY');
  console.error('   These are needed for database access only (auth is handled by ScaleKit).');
  console.error('   Get them from: https://supabase.com/dashboard/project/_/settings/api\n');
  throw new Error('Missing Supabase env vars');
}

// Database-only client (service role for server-side DB access)
// Auth is handled entirely by ScaleKit — do NOT use supabase.auth here
export const db = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Legacy alias used in other route files
export const supabaseAdmin = db;