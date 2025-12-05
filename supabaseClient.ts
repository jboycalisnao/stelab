import { createClient } from '@supabase/supabase-js';

// Helper to safely get environment variables
const getEnvVar = (key: string): string => {
  // 1. Try import.meta.env (Vite standard)
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
      // @ts-ignore
      return import.meta.env[key];
    }
  } catch (e) {
    // Ignore error
  }

  // 2. Try process.env (Fallback for some environments)
  try {
    // @ts-ignore
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      // @ts-ignore
      return process.env[key];
    }
  } catch (e) {
    // Ignore error
  }

  return '';
};

// Use provided credentials as fallback if env vars fail
const FALLBACK_URL = 'https://ewwadohdfmqfbdqndrhr.supabase.co';
const FALLBACK_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV3d2Fkb2hkZm1xZmJkcW5kcmhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3NTg2MDQsImV4cCI6MjA4MDMzNDYwNH0.KU2yNQ_s8DSW3Urt39cJXzCoh02p4fynBzP8Li6x8dw';

const envUrl = getEnvVar('VITE_SUPABASE_URL');
const envKey = getEnvVar('VITE_SUPABASE_KEY');

// Prioritize Env Var, then Fallback
const supabaseUrl = envUrl || FALLBACK_URL;
const supabaseKey = envKey || FALLBACK_KEY;

export const isSupabaseConfigured = !!(supabaseUrl && supabaseKey);

if (!isSupabaseConfigured) {
  console.error("CRITICAL: Supabase credentials missing. App will not function correctly.");
} else {
  console.log("Supabase Client Initialized with URL:", supabaseUrl);
}

export const supabase = createClient(supabaseUrl, supabaseKey);