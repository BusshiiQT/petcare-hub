"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabaseBrowser";

import { Container } from "@/components/container";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DashboardSkeleton } from "@/components/dashboard-skeleton";

type Pet = {
  id: string;
  name: string;
  type: "dog" | "cat" | "other";
};

type BookingStatus = "pending" | "confirmed" | "completed" | "cancelled";

type BookingRow = {
  id: string;
  service_type: "walk" | "sitting" | "training" | "other";
  status: BookingStatus;
  start_time: string;
  end_time: string;
  provider: { display_name: string }[] | null;
  pet: { name: string; type: "dog" | "cat" | "other" }[] | null;
};

export default function OwnerDashboardPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [pets, setPets] = useState<Pet[]>([]);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const loadDashboard = async () => {
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

        // Pets
        const { data: petsData, error: petsError } = await supabase
          .from("pets")
          .select("id, name, type")
          .order("created_at", { ascending: true });

        if (petsError) {
          console.error("Error loading pets:", petsError);
          setErrorMsg("Failed to load your pets.");
        } else {
          setPets((petsData || []) as Pet[]);
        }

        // Bookings
        const { data: bookingsData, error: bookingsError } = await supabase
          .from("bookings")
          .select(
            `
            id,
            service_type,
            status,
            start_time,
            end_time,
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
          .order("start_time", { ascending: true });

        if (bookingsError) {
          console.error("Error loading bookings:", bookingsError);
          if (!errorMsg) setErrorMsg("Failed to load your bookings.");
        } else {
          setBookings((bookingsData || []) as BookingRow[]);
        }
      } catch (err) {
        console.error("Error loading owner dashboard:", err);
        setErrorMsg("Something went wrong loading your dashboard.");
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatDateTime = (iso: string) => {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleString();
  };

  const totalPets = pets.length;
  const totalBookings = bookings.length;
  const pendingBookings = bookings.filter((b) => b.status === "pending").length;

  const now = new Date();
  const upcoming = bookings.filter((b) => {
    const start = new Date(b.start_time);
    return (
      (b.status === "pending" || b.status === "confirmed") &&
      !isNaN(start.getTime()) &&
      start >= now
    );
  });

  if (isLoading) {
    return (
      <main className="min-h-screen bg-white py-16">
        <Container>
          <DashboardSkeleton />
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
              <CardTitle>Owner Dashboard</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-700">
                You need to be logged in to view your dashboard.
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
        {errorMsg && <p className="text-sm text-red-600 mb-4">{errorMsg}</p>}

        <div className="grid gap-6 md:grid-cols-[2fr,1.5fr] mb-6">
          <Card>
            <CardHeader>
              <CardTitle>Your PetCare Hub</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-gray-700">
                Manage your pets, bookings, and explore providers from one
                place.
              </p>

              <div className="flex flex-wrap gap-3 mt-3">
                <Button
                  variant="outline"
                  className="rounded-full"
                  onClick={() => router.push("/pets")}
                >
                  Manage pets
                </Button>
                <Button
                  variant="outline"
                  className="rounded-full"
                  onClick={() => router.push("/bookings")}
                >
                  View bookings
                </Button>
                <Button
                  className="rounded-full"
                  onClick={() => router.push("/providers")}
                >
                  Find providers
                </Button>
              </div>

              {totalPets > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-semibold text-gray-700 mb-1">
                    Your pets
                  </p>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {pets.map((pet) => (
                      <span
                        key={pet.id}
                        className="px-2 py-1 rounded-full bg-gray-100 text-gray-700"
                      >
                        {pet.name} ({pet.type})
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Stats</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="border rounded-lg px-2 py-3">
                  <p className="text-xs text-gray-500 mb-1">Pets</p>
                  <p className="text-xl font-semibold text-gray-900">
                    {totalPets}
                  </p>
                </div>
                <div className="border rounded-lg px-2 py-3">
                  <p className="text-xs text-gray-500 mb-1">Bookings</p>
                  <p className="text-xl font-semibold text-gray-900">
                    {totalBookings}
                  </p>
                </div>
                <div className="border rounded-lg px-2 py-3">
                  <p className="text-xs text-gray-500 mb-1">Pending</p>
                  <p className="text-xl font-semibold text-gray-900">
                    {pendingBookings}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Your upcoming bookings</CardTitle>
          </CardHeader>
          <CardContent>
            {upcoming.length === 0 ? (
              <p className="text-sm text-gray-600">
                You don&apos;t have any upcoming bookings yet.
              </p>
            ) : (
              <ul className="space-y-3">
                {upcoming.map((b, index) => {
                  const petInfo = b.pet?.[0] ?? null;
                  const providerInfo = b.provider?.[0] ?? null;

                  return (
                    <motion.li
                      key={b.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className="border rounded-md px-3 py-2 text-sm flex flex-col gap-1"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-medium">
                          {petInfo
                            ? `${petInfo.name} (${petInfo.type})`
                            : "Pet"}
                        </div>
                        <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                          {b.status}
                        </span>
                      </div>

                      <div className="text-xs text-gray-600">
                        With: {providerInfo?.display_name || "Your provider"}
                      </div>

                      <div className="text-xs text-gray-600">
                        {b.service_type} • {formatDateTime(b.start_time)} –{" "}
                        {formatDateTime(b.end_time)}
                      </div>
                    </motion.li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </Container>
    </main>
  );
}
