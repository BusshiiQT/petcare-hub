import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type ServiceType = "walk" | "sitting" | "training" | "other";

type Body = {
  accessToken: string;
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

export async function POST(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !anonKey) {
      return NextResponse.json(
        { ok: false, error: "Server missing Supabase public env vars." },
        { status: 500 }
      );
    }
    if (!serviceRoleKey) {
      return NextResponse.json(
        { ok: false, error: "Missing SUPABASE_SERVICE_ROLE_KEY (server-only)." },
        { status: 500 }
      );
    }

    const body = (await req.json()) as Body;

    if (!body.accessToken) {
      return NextResponse.json(
        { ok: false, error: "You must be logged in." },
        { status: 401 }
      );
    }

    // Verify token → user identity
    const authClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false },
    });

    const { data: authData, error: authError } = await authClient.auth.getUser(
      body.accessToken
    );

    if (authError || !authData.user) {
      return NextResponse.json(
        { ok: false, error: "Session expired. Please log in again." },
        { status: 401 }
      );
    }

    const userId = authData.user.id;

    // Admin client for DB checks + insert
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const start = new Date(body.startISO);
    const end = new Date(body.endISO);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json(
        { ok: false, error: "Invalid date/time." },
        { status: 400 }
      );
    }
    if (end <= start) {
      return NextResponse.json(
        { ok: false, error: "End must be after start." },
        { status: 400 }
      );
    }

    // 0) Validate pet belongs to user
    const { data: petRow, error: petError } = await admin
      .from("pets")
      .select("id, owner_id")
      .eq("id", body.petId)
      .maybeSingle();

    if (petError) {
      console.error("Pet ownership check error:", petError);
      return NextResponse.json(
        { ok: false, error: "Failed to validate pet ownership." },
        { status: 500 }
      );
    }
    if (!petRow) {
      return NextResponse.json(
        { ok: false, error: "Pet not found." },
        { status: 404 }
      );
    }
    if (petRow.owner_id !== userId) {
      return NextResponse.json(
        { ok: false, error: "That pet does not belong to you." },
        { status: 403 }
      );
    }

    // 1) Availability check
    const weekday = start.getDay(); // 0-6

    const { data: availRows, error: availError } = await admin
      .from("provider_availability")
      .select("start_time, end_time, is_active")
      .eq("provider_profile_id", body.providerProfileId)
      .eq("weekday", weekday)
      .eq("is_active", true);

    if (availError) {
      console.error("Availability check error:", availError);
      return NextResponse.json(
        { ok: false, error: "Failed to check availability." },
        { status: 500 }
      );
    }
    if (!availRows || availRows.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Provider has no availability set for that day." },
        { status: 400 }
      );
    }

    const startHM = start.toTimeString().slice(0, 5);
    const endHM = end.toTimeString().slice(0, 5);

    const fitsWindow = availRows.some((slot) => {
      const slotStart = (slot.start_time as string).slice(0, 5);
      const slotEnd = (slot.end_time as string).slice(0, 5);
      return slotStart <= startHM && slotEnd >= endHM;
    });

    if (!fitsWindow) {
      return NextResponse.json(
        { ok: false, error: "Provider isn't available for that time range." },
        { status: 400 }
      );
    }

    // 2) Overlap check
    const { data: existing, error: existingError } = await admin
      .from("bookings")
      .select("id, start_time, end_time, status")
      .eq("provider_profile_id", body.providerProfileId)
      .in("status", ["pending", "confirmed"]);

    if (existingError) {
      console.error("Existing booking check error:", existingError);
      return NextResponse.json(
        { ok: false, error: "Failed to check booking conflicts." },
        { status: 500 }
      );
    }

    const hasOverlap =
      existing?.some((b) => {
        const bStart = new Date(b.start_time as string);
        const bEnd = new Date(b.end_time as string);
        if (isNaN(bStart.getTime()) || isNaN(bEnd.getTime())) return false;
        return rangesOverlap(start, end, bStart, bEnd);
      }) ?? false;

    if (hasOverlap) {
      return NextResponse.json(
        { ok: false, error: "That time conflicts with another booking." },
        { status: 409 }
      );
    }

    // 3) Insert booking
    const { data: inserted, error: insertError } = await admin
      .from("bookings")
      .insert({
        owner_id: userId,
        provider_profile_id: body.providerProfileId,
        pet_id: body.petId,
        service_type: body.serviceType,
        start_time: body.startISO,
        end_time: body.endISO,
        notes: body.notes ?? null,
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
        return NextResponse.json(
          { ok: false, error: "That time was just booked. Pick another slot." },
          { status: 409 }
        );
      }

      console.error("Booking insert error:", insertError);
      return NextResponse.json(
        { ok: false, error: "Unable to create booking. Try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, booking: inserted });
  } catch (err) {
    console.error("API create booking error:", err);
    return NextResponse.json(
      { ok: false, error: "Unexpected server error." },
      { status: 500 }
    );
  }
}
