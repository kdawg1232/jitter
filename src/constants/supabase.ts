import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

const supabaseUrl = 'https://dfwitowfyqczzetkdeqb.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmd2l0b3dmeXFjenpldGtkZXFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzNDY1NTgsImV4cCI6MjA2NzkyMjU1OH0.lhrvtoT1pY6jDRVlBi6pb6XgNc9xq-vsxgK2hXvjSmc';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
}); 