import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: __dirname + '/../../.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

const missingVars: string[] = [];

if (!supabaseUrl) {
  missingVars.push('SUPABASE_URL');
}
if (!supabaseServiceKey) {
  missingVars.push('SUPABASE_SERVICE_KEY');
}
if (!supabaseAnonKey) {
  missingVars.push('SUPABASE_ANON_KEY');
}

if (missingVars.length > 0) {
  console.error(`\n❌ Missing required environment variables: ${missingVars.join(', ')}`);
  console.error('\n📋 To fix:');
  console.error('   1. Go to https://supabase.com/dashboard/project/ujrmxfvhaifgdipzkmfb/settings/api');
  console.error('   2. Copy "Service Role" key (for SUPABASE_SERVICE_KEY)');
  console.error('   3. Copy "anon" key (for SUPABASE_ANON_KEY)');
  console.error('   4. Add them to: /Users/pawan/Development/runzilla/backend/.env\n');
  throw new Error(`Missing required env vars: ${missingVars.join(', ')}`);
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export const supabase = createClient(supabaseUrl, supabaseAnonKey);