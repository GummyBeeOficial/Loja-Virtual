import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js';

let browserClient: SupabaseClient | null = null;

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

export function isSupabaseConfigured() {
  return SUPABASE_URL !== 'https://placeholder.supabase.co' && SUPABASE_ANON_KEY !== 'placeholder-key';
}

export function createClient() {
  if (browserClient) return browserClient;

  browserClient = createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return browserClient;
}
