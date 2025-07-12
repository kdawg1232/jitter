import { createClient } from '@supabase/supabase-js';

// 🔑 IMPORTANT: Replace these with your actual Supabase credentials
// Get these from your Supabase project dashboard -> Settings -> API
const SUPABASE_URL = 'https://dfwitowfyqczzetkdeqb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmd2l0b3dmeXFjenpldGtkZXFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzNDY1NTgsImV4cCI6MjA2NzkyMjU1OH0.lhrvtoT1pY6jDRVlBi6pb6XgNc9xq-vsxgK2hXvjSmc';

// Example of what they should look like:
// const SUPABASE_URL = 'https://your-project-id.supabase.co';
// const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY); 