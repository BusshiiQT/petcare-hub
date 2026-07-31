"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabaseBrowser";
import { requireUser } from "@/lib/requireUser";

import { PageShell } from "@/components/app/page-shell";
import { PageHeader } from "@/components/app/page-header";
import { PageSection } from "@/components/app/page-section";
import { FeedbackAlert } from "@/components/app/feedback-alert";
import { EmptyState } from "@/components/app/empty-state";
import { LoadingState } from "@/components/app/loading-state";
import {
  StatusBadge,
  type StatusBadgeTone,
} from "@/components/app/status-badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ProviderProfile = {
  id: string;
  display_name: string;
};

type AvailabilityRow = {
  id: string;
  provider_profile_id: string;
  weekday: number; // 0-6
  start_time: string; // "HH:MM:SS"
  end_time: string; // "HH:MM:SS"
  is_active: boolean;
};

const dayNames = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const MotionCard = motion(Card);

export default function ProviderAvailabilityPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [provider, setProvider] = useState<ProviderProfile | null>(null);
  const [availability, setAvailability] = useState<AvailabilityRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // New slot form state
  const [newWeekday, setNewWeekday] = useState<number>(1); // Monday default
  const [newStart, setNewStart] = useState<string>("09:00");
  const [newEnd, setNewEnd] = useState<string>("17:00");

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setErrorMsg(null);
      setSuccessMsg(null);

      try {
        const user = await requireUser(() => router.replace("/auth/login"));
        if (!user) {
          setUserId(null);
          return;
        }

        setUserId(user.id);

        // Load provider profile for this user
        const { data: providerData, error: providerError } = await supabase
          .from("provider_profiles")
          .select("id, display_name")
          .eq("user_id", user.id)
          .maybeSingle();

        if (providerError && providerError.code !== "PGRST116") {
          throw providerError;
        }

        if (!providerData) {
          setProvider(null);
          return;
        }

        const providerProfile = providerData as ProviderProfile;
        setProvider(providerProfile);

        // Load availability slots
        const { data: availData, error: availError } = await supabase
          .from("provider_availability")
          .select(
            "id, provider_profile_id, weekday, start_time, end_time, is_active"
          )
          .eq("provider_profile_id", providerProfile.id)
          .order("weekday", { ascending: true })
          .order("start_time", { ascending: true });

        if (availError) {
          console.error("Error loading availability:", availError);
          setErrorMsg("Failed to load availability.");
        } else {
          setAvailability((availData || []) as AvailabilityRow[]);
        }
      } catch (err) {
        console.error("Error loading provider availability:", err);
        setErrorMsg("Failed to load provider availability.");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [router]);

  const formatTime = (t: string) => t.slice(0, 5); // "HH:MM:SS" -> "HH:MM"

  const getAvailabilityTone = (isActive: boolean): StatusBadgeTone =>
    isActive ? "success" : "neutral";

  const handleAddSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!provider) return;

    setErrorMsg(null);
    setSuccessMsg(null);

    if (!newStart || !newEnd) {
      setErrorMsg("Please choose a start and end time.");
      return;
    }

    const start = new Date(`1970-01-01T${newStart}:00`);
    const end = new Date(`1970-01-01T${newEnd}:00`);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      setErrorMsg("Invalid time format.");
      return;
    }
    if (end <= start) {
      setErrorMsg("End time must be after start time.");
      return;
    }

    const { data, error } = await supabase
      .from("provider_availability")
      .insert({
        provider_profile_id: provider.id,
        weekday: newWeekday,
        start_time: `${newStart}:00`,
        end_time: `${newEnd}:00`,
        is_active: true,
      })
      .select(
        "id, provider_profile_id, weekday, start_time, end_time, is_active"
      )
      .single();

    if (error) {
      console.error("Error adding slot:", error);
      setErrorMsg("Failed to add availability slot.");
      return;
    }

    setAvailability((prev) =>
      [...prev, data as AvailabilityRow].sort((a, b) => {
        if (a.weekday !== b.weekday) return a.weekday - b.weekday;
        return a.start_time.localeCompare(b.start_time);
      })
    );

    setSuccessMsg("Availability slot added.");
  };

  const handleToggleActive = async (row: AvailabilityRow) => {
    setSavingId(row.id);
    setErrorMsg(null);
    setSuccessMsg(null);

    const { data, error } = await supabase
      .from("provider_availability")
      .update({ is_active: !row.is_active })
      .eq("id", row.id)
      .select(
        "id, provider_profile_id, weekday, start_time, end_time, is_active"
      )
      .single();

    setSavingId(null);

    if (error) {
      console.error("Error updating slot:", error);
      setErrorMsg("Failed to update slot.");
      return;
    }

    const updated = data as AvailabilityRow;
    setAvailability((prev) =>
      prev.map((slot) => (slot.id === row.id ? updated : slot))
    );
    setSuccessMsg("Availability updated.");
  };

  const handleDeleteSlot = async (row: AvailabilityRow) => {
    if (!confirm("Remove this availability slot?")) return;

    setSavingId(row.id);
    setErrorMsg(null);
    setSuccessMsg(null);

    const { error } = await supabase
      .from("provider_availability")
      .delete()
      .eq("id", row.id);

    setSavingId(null);

    if (error) {
      console.error("Error deleting slot:", error);
      setErrorMsg("Failed to delete slot.");
      return;
    }

    setAvailability((prev) => prev.filter((slot) => slot.id !== row.id));
    setSuccessMsg("Availability slot removed.");
  };

  if (isLoading) {
    return (
      <PageShell>
        <PageHeader
          title="Provider availability"
          description="Set the weekly times when pet owners can request your services."
        />
        <LoadingState label="Loading your availability schedule">
          <Card className="max-w-md">
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Loading your availability schedule...
              </p>
            </CardContent>
          </Card>
        </LoadingState>
      </PageShell>
    );
  }

  if (!userId) {
    return (
      <PageShell>
        <PageHeader
          title="Provider availability"
          description="Set the weekly times when pet owners can request your services."
        />
        <PageSection aria-label="Sign in required">
          <EmptyState
            variant="panel"
            title="Sign in to manage availability"
            description="You need to be logged in as a provider to manage availability."
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

  if (!provider) {
    return (
      <PageShell>
        <PageHeader
          title="Provider availability"
          description="Set the weekly times when pet owners can request your services."
        />
        <PageSection aria-label="Provider profile required">
          <EmptyState
            variant="panel"
            title="Create your provider profile"
            description="You don’t have a provider profile yet."
            primaryAction={
              <Button onClick={() => router.push("/provider/profile")}>
                Create provider profile
              </Button>
            }
          />
        </PageSection>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title="Provider availability"
        description="Set when you’re available for bookings. Owners can only request times inside these windows."
        actions={
          <Button
            variant="outline"
            className="h-auto min-h-9 whitespace-normal rounded-full py-2 text-center"
            onClick={() => router.push("/providers")}
          >
            Back to dashboard
          </Button>
        }
      />

      {errorMsg && <FeedbackAlert variant="error">{errorMsg}</FeedbackAlert>}
      {successMsg && (
        <FeedbackAlert variant="success">{successMsg}</FeedbackAlert>
      )}

      {/* Weekly grid */}
      <PageSection
        title="Weekly schedule"
        description="Manage each day’s booking windows and availability status."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {dayNames.map((label, dayIndex) => {
            const slotsForDay = availability.filter(
              (slot) => slot.weekday === dayIndex
            );

            return (
              <MotionCard
                key={dayIndex}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: dayIndex * 0.04 }}
                className="h-full gap-0 py-0"
              >
                <CardHeader className="border-b px-4 py-3">
                  <CardTitle>
                    <h3 className="text-sm font-semibold">{label}</h3>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  {slotsForDay.length === 0 ? (
                    <EmptyState variant="compact" title="No availability set" />
                  ) : (
                    <ul className="space-y-3">
                      {slotsForDay.map((slot) => (
                        <li
                          key={slot.id}
                          className="flex flex-col gap-3 rounded-md border p-3 text-xs sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="min-w-0 space-y-1.5">
                            <p className="font-medium text-foreground">
                              {formatTime(slot.start_time)} –{" "}
                              {formatTime(slot.end_time)}
                            </p>
                            <StatusBadge
                              tone={getAvailabilityTone(slot.is_active)}
                            >
                              {slot.is_active ? "Active" : "Paused"}
                            </StatusBadge>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="text-xs"
                              disabled={savingId === slot.id}
                              onClick={() => handleToggleActive(slot)}
                            >
                              {savingId === slot.id
                                ? "Saving..."
                                : slot.is_active
                                ? "Pause"
                                : "Activate"}
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="text-xs text-red-600"
                              disabled={savingId === slot.id}
                              onClick={() => handleDeleteSlot(slot)}
                            >
                              Delete
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </MotionCard>
            );
          })}
        </div>
      </PageSection>

      {/* Add slot form */}
      <PageSection
        title="Add availability"
        description="Add another booking window to your weekly schedule."
      >
        <Card className="max-w-xl">
          <CardContent>
            <form
              className="grid gap-3 md:grid-cols-[1.2fr,1fr,1fr] md:items-end"
              onSubmit={handleAddSlot}
            >
              <div className="space-y-1 md:col-span-1">
                <label
                  htmlFor="availability-day"
                  className="block text-xs font-medium text-foreground"
                >
                  Day of week
                </label>
                <select
                  id="availability-day"
                  className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30"
                  value={newWeekday}
                  onChange={(e) => setNewWeekday(Number(e.target.value))}
                >
                  {dayNames.map((label, index) => (
                    <option key={index} value={index}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="availability-start"
                  className="block text-xs font-medium text-foreground"
                >
                  Start time
                </label>
                <Input
                  id="availability-start"
                  type="time"
                  value={newStart}
                  onChange={(e) => setNewStart(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="availability-end"
                  className="block text-xs font-medium text-foreground"
                >
                  End time
                </label>
                <Input
                  id="availability-end"
                  type="time"
                  value={newEnd}
                  onChange={(e) => setNewEnd(e.target.value)}
                  required
                />
              </div>

              <div className="mt-1 flex flex-wrap md:col-span-3">
                <Button type="submit" className="w-full rounded-full md:w-auto">
                  Add slot
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </PageSection>
    </PageShell>
  );
}
