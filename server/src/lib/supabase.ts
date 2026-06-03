import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://lhnkrauedvbedvpgugcm.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxobmtyYXVlZHZiZWR2cGd1Z2NtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0NTg2MjEsImV4cCI6MjA5NTAzNDYyMX0.W5d7MZ4d7Ed4hWGHhJLUFoDo8FJ5vk-vWjHCHy1BffQ';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
