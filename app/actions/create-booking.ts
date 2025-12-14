"use server";

import { createClient } from "@supabase/supabase-js";

type ServiceType = "walk" | "sitting" | "training" | "other";

type CreateBookingInput = {
  accessToken: string; // comes from supabase.auth.getSession() on the client
  providerProfileId: string;
  petId: string;
  serviceType: ServiceType;
  startISO: string;
  endISO: string;
  notes?: string | null;
};

function rangesOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart < bEnd && aEnd > bStart;
}

export async function createBooking(input: CreateBookingInput) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    return { ok: false as const, error: "Missing NEXT_PUBLIC_SUPABASE_URL." };
  }
  if (!anonKey) {
    return {
      ok: false as const,
      error: "Missing NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    };
  }
  if (!serviceRoleKey) {
    return {
      ok: false as const,
      error:
        "Missing SUPABASE_SERVICE_ROLE_KEY (server-only). Add it to .env.local.",
    };
  }
  if (!input.accessToken) {
    return { ok: false as const, error: "You must be logged in." };
  }

  // Verify token -> trusted user
  const authClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false },
  });

  const { data: authData, error: authError } = await authClient.auth.getUser(
    input.accessToken
  );

  if (authError || !authData.user) {
    return {
      ok: false as const,
      error: "Session expired. Please log in again.",
    };
  }

  const userId = authData.user.id;

  // Admin client for DB checks + insert
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const start = new Date(input.startISO);
  const end = new Date(input.endISO);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return { ok: false as const, error: "Invalid date/time." };
  }
  if (end <= start) {
    return { ok: false as const, error: "End must be after start." };
  }

  // 0) Validate pet belongs to user
  const { data: petRow, error: petError } = await admin
    .from("pets")
    .select("id, owner_id")
    .eq("id", input.petId)
    .maybeSingle();

  if (petError) {
    console.error("Pet ownership check error:", petError);
    return { ok: false as const, error: "Failed to validate pet ownership." };
  }
  if (!petRow) {
    return { ok: false as const, error: "Pet not found." };
  }
  if (petRow.owner_id !== userId) {
    return { ok: false as const, error: "That pet does not belong to you." };
  }

  // 1) Availability check
  const weekday = start.getDay(); // 0-6

  const { data: availRows, error: availError } = await admin
    .from("provider_availability")
    .select("start_time, end_time, is_active")
    .eq("provider_profile_id", input.providerProfileId)
    .eq("weekday", weekday)
    .eq("is_active", true);

  if (availError) {
    console.error("Availability check error:", availError);
    return { ok: false as const, error: "Failed to check availability." };
  }
  if (!availRows || availRows.length === 0) {
    return {
      ok: false as const,
      error: "Provider has no availability set for that day.",
    };
  }

  const startHM = start.toTimeString().slice(0, 5);
  const endHM = end.toTimeString().slice(0, 5);

  const fitsWindow = availRows.some((slot) => {
    const slotStart = (slot.start_time as string).slice(0, 5);
    const slotEnd = (slot.end_time as string).slice(0, 5);
    return slotStart <= startHM && slotEnd >= endHM;
  });

  if (!fitsWindow) {
    return {
      ok: false as const,
      error: "Provider isn't available for that time range.",
    };
  }

  // 2) Overlap check (pending/confirmed)
  const { data: existing, error: existingError } = await admin
    .from("bookings")
    .select("id, start_time, end_time, status")
    .eq("provider_profile_id", input.providerProfileId)
    .in("status", ["pending", "confirmed"]);

  if (existingError) {
    console.error("Existing booking check error:", existingError);
    return { ok: false as const, error: "Failed to check booking conflicts." };
  }

  const hasOverlap =
    existing?.some((b) => {
      const bStart = new Date(b.start_time as string);
      const bEnd = new Date(b.end_time as string);
      if (isNaN(bStart.getTime()) || isNaN(bEnd.getTime())) return false;
      return rangesOverlap(start, end, bStart, bEnd);
    }) ?? false;

  if (hasOverlap) {
    return {
      ok: false as const,
      error: "That time conflicts with another booking.",
    };
  }

  // 3) Insert booking
  const { data: inserted, error: insertError } = await admin
    .from("bookings")
    .insert({
      owner_id: userId,
      provider_profile_id: input.providerProfileId,
      pet_id: input.petId,
      service_type: input.serviceType,
      start_time: input.startISO,
      end_time: input.endISO,
      notes: input.notes ?? null,
      status: "pending",
    })
    .select("id, start_time, end_time, status")
    .single();

  if (insertError) {
    if (
      insertError.code === "23P01" ||
      (typeof insertError.message === "string" &&
        insertError.message.includes(
          "bookings_no_overlap_provider_pending_confirmed"
        ))
    ) {
      return {
        ok: false as const,
        error: "That time was just booked. Please choose another slot.",
      };
    }

    console.error("Booking insert error:", insertError);
    return { ok: false as const, error: "Unable to create booking. Try again." };
  }

  if (!inserted) {
    return { ok: false as const, error: "Booking failed." };
  }

  return { ok: true as const, booking: inserted };
}
