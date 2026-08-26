import type { SupabaseClient } from '@supabase/supabase-js';
import { authService } from './supabaseAuth';

/** Shared accessor for the single Supabase client used app-wide. */
export function getSupabaseClient(): SupabaseClient | null {
  return authService.getClient();
}
