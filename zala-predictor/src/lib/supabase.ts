import { createClient } from '@supabase/supabase-js';

// The anon key is public by design: Row Level Security policies in supabase/schema.sql
// are what actually protect the data. Never add the service_role key to this app.
// Environment variables (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY) override these
// defaults so you can point the build at a different project without editing code.
const SUPABASE_URL =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? 'https://lwkaerkbxovgplucirlv.supabase.co';
const SUPABASE_ANON_KEY =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3a2FlcmtieG92Z3BsdWNpcmx2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkxNzA0ODMsImV4cCI6MjEwNDc0NjQ4M30.YMPNXNybKtpPkRVe5TkyYNONHu2n4MtsDFXoyXN9drI';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export const SCREENSHOT_BUCKET = 'screenshots';
