import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * DATABASE CONFIGURATION
 * These strings are hardcoded to avoid environment variable issues.
 * IMPORTANT: Replace these with your actual Supabase Project URL and Anon Key.
 */
const URL = 'https://ewwadohdfmqfbdqndrhr.supabase.co'; // Must be a valid https:// URL
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV3d2Fkb2hkZm1xZmJkcW5kcmhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3NTg2MDQsImV4cCI6MjA4MDMzNDYwNH0.KU2yNQ_s8DSW3Urt39cJXzCoh02p4fynBzP8Li6x8dw';

let client: SupabaseClient;

// Verification for developer setup
const isPlaceholder = URL.includes('your-project-id') || KEY.includes('your-anon-key');

if (isPlaceholder) {
  console.warn(
    "SCILAB CONFIGURATION NOTICE:\n" +
    "Supabase credentials are using placeholders in supabaseClient.ts.\n" +
    "The app will remain in 'Disconnected' mode until valid credentials are provided."
  );
}

try {
  // Initialize with a valid-format URL to prevent SDK initialization crash
  client = createClient(URL, KEY);
} catch (e) {
  console.error("Supabase Client Initialization Error:", e);
  // Fallback empty client to prevent property access errors
  client = {} as any;
}

export const supabase = client;

/**
 * Validates that the cloud database is reachable and configured.
 * This is used by the App to decide whether to show the Dashboard or the Error screen.
 */
export const checkConnection = async (): Promise<boolean> => {
  if (isPlaceholder || !URL || !KEY) {
    return false;
  }
  
  if (!supabase || typeof supabase.from !== 'function') {
    return false;
  }
  
  try {
    const { error, status } = await supabase
      .from('app_settings')
      .select('id')
      .limit(1);
    
    if (error) {
        // PGRST116 means the table is reachable but likely empty (valid connection)
        if (error.code === 'PGRST116' || status === 404) return true; 
        return false;
    }
    return true;
  } catch (e) {
    // Catch networking errors (e.g., DNS failure, invalid URL format)
    return false;
  }
};