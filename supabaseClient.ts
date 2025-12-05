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

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL');
const supabaseKey = getEnvVar('VITE_SUPABASE_KEY');

const isConfigured = 
  supabaseUrl && 
  supabaseKey && 
  supabaseUrl !== 'https://placeholder.supabase.co' &&
  !supabaseUrl.includes('placeholder');

export const isSupabaseConfigured = !!isConfigured;

if (!isSupabaseConfigured) {
  console.warn("Supabase is not configured. Falling back to Local Storage.");
}

// Use placeholders if missing to prevent createClient from throwing immediately
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseKey || 'placeholder'
);