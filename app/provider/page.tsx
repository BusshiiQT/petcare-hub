"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabaseBrowser";

import { Container } from "@/components/container";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DashboardSkeleton } from "@/components/dashboard-skeleton";

type ProviderProfile = {
  id: string;
  display_name: string;
  services: string[] | null;
  hourly_rate: number | null;
  city: string | null;
  state: string | null;
  country: string | null;
};

type BookingStatus = "pending" | "confirmed" | "completed" | "cancelled";

type BookingRow = {
  id: string;
  service_type: "walk" | "sitting" | "training" | "other";
  status: BookingStatus;
  start_time: string;
  end_time: string;
  pet: { name: string }[] | null;
};

export default function ProviderDashboardPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [provider, setProvider] = useState<ProviderProfile | null>(null);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [avgRating, setAvgRating] = useState<number | null>(null);
  const [reviewCount, setReviewCount] = useState<number>(0);
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

        const { data: providerData, error: providerError } = await supabase
          .from("provider_profiles")
          .select("id, display_name, services, hourly_rate, city, state, country")
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

        const { data: bookingsData, error: bookingsError } = await supabase
          .from("bookings")
          .select(
            `
            id,
            service_type,
            status,
            start_time,
            end_time,
            pet:pet_id (
              name
            )
          `
          )
          .eq("provider_profile_id", providerProfile.id)
          .order("start_time", { ascending: true });

        if (bookingsError) {
          console.error("Error loading provider bookings:", bookingsError);
        } else {
          setBookings((bookingsData || []) as BookingRow[]);
        }

        const { data: reviewsData, error: reviewsError } = await supabase
          .from("reviews")
          .select("rating")
          .eq("provider_profile_id", providerProfile.id);

        if (reviewsError) {
          console.error("Error loading reviews summary:", reviewsError);
        } else if (reviewsData && reviewsData.length > 0) {
          const count = reviewsData.length;
          const sum = reviewsData.reduce(
            (acc: number, r: any) => acc + (r.rating ?? 0),
            0
          );
          setReviewCount(count);
          setAvgRating(sum / count);
        } else {
          setReviewCount(0);
          setAvgRating(null);
        }
      } catch (err) {
        console.error("Error loading provider dashboard:", err);
        setErrorMsg("Failed to load provider dashboard.");
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboard();
  }, []);

  const formatLocation = (p: ProviderProfile) => {
    const parts = [p.city, p.state, p.country].filter(Boolean);
    return parts.join(", ");
  };

  const formatDateTime = (iso: string) => {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleString();
  };

  const pendingCount = bookings.filter((b) => b.status === "pending").length;
  const upcoming = bookings.filter(
    (b) => b.status === "pending" || b.status === "confirmed"
  );

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
              <CardTitle>Provider Dashboard</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-700">
                You need to be logged in as a provider to view your dashboard.
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
              <CardTitle>Provider Dashboard</CardTitle>
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
        {errorMsg && <p className="text-sm text-red-600 mb-4">{errorMsg}</p>}

        <div className="grid gap-6 md:grid-cols-[2fr,1.5fr] mb-6">
          <Card>
            <CardHeader>
              <CardTitle>Welcome, {provider.display_name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {formatLocation(provider) && (
                <p className="text-sm text-gray-600">
                  Location: {formatLocation(provider)}
                </p>
              )}

              {provider.services && provider.services.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-700 mb-1">
                    Services
                  </p>
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

              {provider.hourly_rate != null && (
                <p className="text-sm text-gray-700">
                  Base rate:{" "}
                  <span className="font-medium">
                    ${provider.hourly_rate.toFixed(0)}
                  </span>{" "}
                  per hour
                </p>
              )}

              <div className="flex flex-wrap gap-3 mt-3">
                <Button
                  variant="outline"
                  className="rounded-full"
                  onClick={() => router.push("/provider/profile")}
                >
                  Edit profile
                </Button>
                <Button
                  variant="outline"
                  className="rounded-full"
                  onClick={() => router.push("/provider/bookings")}
                >
                  View all bookings
                </Button>
                <Button
                  variant="outline"
                  className="rounded-full"
                  onClick={() => router.push("/provider/availability")}
                >
                  Availability
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Stats</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="border rounded-lg px-2 py-3">
                  <p className="text-xs text-gray-500 mb-1">Total bookings</p>
                  <p className="text-xl font-semibold text-gray-900">
                    {bookings.length}
                  </p>
                </div>
                <div className="border rounded-lg px-2 py-3">
                  <p className="text-xs text-gray-500 mb-1">Pending</p>
                  <p className="text-xl font-semibold text-gray-900">
                    {pendingCount}
                  </p>
                </div>
                <div className="border rounded-lg px-2 py-3">
                  <p className="text-xs text-gray-500 mb-1">Rating</p>
                  {avgRating != null ? (
                    <p className="text-xl font-semibold text-yellow-600">
                      {avgRating.toFixed(1)}
                      <span className="text-xs text-gray-500 ml-1">
                        ({reviewCount})
                      </span>
                    </p>
                  ) : (
                    <p className="text-sm text-gray-400">No reviews</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming bookings</CardTitle>
          </CardHeader>
          <CardContent>
            {upcoming.length === 0 ? (
              <p className="text-sm text-gray-600">
                You don&apos;t have any upcoming bookings.
              </p>
            ) : (
              <ul className="space-y-3">
                {upcoming.map((b, index) => {
                  const petInfo = b.pet?.[0] ?? null;
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
                          {petInfo ? petInfo.name : "Pet"}
                        </div>
                        <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                          {b.status}
                        </span>
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
