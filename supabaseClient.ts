
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Absolute source of truth for database credentials
const PRIMARY_URL = 'https://ewwadohdfmqfbdqndrhr.supabase.co';
const PRIMARY_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV3d2Fkb2hkZm1xZmJkcW5kcmhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3NTg2MDQsImV4cCI6MjA4MDMzNDYwNH0.KU2yNQ_s8DSW3Urt39cJXzCoh02p4fynBzP8Li6x8dw';

let client: SupabaseClient;

try {
  if (!PRIMARY_URL || !PRIMARY_KEY) {
    throw new Error("Supabase URL or Key is missing from the configuration.");
  }
  client = createClient(PRIMARY_URL, PRIMARY_KEY);
} catch (e) {
  console.error("Supabase Client Initialization Error:", e);
  client = {} as any;
}

export const supabase = client;

/**
 * Validates that the cloud database is reachable by checking the settings table.
 */
export const checkConnection = async (): Promise<boolean> => {
  if (!supabase.from) {
    console.error("Supabase client was not initialized properly.");
    return false;
  }
  
  try {
    const { error } = await supabase.from('app_settings').select('id').limit(1);
    if (error) {
        console.error("Cloud Connection Verification Failed (Project Error):", error.message);
        // If it's a 404, the table might just be missing, but the connection is alive
        if (error.code === 'PGRST116' || error.status === 404) {
           console.warn("Table 'app_settings' not found, but API is reachable.");
           return true; 
        }
        return false;
    }
    return true;
  } catch (e) {
    console.error("Cloud Connection Verification Failed (Network Error):", e);
    return false;
  }
};
