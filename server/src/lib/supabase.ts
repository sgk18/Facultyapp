import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('SUPABASE_URL or SUPABASE_ANON_KEY is not defined in environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
