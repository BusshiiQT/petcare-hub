"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseBrowser";

import { Container } from "@/components/container";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Provider = {
  id: string;
  display_name: string;
  bio: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  services: string[] | null;
  hourly_rate: number | null;
};

type PetSummary = {
  id: string;
  name: string;
  type: "dog" | "cat" | "other";
};

type ReviewRow = {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
};

type AvailabilitySlot = {
  id: string;
  weekday: number; // 0 (Sun) -> 6 (Sat)
  start_time: string; // "HH:MM:SS"
  end_time: string; // "HH:MM:SS"
  is_active: boolean;
};

type ExistingBooking = {
  id: string;
  start_time: string;
  end_time: string;
  status: "pending" | "confirmed" | "completed" | "cancelled";
};

const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function toLocalDateTimeInputValue(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(
    d.getDate()
  )}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function hmFromTimeString(t: string) {
  return t.slice(0, 5);
}

function minutesFromHM(hm: string) {
  const [h, m] = hm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function rangesOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart < bEnd && aEnd > bStart;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function addMinutes(d: Date, mins: number) {
  const copy = new Date(d);
  copy.setMinutes(copy.getMinutes() + mins);
  return copy;
}

export default function ProviderDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const providerId = params?.id;

  const [userId, setUserId] = useState<string | null>(null);
  const [provider, setProvider] = useState<Provider | null>(null);
  const [pets, setPets] = useState<PetSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [activeBookings, setActiveBookings] = useState<ExistingBooking[]>([]);

  // Booking form state
  const [selectedPetId, setSelectedPetId] = useState<string>("");
  const [serviceType, setServiceType] = useState<
    "walk" | "sitting" | "training" | "other"
  >("walk");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [notes, setNotes] = useState("");
  const [isBooking, setIsBooking] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState<string | null>(null);

  // Range selection state (for bubble picker)
  const [pickedStart, setPickedStart] = useState<Date | null>(null);
  const [pickedEnd, setPickedEnd] = useState<Date | null>(null);

  // Reviews state
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [avgRating, setAvgRating] = useState<number | null>(null);
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewComment, setReviewComment] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewSuccess, setReviewSuccess] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      if (!providerId) return;

      setIsLoading(true);
      setLoadError(null);

      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;

      if (!user) {
        setUserId(null);
        setIsLoading(false);
        return;
      }

      setUserId(user.id);

      const { data: providerData, error: providerError } = await supabase
        .from("provider_profiles")
        .select(
          "id, display_name, bio, city, state, country, services, hourly_rate"
        )
        .eq("id", providerId)
        .single();

      if (providerError) {
        console.error("Error loading provider:", providerError);
        setLoadError("Failed to load provider.");
        setIsLoading(false);
        return;
      }

      const providerRow = providerData as Provider;
      setProvider(providerRow);

      const { data: petsData, error: petsError } = await supabase
        .from("pets")
        .select("id, name, type")
        .order("created_at", { ascending: true });

      if (petsError) {
        console.error("Error loading pets:", petsError);
      } else {
        setPets((petsData || []) as PetSummary[]);
        if (petsData && petsData.length > 0) {
          setSelectedPetId(petsData[0].id);
        }
      }

      const { data: reviewsData, error: reviewsError } = await supabase
        .from("reviews")
        .select("id, rating, comment, created_at")
        .eq("provider_profile_id", providerId)
        .order("created_at", { ascending: false });

      if (reviewsError) {
        console.error("Error loading reviews:", reviewsError);
      } else if (reviewsData) {
        const rows = reviewsData as ReviewRow[];
        setReviews(rows);
        if (rows.length > 0) {
          const sum = rows.reduce((acc, r) => acc + (r.rating ?? 0), 0);
          setAvgRating(sum / rows.length);
        } else {
          setAvgRating(null);
        }
      }

      const { data: availData, error: availError } = await supabase
        .from("provider_availability")
        .select("id, weekday, start_time, end_time, is_active")
        .eq("provider_profile_id", providerId)
        .order("weekday", { ascending: true })
        .order("start_time", { ascending: true });

      if (availError) {
        console.error("Error loading availability:", availError);
      } else {
        setAvailability((availData || []) as AvailabilitySlot[]);
      }

      const { data: bookingData, error: bookingError2 } = await supabase
        .from("bookings")
        .select("id, start_time, end_time, status")
        .eq("provider_profile_id", providerId)
        .in("status", ["pending", "confirmed"]);

      if (bookingError2) {
        console.error("Error loading booking conflicts:", bookingError2);
      } else {
        setActiveBookings((bookingData || []) as ExistingBooking[]);
      }

      setIsLoading(false);
    };

    loadData();
  }, [providerId]);

  const formatLocation = (p: Provider) => {
    const parts = [p.city, p.state, p.country].filter(Boolean);
    return parts.join(", ");
  };

  const next7Days = useMemo(() => {
    const days: Date[] = [];
    const start = new Date();
    start.setSeconds(0);
    start.setMilliseconds(0);
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      days.push(d);
    }
    return days;
  }, []);

  const weeklySummary = useMemo(() => {
    const active = availability.filter((s) => s.is_active);
    const byDay = new Map<number, AvailabilitySlot[]>();
    for (const s of active) {
      const arr = byDay.get(s.weekday) ?? [];
      arr.push(s);
      byDay.set(s.weekday, arr);
    }
    for (const [k, arr] of byDay.entries()) {
      arr.sort((a, b) => a.start_time.localeCompare(b.start_time));
      byDay.set(k, arr);
    }
    return byDay;
  }, [availability]);

  const getDisabledReason = (t: Date): string | null => {
    const now = new Date();
    if (t <= now) return "Past time";

    const weekday = t.getDay();
    const hm = t.toTimeString().slice(0, 5);

    const daySlots = availability.filter(
      (s) => s.is_active && s.weekday === weekday
    );
    const insideWindow = daySlots.some((s) => {
      const sStart = hmFromTimeString(s.start_time);
      const sEnd = hmFromTimeString(s.end_time);
      return sStart <= hm && sEnd >= hm;
    });
    if (!insideWindow) return "Outside provider hours";

    const assumedEnd = addMinutes(t, 30);
    const overlaps = activeBookings.some((b) => {
      const bStart = new Date(b.start_time);
      const bEnd = new Date(b.end_time);
      if (isNaN(bStart.getTime()) || isNaN(bEnd.getTime())) return false;
      return rangesOverlap(t, assumedEnd, bStart, bEnd);
    });
    if (overlaps) return "Already booked";

    if (pickedStart) {
      if (!isSameDay(pickedStart, t)) return "Pick an end time on the same day";
      if (t <= pickedStart) return "End must be after start";
    }

    return null;
  };

  const isRangeAvailable = (start: Date, end: Date) => {
    if (!provider) return false;
    if (end <= start) return false;

    const weekday = start.getDay();
    if (weekday !== end.getDay() || !isSameDay(start, end)) return false;

    const slots = availability
      .filter((s) => s.is_active && s.weekday === weekday)
      .map((s) => ({
        startHM: hmFromTimeString(s.start_time),
        endHM: hmFromTimeString(s.end_time),
      }));

    if (slots.length === 0) return false;

    const startHM = start.toTimeString().slice(0, 5);
    const endHM = end.toTimeString().slice(0, 5);

    const fitsWindow = slots.some((s) => s.startHM <= startHM && s.endHM >= endHM);
    if (!fitsWindow) return false;

    const overlap = activeBookings.some((b) => {
      const bStart = new Date(b.start_time);
      const bEnd = new Date(b.end_time);
      if (isNaN(bStart.getTime()) || isNaN(bEnd.getTime())) return false;
      return rangesOverlap(start, end, bStart, bEnd);
    });

    return !overlap;
  };

  const pickerDays = useMemo(() => {
    const increment = 30;
    const now = new Date();
    const activeAvail = availability.filter((s) => s.is_active);

    return next7Days.map((day) => {
      const weekday = day.getDay();
      const dateKey = `${day.getFullYear()}-${pad2(day.getMonth() + 1)}-${pad2(
        day.getDate()
      )}`;
      const label = `${dayNames[weekday]} ${pad2(day.getMonth() + 1)}/${pad2(
        day.getDate()
      )}`;

      const times: Date[] = [];

      const dayAvail = activeAvail.filter((a) => a.weekday === weekday);
      for (const a of dayAvail) {
        const aStartHM = hmFromTimeString(a.start_time);
        const aEndHM = hmFromTimeString(a.end_time);
        const aStartMin = minutesFromHM(aStartHM);
        const aEndMin = minutesFromHM(aEndHM);

        for (let m = aStartMin; m <= aEndMin; m += increment) {
          const t = new Date(day);
          t.setHours(Math.floor(m / 60), m % 60, 0, 0);
          if (t <= now) continue;
          times.push(t);
        }
      }

      const uniq = Array.from(
        new Map(times.map((t) => [t.getTime(), t])).values()
      ).sort((a, b) => a.getTime() - b.getTime());

      return { dateKey, label, day, times: uniq.slice(0, 40) };
    });
  }, [availability, next7Days]);

  const handleTimeBubbleClick = (time: Date) => {
    setBookingError(null);
    setBookingSuccess(null);

    const reason = getDisabledReason(time);
    if (reason) return;

    if (!pickedStart || (!isSameDay(pickedStart, time) || time <= pickedStart)) {
      setPickedStart(time);
      setPickedEnd(null);
      setStartTime(toLocalDateTimeInputValue(time));
      setEndTime("");
      return;
    }

    const start = pickedStart;
    const end = time;

    if (!isRangeAvailable(start, end)) {
      setBookingError(
        "That time range isn't available (outside schedule or conflicts). Pick a different end time."
      );
      return;
    }

    setPickedEnd(end);
    setStartTime(toLocalDateTimeInputValue(start));
    setEndTime(toLocalDateTimeInputValue(end));
  };

  const canSubmitBooking = useMemo(() => {
    if (!userId) return false;
    if (!provider) return false;
    if (!selectedPetId) return false;
    if (!startTime || !endTime) return false;

    const s = new Date(startTime);
    const e = new Date(endTime);
    if (isNaN(s.getTime()) || isNaN(e.getTime())) return false;
    if (e <= s) return false;

    return true;
  }, [userId, provider, selectedPetId, startTime, endTime]);

  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !provider) return;

    setBookingError(null);
    setBookingSuccess(null);

    if (!selectedPetId) {
      setBookingError("Please select a pet.");
      return;
    }
    if (!startTime || !endTime) {
      setBookingError("Please choose a start and end time.");
      return;
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      setBookingError("Invalid date/time format.");
      return;
    }
    if (end <= start) {
      setBookingError("End time must be after start time.");
      return;
    }

    setIsBooking(true);

    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;

    if (!accessToken) {
      setIsBooking(false);
      setBookingError("Session expired. Please log in again.");
      return;
    }

    try {
      const res = await fetch("/api/bookings/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessToken,
          providerProfileId: provider.id,
          petId: selectedPetId,
          serviceType,
          startISO: start.toISOString(),
          endISO: end.toISOString(),
          notes: notes || null,
        }),
      });

      const json = await res.json();

      if (!json.ok) {
        setBookingError(json.error || "Failed to create booking.");
        return;
      }

      setBookingSuccess("Booking request sent! The provider will review it.");
      setNotes("");

      setActiveBookings((prev) => [
        ...prev,
        {
          id: json.booking.id,
          start_time: json.booking.start_time,
          end_time: json.booking.end_time,
          status: json.booking.status,
        },
      ]);
    } catch (err) {
      console.error("Create booking error:", err);
      setBookingError("Failed to create booking. Please try again.");
    } finally {
      setIsBooking(false);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !provider) return;

    setReviewError(null);
    setReviewSuccess(null);

    if (reviewRating < 1 || reviewRating > 5) {
      setReviewError("Rating must be between 1 and 5.");
      return;
    }

    setIsSubmittingReview(true);

    const { data, error } = await supabase
      .from("reviews")
      .insert({
        provider_profile_id: provider.id,
        owner_id: userId,
        rating: reviewRating,
        comment: reviewComment || null,
      })
      .select("id, rating, comment, created_at")
      .single();

    setIsSubmittingReview(false);

    if (error) {
      console.error("Error submitting review:", error);
      setReviewError("Failed to submit review. Please try again.");
      return;
    }

    const newReview = data as ReviewRow;
    const newReviews = [newReview, ...reviews];
    setReviews(newReviews);

    const sum = newReviews.reduce((acc, r) => acc + (r.rating ?? 0), 0);
    setAvgRating(sum / newReviews.length);

    setReviewRating(5);
    setReviewComment("");
    setReviewSuccess("Thank you for your review!");
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-white py-16">
        <Container>
          <p>Loading provider...</p>
        </Container>
      </main>
    );
  }

  if (!userId) {
    return (
      <main className="min-h-screen bg-white py-16">
        <Container>
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle>Provider Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-700">
                You need to be logged in to view provider details and request a booking.
              </p>
              <Button onClick={() => router.push("/auth/login")}>Go to Login</Button>
            </CardContent>
          </Card>
        </Container>
      </main>
    );
  }

  if (!provider || loadError) {
    return (
      <main className="min-h-screen bg-white py-16">
        <Container>
          <p className="text-sm text-red-600">{loadError ?? "Provider not found."}</p>
        </Container>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white py-16">
      <Container>
        <div className="grid gap-8 md:grid-cols-[1.4fr,1fr]">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">{provider.display_name}</CardTitle>

              {formatLocation(provider) && (
                <p className="text-sm text-gray-500 mt-1">{formatLocation(provider)}</p>
              )}

              <div className="mt-2 flex items-center gap-3">
                {provider.hourly_rate != null && (
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">${provider.hourly_rate.toFixed(0)}</span>{" "}
                    per hour
                  </p>
                )}
                {avgRating != null && (
                  <p className="text-sm text-yellow-600">
                    ★ {avgRating.toFixed(1)}{" "}
                    <span className="text-xs text-gray-500">
                      ({reviews.length} review{reviews.length === 1 ? "" : "s"})
                    </span>
                  </p>
                )}
              </div>
            </CardHeader>

            <CardContent className="space-y-5">
              {provider.services && provider.services.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-700 mb-1">Services offered</p>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {provider.services.map((service) => (
                      <span
                        key={service}
                        className="px-2 py-1 rounded-full bg-gray-100 text-gray-700"
                      >
                        {service}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {provider.bio && (
                <div>
                  <p className="text-xs font-semibold text-gray-700 mb-1">About</p>
                  <p className="text-sm text-gray-700 whitespace-pre-line">{provider.bio}</p>
                </div>
              )}

              <div className="border rounded-lg p-3">
                <p className="text-xs font-semibold text-gray-700 mb-2">Availability this week</p>

                {weeklySummary.size === 0 ? (
                  <p className="text-sm text-gray-500">
                    This provider hasn&apos;t set availability yet.
                  </p>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {Array.from({ length: 7 }).map((_, day) => {
                      const slots = weeklySummary.get(day) ?? [];
                      return (
                        <div key={day} className="flex items-start justify-between gap-3">
                          <div className="text-xs text-gray-600 font-medium">
                            {dayNames[day]}
                          </div>
                          <div className="text-xs text-gray-600 text-right">
                            {slots.length === 0 ? (
                              <span className="text-gray-400">—</span>
                            ) : (
                              <span>
                                {slots
                                  .map(
                                    (s) =>
                                      `${hmFromTimeString(s.start_time)}–${hmFromTimeString(
                                        s.end_time
                                      )}`
                                  )
                                  .join(", ")}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <p className="mt-2 text-[11px] text-gray-500">
                  Pick a start time, then pick an end time.
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-700 mb-2">Reviews</p>
                {reviews.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    No reviews yet. Be the first to leave one!
                  </p>
                ) : (
                  <ul className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {reviews.map((r) => (
                      <li key={r.id} className="border rounded-md px-3 py-2 text-sm">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-yellow-600 text-xs">
                            {"★".repeat(r.rating)} {"☆".repeat(5 - r.rating)}
                          </span>
                          <span className="text-[11px] text-gray-500">
                            {new Date(r.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        {r.comment && (
                          <p className="text-xs text-gray-700 mt-1">{r.comment}</p>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Request a booking</CardTitle>
            </CardHeader>

            <CardContent className="space-y-6">
              {pets.length === 0 ? (
                <div className="space-y-3">
                  <p className="text-sm text-gray-700">
                    You need to add a pet before booking.
                  </p>
                  <Button className="w-full rounded-full" onClick={() => router.push("/pets")}>
                    Go to My Pets
                  </Button>
                </div>
              ) : (
                <>
                  <div className="border rounded-lg p-3">
                    <p className="text-sm font-medium text-gray-800">
                      Pick a time range (next 7 days)
                    </p>

                    <div className="mt-3 space-y-4 max-h-72 overflow-y-auto pr-1">
                      {pickerDays.every((d) => d.times.length === 0) ? (
                        <p className="text-xs text-gray-600">
                          No available times found in the next 7 days (based on provider availability).
                        </p>
                      ) : (
                        pickerDays.map((d) => (
                          <div key={d.dateKey} className="space-y-2">
                            <div className="text-xs font-semibold text-gray-700">{d.label}</div>

                            {d.times.length === 0 ? (
                              <div className="text-xs text-gray-400">No times</div>
                            ) : (
                              <div className="flex flex-wrap gap-2">
                                {d.times.map((t) => {
                                  const isStart =
                                    pickedStart &&
                                    isSameDay(pickedStart, t) &&
                                    t.getTime() === pickedStart.getTime();

                                  const isEnd =
                                    pickedEnd &&
                                    isSameDay(pickedEnd, t) &&
                                    t.getTime() === pickedEnd.getTime();

                                  const inRange =
                                    pickedStart &&
                                    pickedEnd &&
                                    isSameDay(pickedStart, t) &&
                                    t > pickedStart &&
                                    t < pickedEnd;

                                  const label = `${pad2(t.getHours())}:${pad2(t.getMinutes())}`;

                                  const disabledReason = getDisabledReason(t);
                                  const disabled = Boolean(disabledReason);

                                  return (
                                    <Button
                                      key={`${d.dateKey}-${t.getTime()}`}
                                      type="button"
                                      size="sm"
                                      disabled={disabled}
                                      variant={isStart || isEnd ? "default" : "outline"}
                                      className={[
                                        "h-7 px-2 text-xs rounded-full",
                                        inRange ? "bg-gray-100 text-gray-900 border-gray-200" : "",
                                        disabled ? "opacity-50 cursor-not-allowed" : "",
                                      ].join(" ")}
                                      onClick={() => handleTimeBubbleClick(t)}
                                      title={disabledReason ?? "Click to pick start/end"}
                                    >
                                      {label}
                                    </Button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <form className="space-y-3" onSubmit={handleCreateBooking}>
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-gray-700">Pet</label>
                      <select
                        className="w-full border rounded-md px-3 py-2 text-sm"
                        value={selectedPetId}
                        onChange={(e) => setSelectedPetId(e.target.value)}
                      >
                        {pets.map((pet) => (
                          <option key={pet.id} value={pet.id}>
                            {pet.name} ({pet.type})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-gray-700">
                        Service type
                      </label>
                      <select
                        className="w-full border rounded-md px-3 py-2 text-sm"
                        value={serviceType}
                        onChange={(e) =>
                          setServiceType(
                            e.target.value as "walk" | "sitting" | "training" | "other"
                          )
                        }
                      >
                        <option value="walk">Walk</option>
                        <option value="sitting">Sitting</option>
                        <option value="training">Training</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-gray-700">Start time</label>
                      <Input
                        type="datetime-local"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-gray-700">End time</label>
                      <Input
                        type="datetime-local"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-gray-700">
                        Notes (optional)
                      </label>
                      <textarea
                        className="w-full border rounded-md px-3 py-2 text-sm"
                        rows={3}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Share any special instructions or details."
                      />
                    </div>

                    {bookingError && <p className="text-sm text-red-600">{bookingError}</p>}
                    {bookingSuccess && <p className="text-sm text-green-600">{bookingSuccess}</p>}

                    <Button
                      type="submit"
                      className="w-full rounded-full"
                      disabled={isBooking || !canSubmitBooking}
                      title={
                        canSubmitBooking
                          ? "Send booking request"
                          : "Select a pet and choose a valid start/end time"
                      }
                    >
                      {isBooking ? "Sending booking request..." : "Request booking"}
                    </Button>
                  </form>
                </>
              )}

              <div className="border-t pt-4">
                <p className="text-sm font-medium text-gray-800 mb-2">Leave a review</p>

                <form className="space-y-3" onSubmit={handleSubmitReview}>
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-gray-700">Rating</label>
                    <select
                      className="w-full border rounded-md px-3 py-2 text-sm"
                      value={reviewRating}
                      onChange={(e) => setReviewRating(Number(e.target.value))}
                    >
                      <option value={5}>★★★★★ (5)</option>
                      <option value={4}>★★★★☆ (4)</option>
                      <option value={3}>★★★☆☆ (3)</option>
                      <option value={2}>★★☆☆☆ (2)</option>
                      <option value={1}>★☆☆☆☆ (1)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-gray-700">
                      Comment (optional)
                    </label>
                    <textarea
                      className="w-full border rounded-md px-3 py-2 text-sm"
                      rows={3}
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      placeholder="Share your experience with this provider."
                    />
                  </div>

                  {reviewError && <p className="text-sm text-red-600">{reviewError}</p>}
                  {reviewSuccess && <p className="text-sm text-green-600">{reviewSuccess}</p>}

                  <Button type="submit" className="w-full rounded-full" disabled={isSubmittingReview}>
                    {isSubmittingReview ? "Submitting..." : "Submit review"}
                  </Button>
                </form>
              </div>
            </CardContent>
          </Card>
        </div>
      </Container>
    </main>
  );
}
