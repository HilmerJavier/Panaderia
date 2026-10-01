import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://pcpacrfxjmnswztqsrxt.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjcGFjcmZ4am1uc3d6dHFzcnh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA4NTkzNzUsImV4cCI6MjEwNjQzNTM3NX0.fZ8hJKgl7g59l8TMTpw-76OXl6zkNsV3l-8GEWuCFJQ';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
