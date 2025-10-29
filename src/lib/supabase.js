import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // --- VULCAN CHANGE: Log specific error ---
  console.error("CRITICAL ERROR: Missing Supabase environment variables. Check .env file for VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY");
  // --- END VULCAN CHANGE ---
  throw new Error('Missing Supabase environment variables.'); // Keep throwing error
}

// --- VULCAN CHANGE: Log URL being used ---
console.log(`[supabase.js] Initializing Supabase client for URL: ${supabaseUrl}`);
// --- END VULCAN CHANGE ---

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true, // Persist session in local storage
    autoRefreshToken: true, // Automatically refresh expiring tokens
    detectSessionInUrl: true // Detect session from URL (e.g., email magic links)
  }
});

// --- VULCAN CHANGE: Add listener for debugging ---
supabase.auth.onAuthStateChange((event, session) => {
    console.log(`[supabase.js] Auth state changed: ${event}`, session);
});
// --- END VULCAN CHANGE ---