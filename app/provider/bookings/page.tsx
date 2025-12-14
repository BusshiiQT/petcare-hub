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

type BookingStatus = "pending" | "confirmed" | "completed" | "cancelled";

type BookingRow = {
  id: string;
  service_type: "walk" | "sitting" | "training" | "other";
  status: BookingStatus;
  start_time: string;
  end_time: string;
  notes: string | null;
  pet: { name: string; type: "dog" | "cat" | "other" }[] | null;
  owner: { full_name: string | null }[] | null;
};

const MotionButton = motion(Button);

export default function ProviderBookingsPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [hasProviderProfile, setHasProviderProfile] = useState<boolean | null>(
    null
  );
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    const loadBookings = async () => {
      setIsLoading(true);
      setErrorMsg(null);

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

        const { data: providerProfile, error: providerError } = await supabase
          .from("provider_profiles")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (providerError && providerError.code !== "PGRST116") {
          throw providerError;
        }

        if (!providerProfile) {
          setHasProviderProfile(false);
          return;
        }

        setHasProviderProfile(true);

        const { data, error } = await supabase
          .from("bookings")
          .select(
            `
            id,
            service_type,
            status,
            start_time,
            end_time,
            notes,
            pet:pet_id (
              name,
              type
            ),
            owner:owner_id (
              full_name
            )
          `
          )
          .eq("provider_profile_id", providerProfile.id)
          .order("start_time", { ascending: false });

        if (error) throw error;

        setBookings((data || []) as BookingRow[]);
      } catch (err) {
        console.error("Error loading provider bookings:", err);
        setErrorMsg("Failed to load bookings.");
      } finally {
        setIsLoading(false);
      }
    };

    loadBookings();
  }, []);

  const formatDateTime = (iso: string) => {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleString();
  };

  const formatStatus = (status: BookingStatus) => {
    switch (status) {
      case "pending":
        return "Pending";
      case "confirmed":
        return "Confirmed";
      case "completed":
        return "Completed";
      case "cancelled":
        return "Cancelled";
      default:
        return status;
    }
  };

  const handleUpdateStatus = async (
    bookingId: string,
    status: BookingStatus
  ) => {
    setUpdatingId(bookingId);
    setErrorMsg(null);

    try {
      const { error } = await supabase
        .from("bookings")
        .update({ status })
        .eq("id", bookingId);

      if (error) throw error;

      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, status } : b))
      );
    } catch (err) {
      console.error("Error updating booking status:", err);
      setErrorMsg("Failed to update booking status.");
    } finally {
      setUpdatingId(null);
    }
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-white py-16">
        <Container>
          <p>Loading bookings...</p>
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
              <CardTitle>Provider Bookings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-700">
                You need to be logged in as a provider to view bookings.
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

  if (hasProviderProfile === false) {
    return (
      <main className="min-h-screen bg-white py-16">
        <Container>
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle>Provider Bookings</CardTitle>
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
        <Card>
          <CardHeader>
            <CardTitle>Bookings for Your Services</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {errorMsg && (
              <p className="text-sm text-red-600 mb-2">{errorMsg}</p>
            )}

            {bookings.length === 0 ? (
              <p className="text-sm text-gray-600">
                No one has booked you yet.
              </p>
            ) : (
              <motion.ul
                className="space-y-3"
                initial="hidden"
                animate="show"
                variants={{
                  hidden: { opacity: 0 },
                  show: {
                    opacity: 1,
                    transition: { staggerChildren: 0.05 },
                  },
                }}
              >
                {bookings.map((b) => {
                  const petInfo = b.pet?.[0] ?? null;
                  const ownerInfo = b.owner?.[0] ?? null;

                  return (
                    <motion.li
                      key={b.id}
                      variants={{
                        hidden: { opacity: 0, y: 8 },
                        show: { opacity: 1, y: 0 },
                      }}
                      className="border rounded-md px-3 py-2 text-sm flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-medium">
                          {petInfo
                            ? `${petInfo.name} (${petInfo.type})`
                            : "Pet not found"}
                        </div>
                        <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                          {formatStatus(b.status)}
                        </span>
                      </div>

                      <div className="text-xs text-gray-600">
                        Owner: {ownerInfo?.full_name || "Unknown owner"}
                      </div>

                      <div className="text-xs text-gray-600">
                        {b.service_type} • {formatDateTime(b.start_time)} –{" "}
                        {formatDateTime(b.end_time)}
                      </div>

                      {b.notes && (
                        <div className="text-xs text-gray-500">
                          Notes: {b.notes}
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2 mt-1">
                        {b.status === "pending" && (
                          <>
                            <MotionButton
                              type="button"
                              size="sm"
                              className="text-xs h-7 px-2"
                              disabled={updatingId === b.id}
                              onClick={() =>
                                handleUpdateStatus(b.id, "confirmed")
                              }
                              whileHover={{ scale: 1.03 }}
                              whileTap={{ scale: 0.96 }}
                            >
                              {updatingId === b.id
                                ? "Updating..."
                                : "Confirm"}
                            </MotionButton>
                            <MotionButton
                              type="button"
                              size="sm"
                              variant="outline"
                              className="text-xs h-7 px-2"
                              disabled={updatingId === b.id}
                              onClick={() =>
                                handleUpdateStatus(b.id, "cancelled")
                              }
                              whileHover={{ scale: 1.03 }}
                              whileTap={{ scale: 0.96 }}
                            >
                              Cancel
                            </MotionButton>
                          </>
                        )}

                        {b.status === "confirmed" && (
                          <>
                            <MotionButton
                              type="button"
                              size="sm"
                              className="text-xs h-7 px-2"
                              disabled={updatingId === b.id}
                              onClick={() =>
                                handleUpdateStatus(b.id, "completed")
                              }
                              whileHover={{ scale: 1.03 }}
                              whileTap={{ scale: 0.96 }}
                            >
                              {updatingId === b.id
                                ? "Updating..."
                                : "Mark completed"}
                            </MotionButton>
                            <MotionButton
                              type="button"
                              size="sm"
                              variant="outline"
                              className="text-xs h-7 px-2"
                              disabled={updatingId === b.id}
                              onClick={() =>
                                handleUpdateStatus(b.id, "cancelled")
                              }
                              whileHover={{ scale: 1.03 }}
                              whileTap={{ scale: 0.96 }}
                            >
                              Cancel
                            </MotionButton>
                          </>
                        )}

                        {(b.status === "completed" ||
                          b.status === "cancelled") && (
                          <span className="text-xs text-gray-500">
                            No further actions
                          </span>
                        )}
                      </div>
                    </motion.li>
                  );
                })}
              </motion.ul>
            )}
          </CardContent>
        </Card>
      </Container>
    </main>
  );
}
