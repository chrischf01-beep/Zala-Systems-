import { createClient } from '@supabase/supabase-js';

// The anon key is public by design: Row Level Security policies in supabase/schema.sql
// are what actually protect the data. Never add the service_role key to this app.
// Environment variables (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY) override these
// defaults so you can point the build at a different project without editing code.
const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? 'https://invalid.local';
const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? 'not-configured';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export const SCREENSHOT_BUCKET = 'screenshots';
