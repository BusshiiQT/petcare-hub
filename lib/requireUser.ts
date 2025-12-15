"use client";

import { supabase } from "@/lib/supabaseBrowser";



export async function requireUser() {
  const { data, error } = await supabase.auth.getUser();

  if (error) throw error;
  if (!data.user) throw new Error("Not authenticated");

  return { user: data.user };
}
