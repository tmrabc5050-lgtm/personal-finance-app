/**
 * Supabase Client Integration
 * 
 * Provides authenticated and anon browser access to Supabase PostgreSQL and Auth.
 * Fallback-safe: If environment variables are missing, `isSupabaseConfigured()` returns false,
 * allowing the application to run seamlessly in Guest / Local IndexedDB mode.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/**
 * Checks if Supabase credentials are configured with valid non-placeholder strings.
 */
export function isSupabaseConfigured(): boolean {
  if (!supabaseUrl || !supabaseAnonKey) {
    return false;
  }
  const cleanUrl = supabaseUrl.trim();
  const cleanKey = supabaseAnonKey.trim();
  return (
    cleanUrl.startsWith('http') &&
    !cleanUrl.includes('your-project-id') &&
    cleanKey.length > 20 &&
    !cleanKey.startsWith('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...')
  );
}

/**
 * Singleton Supabase Client instance (or null if not configured)
 */
export const supabase: SupabaseClient | null = isSupabaseConfigured()
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'pf_super_app_auth_token_v1',
      },
    })
  : null;
