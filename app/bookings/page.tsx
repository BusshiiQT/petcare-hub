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

type BookingRow = {
  id: string;
  service_type: "walk" | "sitting" | "training" | "other";
  status: "pending" | "confirmed" | "completed" | "cancelled";
  start_time: string;
  end_time: string;
  notes: string | null;
  provider: { display_name: string }[] | null;
  pet: { name: string; type: "dog" | "cat" | "other" }[] | null;
};

export default function BookingsPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
            provider:provider_profile_id (
              display_name
            ),
            pet:pet_id (
              name,
              type
            )
          `
          )
          .eq("owner_id", user.id)
          .order("start_time", { ascending: false });

        if (error) throw error;

        setBookings((data || []) as BookingRow[]);
      } catch (err) {
        console.error("Error loading bookings:", err);
        setErrorMsg("Failed to load your bookings.");
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

  const formatStatus = (status: BookingRow["status"]) => {
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

  if (isLoading) {
    return (
      <main className="min-h-screen bg-white py-16">
        <Container>
          <Card>
            <CardHeader>
              <CardTitle>My Bookings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="border rounded-md px-3 py-2 flex flex-col gap-2 animate-pulse"
                  >
                    <div className="flex justify-between gap-2">
                      <div className="h-4 w-32 bg-gray-100 rounded-md" />
                      <div className="h-4 w-16 bg-gray-100 rounded-full" />
                    </div>
                    <div className="h-3 w-40 bg-gray-100 rounded-md" />
                    <div className="h-3 w-52 bg-gray-100 rounded-md" />
                    <div className="h-3 w-32 bg-gray-100 rounded-md" />
                  </div>
                ))}
              </div>
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
              <CardTitle>My Bookings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-700">
                You need to be logged in to view your bookings.
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

  return (
    <main className="min-h-screen bg-white py-16">
      <Container>
        <Card>
          <CardHeader>
            <CardTitle>My Bookings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {errorMsg && (
              <p className="text-sm text-red-600 mb-2">{errorMsg}</p>
            )}

            {bookings.length === 0 ? (
              <p className="text-sm text-gray-600">
                You don&apos;t have any bookings yet.
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
                    transition: { staggerChildren: 0.04 },
                  },
                }}
              >
                {bookings.map((b) => {
                  const petInfo = b.pet?.[0] ?? null;
                  const providerInfo = b.provider?.[0] ?? null;

                  return (
                    <motion.li
                      key={b.id}
                      variants={{
                        hidden: { opacity: 0, y: 8 },
                        show: { opacity: 1, y: 0 },
                      }}
                      className="border rounded-md px-3 py-2 text-sm flex flex-col gap-1"
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
                        {providerInfo
                          ? `With: ${providerInfo.display_name}`
                          : "Provider not found"}
                      </div>

                      <div className="text-xs text-gray-600">
                        {b.service_type} • {formatDateTime(b.start_time)} –{" "}
                        {formatDateTime(b.end_time)}
                      </div>

                      {b.notes && (
                        <div className="text-xs text-gray-500 mt-1">
                          Notes: {b.notes}
                        </div>
                      )}
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
