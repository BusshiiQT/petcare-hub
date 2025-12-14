"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabaseClient";
import { Container } from "@/components/container";
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
        const { data: userData, error: userError } =
          await supabase.auth.getUser();
        if (userError) throw userError;

        const user = userData.user;
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
  }, []);

  const formatTime = (t: string) => t.slice(0, 5); // "HH:MM:SS" -> "HH:MM"

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
      <main className="min-h-screen bg-white py-16">
        <Container>
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle>Availability</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Loading your availability schedule...
              </p>
            </CardContent>
          </Card>
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
              <CardTitle>Provider Availability</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-700">
                You need to be logged in as a provider to manage availability.
              </p>
              <Button onClick={() => router.push("/auth/login")}>
                Go to Login
              </Button>
            </CardContent>
          </Card>
        </Container>
      </main>
    );
  }

  if (!provider) {
    return (
      <main className="min-h-screen bg-white py-16">
        <Container>
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle>Provider Availability</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-700">
                You don&apos;t have a provider profile yet.
              </p>
              <Button onClick={() => router.push("/provider/profile")}>
                Create provider profile
              </Button>
            </CardContent>
          </Card>
        </Container>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white py-16">
      <Container>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              Weekly availability
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Set when you&apos;re available for bookings. Owners can only
              request times inside these windows.
            </p>
          </div>
          <Button
            variant="outline"
            className="rounded-full"
            onClick={() => router.push("/providers")}
          >
            Back to dashboard
          </Button>
        </div>

        {errorMsg && (
          <p className="text-sm text-red-600 mb-3">{errorMsg}</p>
        )}
        {successMsg && (
          <p className="text-sm text-green-600 mb-3">{successMsg}</p>
        )}

        {/* Weekly grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-8">
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
                className="h-full"
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">
                    {label}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {slotsForDay.length === 0 ? (
                    <p className="text-xs text-gray-500">
                      No availability set.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {slotsForDay.map((slot) => (
                        <li
                          key={slot.id}
                          className="flex items-center justify-between gap-2 border rounded-md px-2 py-1.5 text-xs"
                        >
                          <div>
                            <p className="font-medium text-gray-800">
                              {formatTime(slot.start_time)} –{" "}
                              {formatTime(slot.end_time)}
                            </p>
                            <p
                              className={`mt-0.5 ${
                                slot.is_active
                                  ? "text-green-600"
                                  : "text-gray-400"
                              }`}
                            >
                              {slot.is_active ? "Active" : "Paused"}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-6 px-2 text-[11px]"
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
                              className="h-6 px-2 text-[11px] text-red-600"
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

        {/* Add slot form */}
        <Card className="max-w-xl">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">
              Add availability slot
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="grid gap-3 md:grid-cols-[1.2fr,1fr,1fr] md:items-end"
              onSubmit={handleAddSlot}
            >
              <div className="space-y-1 md:col-span-1">
                <label className="block text-xs font-medium text-gray-700">
                  Day of week
                </label>
                <select
                  className="w-full border rounded-md px-3 py-2 text-sm"
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
                <label className="block text-xs font-medium text-gray-700">
                  Start time
                </label>
                <Input
                  type="time"
                  value={newStart}
                  onChange={(e) => setNewStart(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-700">
                  End time
                </label>
                <Input
                  type="time"
                  value={newEnd}
                  onChange={(e) => setNewEnd(e.target.value)}
                  required
                />
              </div>

              <div className="md:col-span-3 mt-1">
                <Button type="submit" className="rounded-full w-full md:w-auto">
                  Add slot
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </Container>
    </main>
  );
}
