"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabaseBrowser";
import { requireUser } from "@/lib/requireUser";

import { PageShell } from "@/components/app/page-shell";
import { PageHeader } from "@/components/app/page-header";
import { PageSection } from "@/components/app/page-section";
import { StatCard } from "@/components/app/stat-card";
import { Card, CardContent } from "@/components/ui/card";
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
        const user = await requireUser(() => router.replace("/auth/login"));
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
          setErrorMsg((current) => current ?? "Failed to load your bookings.");
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
  }, [router]);

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
      <PageShell>
        <DashboardSkeleton />
      </PageShell>
    );
  }

  if (!userId) {
    return (
      <PageShell>
        <PageHeader
          title="Owner dashboard"
          description="Manage your pets, bookings, and care providers."
        />
        <PageSection aria-label="Sign in required">
          <Card className="max-w-md">
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-700">
                You need to be logged in to view your dashboard.
              </p>
              <Button onClick={() => router.push("/auth/login")}>
                Go to Login
              </Button>
            </CardContent>
          </Card>
        </PageSection>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title="Owner dashboard"
        description="Manage your pets, review upcoming bookings, and find trusted care providers."
        actions={
          <>
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
          </>
        }
      />

      {errorMsg && <p className="text-sm text-red-600">{errorMsg}</p>}

      <PageSection
        title="Overview"
        description="A snapshot of your PetCare Hub activity."
      >
        <div className="grid gap-6 lg:grid-cols-[1.5fr_2fr]">
          <Card>
            <CardContent className="space-y-3">
              <p className="text-sm text-gray-700">
                Manage your pets, bookings, and explore providers from one
                place.
              </p>

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

          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            <StatCard label="Pets" value={totalPets} />
            <StatCard label="Bookings" value={totalBookings} />
            <StatCard label="Pending" value={pendingBookings} />
          </div>
        </div>
      </PageSection>

      <PageSection title="Your upcoming bookings">
        <Card>
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
      </PageSection>
    </PageShell>
  );
}
