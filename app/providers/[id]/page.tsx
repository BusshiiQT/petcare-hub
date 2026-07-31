"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseBrowser";
import { requireUser } from "@/lib/requireUser";

import { PageShell } from "@/components/app/page-shell";
import { PageHeader } from "@/components/app/page-header";
import { PageSection } from "@/components/app/page-section";
import { FeedbackAlert } from "@/components/app/feedback-alert";
import { EmptyState } from "@/components/app/empty-state";
import { LoadingState } from "@/components/app/loading-state";
import { Card, CardContent } from "@/components/ui/card";
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

      const user = await requireUser(() => router.replace("/auth/login"));

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
  }, [providerId, router]);

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
      <PageShell>
        <PageHeader
          title="Provider details"
          description="Review services, availability, and feedback before requesting care."
        />
        <LoadingState label="Loading provider details">
          <p className="text-sm text-muted-foreground">Loading provider...</p>
        </LoadingState>
      </PageShell>
    );
  }

  if (!userId) {
    return (
      <PageShell>
        <PageHeader
          title="Provider details"
          description="Review services, availability, and feedback before requesting care."
        />
        <PageSection aria-label="Sign in required">
          <EmptyState
            variant="panel"
            title="Sign in to view provider details"
            description="You need to be logged in to view provider details and request a booking."
            primaryAction={
              <Button onClick={() => router.push("/auth/login")}>
                Go to Login
              </Button>
            }
          />
        </PageSection>
      </PageShell>
    );
  }

  if (!provider || loadError) {
    return (
      <PageShell>
        <PageHeader
          title="Provider details"
          description="Review services, availability, and feedback before requesting care."
        />
        <PageSection aria-label="Unable to load provider">
          <FeedbackAlert variant="error">
            {loadError ?? "Provider not found."}
          </FeedbackAlert>
        </PageSection>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title={provider.display_name}
        description={
          formatLocation(provider) ||
          "Review this provider’s services, availability, and feedback."
        }
      />

      {(provider.hourly_rate != null || avgRating != null) && (
        <PageSection title="Provider overview">
          <Card>
            <CardContent>
              <dl className="flex flex-wrap gap-x-8 gap-y-4">
                {provider.hourly_rate != null && (
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Hourly rate
                    </dt>
                    <dd className="mt-1 text-lg font-semibold text-foreground">
                      ${provider.hourly_rate.toFixed(0)} per hour
                    </dd>
                  </div>
                )}
                {avgRating != null && (
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Rating
                    </dt>
                    <dd className="mt-1 text-lg font-semibold text-foreground">
                      ★ {avgRating.toFixed(1)}{" "}
                      <span className="text-sm font-normal text-muted-foreground">
                        ({reviews.length} review
                        {reviews.length === 1 ? "" : "s"})
                      </span>
                    </dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>
        </PageSection>
      )}

      <div className="grid min-w-0 items-start gap-8 lg:grid-cols-[minmax(0,1.25fr)_minmax(20rem,0.75fr)]">
        <div className="min-w-0 space-y-8">
          {provider.bio && (
            <PageSection title="About">
              <Card>
                <CardContent>
                  <p className="whitespace-pre-line text-sm leading-6 text-foreground">
                    {provider.bio}
                  </p>
                </CardContent>
              </Card>
            </PageSection>
          )}

          {provider.services && provider.services.length > 0 && (
            <PageSection title="Services">
              <Card>
                <CardContent>
                  <ul className="flex flex-wrap gap-2 text-sm">
                    {provider.services.map((service) => (
                      <li
                        key={service}
                        className="rounded-full bg-muted px-3 py-1.5 text-muted-foreground"
                      >
                        {service}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </PageSection>
          )}

          <PageSection
            title="Availability"
            description="Availability windows currently offered each week."
          >
            <Card>
              <CardContent>
                {weeklySummary.size === 0 ? (
                  <EmptyState
                    variant="compact"
                    title="No availability set"
                    description="This provider hasn’t set availability yet."
                  />
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {Array.from({ length: 7 }).map((_, day) => {
                      const slots = weeklySummary.get(day) ?? [];
                      return (
                        <div
                          key={day}
                          className="flex min-w-0 items-start justify-between gap-3 rounded-md border p-3"
                        >
                          <span className="text-sm font-medium text-foreground">
                            {dayNames[day]}
                          </span>
                          <span className="min-w-0 text-right text-sm text-muted-foreground">
                            {slots.length === 0
                              ? "—"
                              : slots
                                  .map(
                                    (s) =>
                                      `${hmFromTimeString(
                                        s.start_time
                                      )}–${hmFromTimeString(s.end_time)}`
                                  )
                                  .join(", ")}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </PageSection>

          <PageSection title="Reviews">
            {reviews.length === 0 ? (
              <EmptyState
                variant="panel"
                title="No reviews yet"
                description="Be the first to leave a review."
              />
            ) : (
              <ul className="max-h-96 space-y-3 overflow-y-auto pr-1">
                {reviews.map((r) => (
                  <li key={r.id}>
                    <Card className="gap-0 py-0">
                      <CardContent className="space-y-2 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <span
                            className="text-sm text-amber-700"
                            aria-label={`${r.rating} out of 5 stars`}
                          >
                            {"★".repeat(r.rating)} {"☆".repeat(5 - r.rating)}
                          </span>
                          <time
                            className="text-xs text-muted-foreground"
                            dateTime={r.created_at}
                          >
                            {new Date(r.created_at).toLocaleDateString()}
                          </time>
                        </div>
                        {r.comment && (
                          <p className="text-sm leading-6 text-foreground">
                            {r.comment}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </li>
                ))}
              </ul>
            )}
          </PageSection>
        </div>

        <div className="min-w-0 space-y-8">
          <PageSection title="Request a booking">
            <Card>
              <CardContent className="space-y-6">
              {pets.length === 0 ? (
                  <EmptyState
                    variant="compact"
                    title="Add a pet before booking"
                    description="You need to add a pet before booking."
                    primaryAction={
                      <Button onClick={() => router.push("/pets")}>
                        Go to My Pets
                      </Button>
                    }
                  />
              ) : (
                <>
                    <fieldset className="rounded-lg border p-4">
                      <legend className="px-1 text-sm font-medium text-foreground">
                        Pick a time range (next 7 days)
                      </legend>
                      <p className="mb-3 text-xs text-muted-foreground">
                        Pick a start time, then pick an end time.
                      </p>

                      <div className="max-h-80 space-y-4 overflow-y-auto pr-1">
                      {pickerDays.every((d) => d.times.length === 0) ? (
                          <EmptyState
                            variant="compact"
                            title="No available times"
                            description="No available times found in the next 7 days (based on provider availability)."
                          />
                      ) : (
                        pickerDays.map((d) => (
                          <div key={d.dateKey} className="space-y-2">
                              <p className="text-xs font-semibold text-foreground">
                                {d.label}
                              </p>

                            {d.times.length === 0 ? (
                                <p className="text-xs text-muted-foreground">
                                  No times
                                </p>
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
                                      aria-pressed={Boolean(isStart || isEnd)}
                                      className={[
                                          "min-h-9 rounded-full px-3 text-xs",
                                          inRange
                                            ? "border-border bg-muted text-foreground"
                                            : "",
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
                    </fieldset>

                    <form className="space-y-4" onSubmit={handleCreateBooking}>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <label
                            htmlFor="booking-pet"
                            className="block text-xs font-medium text-foreground"
                          >
                            Pet
                          </label>
                      <select
                            id="booking-pet"
                            className="h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30"
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

                        <div className="space-y-1.5">
                          <label
                            htmlFor="booking-service"
                            className="block text-xs font-medium text-foreground"
                          >
                            Service type
                          </label>
                      <select
                            id="booking-service"
                            className="h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30"
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
                    </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <label
                            htmlFor="booking-start"
                            className="block text-xs font-medium text-foreground"
                          >
                            Start time
                          </label>
                      <Input
                            id="booking-start"
                        type="datetime-local"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        required
                      />
                        </div>

                        <div className="space-y-1.5">
                          <label
                            htmlFor="booking-end"
                            className="block text-xs font-medium text-foreground"
                          >
                            End time
                          </label>
                      <Input
                            id="booking-end"
                        type="datetime-local"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        required
                      />
                        </div>
                    </div>

                      <div className="space-y-1.5">
                        <label
                          htmlFor="booking-notes"
                          className="block text-xs font-medium text-foreground"
                        >
                          Notes (optional)
                        </label>
                      <textarea
                          id="booking-notes"
                          className="min-h-24 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30"
                        rows={3}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Share any special instructions or details."
                      />
                    </div>

                      {bookingError && (
                        <FeedbackAlert variant="error">
                          {bookingError}
                        </FeedbackAlert>
                      )}
                      {bookingSuccess && (
                        <FeedbackAlert variant="success">
                          {bookingSuccess}
                        </FeedbackAlert>
                      )}

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
              </CardContent>
            </Card>
          </PageSection>

          <PageSection title="Leave a review">
            <Card>
              <CardContent>
                <form className="space-y-4" onSubmit={handleSubmitReview}>
                  <div className="space-y-1.5">
                    <label
                      htmlFor="review-rating"
                      className="block text-xs font-medium text-foreground"
                    >
                      Rating
                    </label>
                    <select
                      id="review-rating"
                      className="h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30"
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

                  <div className="space-y-1.5">
                    <label
                      htmlFor="review-comment"
                      className="block text-xs font-medium text-foreground"
                    >
                      Comment (optional)
                    </label>
                    <textarea
                      id="review-comment"
                      className="min-h-24 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30"
                      rows={3}
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      placeholder="Share your experience with this provider."
                    />
                  </div>

                  {reviewError && (
                    <FeedbackAlert variant="error">{reviewError}</FeedbackAlert>
                  )}
                  {reviewSuccess && (
                    <FeedbackAlert variant="success">
                      {reviewSuccess}
                    </FeedbackAlert>
                  )}

                  <Button type="submit" className="w-full rounded-full" disabled={isSubmittingReview}>
                    {isSubmittingReview ? "Submitting..." : "Submit review"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </PageSection>
        </div>
      </div>
    </PageShell>
  );
}
