"use client";

import { supabase } from "@/lib/supabaseBrowser";

export async function requireUser(redirectToLogin?: () => void) {
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    redirectToLogin?.();
    return null;
  }

  return data.user;
}