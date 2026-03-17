import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types.js';

export function createSupabaseClient(
  url: string,
  anonKey: string,
  accessToken?: string,
): SupabaseClient<Database> {
  return createClient<Database>(url, anonKey, {
    global: {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    },
  });
}

export function createSupabaseAdmin(
  url: string,
  serviceRoleKey: string,
): SupabaseClient<Database> {
  return createClient<Database>(url, serviceRoleKey);
}
