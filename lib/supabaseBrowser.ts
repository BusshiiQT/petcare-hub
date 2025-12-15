"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function getEnv(name: string) {
  return process.env[name];
}

function createSupabaseBrowserClient(): SupabaseClient {
  const url = getEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  // Don’t throw at import time (avoids build/prerender crashes).
  // If env is missing, create a "disabled" client and warn.
  if (!url || !anonKey) {
    console.warn(
      "Supabase env vars missing (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY)."
    );

    // Create a harmless placeholder client to prevent runtime crashes in build.
    // It will fail requests until env vars are set.
    return createClient("http://localhost:54321", "public-anon-key-placeholder", {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
  }

  return createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
}

export const supabaseBrowser = createSupabaseBrowserClient();

// ✅ Backwards compatible alias so existing code can keep using `supabase`
export const supabase = supabaseBrowser;
