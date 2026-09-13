"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

let client: SupabaseClient<Database> | null = null;

export function getSupabaseBrowserClient() {
  if (client) return client;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    // Don't crash RSC/hydration unexpectedly; but still fail loudly in dev.
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }

  client = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  // Dashboard recovery emails use the Site URL instead of our reset route.
  // The SDK has saved the session and removed URL tokens before this event.
  if (typeof window !== "undefined") {
    client.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" && window.location.pathname !== "/auth/reset-password") {
        window.location.replace("/auth/reset-password");
      }
    });
  }

  return client;
}

// ✅ Backwards-compatible named export so your imports work:
// import { supabase } from "@/lib/supabaseBrowser";
export const supabase = getSupabaseBrowserClient();
