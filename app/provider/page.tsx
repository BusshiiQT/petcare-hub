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
import { FeedbackAlert } from "@/components/app/feedback-alert";
import { EmptyState } from "@/components/app/empty-state";
import { LoadingState } from "@/components/app/loading-state";
import {
  StatusBadge,
  type StatusBadgeTone,
} from "@/components/app/status-badge";
import { Card, CardContent } from "@/components/ui/card";
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
type ReviewSummary = {
  rating: number | null;
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
        const user = await requireUser(() => router.replace("/auth/login"));
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
          const sum = (reviewsData as ReviewSummary[]).reduce(
            (acc, review) => acc + (review.rating ?? 0),
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
  }, [router]);

  const formatLocation = (p: ProviderProfile) => {
    const parts = [p.city, p.state, p.country].filter(Boolean);
    return parts.join(", ");
  };

  const formatDateTime = (iso: string) => {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleString();
  };

  const getStatusTone = (status: BookingStatus): StatusBadgeTone => {
    switch (status) {
      case "pending":
        return "warning";
      case "confirmed":
        return "info";
      case "completed":
        return "success";
      case "cancelled":
        return "destructive";
      default:
        return "neutral";
    }
  };

  const pendingCount = bookings.filter((b) => b.status === "pending").length;
  const upcoming = bookings.filter(
    (b) => b.status === "pending" || b.status === "confirmed"
  );

  if (isLoading) {
    return (
      <PageShell>
        <LoadingState label="Loading provider dashboard">
          <DashboardSkeleton />
        </LoadingState>
      </PageShell>
    );
  }

  if (!userId) {
    return (
      <PageShell>
        <PageHeader
          title="Provider dashboard"
          description="Manage your profile, bookings, and availability."
        />
        <PageSection aria-label="Sign in required">
          <EmptyState
            variant="panel"
            title="Sign in to view your dashboard"
            description="You need to be logged in as a provider to view your dashboard."
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
          title="Provider dashboard"
          description="Manage your profile, bookings, and availability."
        />
        <PageSection aria-label="Provider profile required">
          <EmptyState
            variant="panel"
            title="Create your provider profile"
            description="Set up your profile before managing provider bookings and availability."
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
        title="Provider dashboard"
        description="Manage your profile, bookings, and availability."
        actions={
          <>
            <Button
              className="h-auto min-h-9 whitespace-normal rounded-full py-2 text-center"
              onClick={() => router.push("/provider/profile")}
            >
              Edit profile
            </Button>
            <Button
              variant="outline"
              className="h-auto min-h-9 whitespace-normal rounded-full py-2 text-center"
              onClick={() => router.push("/provider/bookings")}
            >
              View all bookings
            </Button>
            <Button
              variant="outline"
              className="h-auto min-h-9 whitespace-normal rounded-full py-2 text-center"
              onClick={() => router.push("/provider/availability")}
            >
              Availability
            </Button>
          </>
        }
      />

      {errorMsg && <FeedbackAlert variant="error">{errorMsg}</FeedbackAlert>}

      <PageSection title="Profile overview">
        <Card>
          <CardContent className="space-y-4">
            <h3 className="text-lg font-semibold tracking-tight text-foreground">
              Welcome, {provider.display_name}
            </h3>

            {formatLocation(provider) && (
              <p className="text-sm text-muted-foreground">
                Location: {formatLocation(provider)}
              </p>
            )}

            {provider.services && provider.services.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-semibold text-foreground">
                  Services
                </p>
                <div className="flex flex-wrap gap-2 text-xs">
                  {provider.services.map((service) => (
                    <span
                      key={service}
                      className="rounded-full bg-muted px-2 py-1 text-muted-foreground"
                    >
                      {service}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {provider.hourly_rate != null && (
              <p className="text-sm text-foreground">
                Base rate:{" "}
                <span className="font-medium">
                  ${provider.hourly_rate.toFixed(0)}
                </span>{" "}
                per hour
              </p>
            )}
          </CardContent>
        </Card>
      </PageSection>

      <PageSection title="At a glance">
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Total bookings" value={bookings.length} />
          <StatCard label="Pending" value={pendingCount} />
          <StatCard
            label="Rating"
            value={
              avgRating != null ? (
                <>
                  {avgRating.toFixed(1)}
                  <span className="ml-1 text-xs font-normal text-muted-foreground">
                    ({reviewCount})
                  </span>
                </>
              ) : (
                <span className="text-base font-medium text-muted-foreground">
                  No reviews
                </span>
              )
            }
          />
        </div>
      </PageSection>

      <PageSection title="Upcoming bookings">
        {upcoming.length === 0 ? (
          <EmptyState
            variant="panel"
            title="No upcoming bookings"
            description="New pending and confirmed bookings will appear here."
            primaryAction={
              <Button
                variant="outline"
                onClick={() => router.push("/provider/bookings")}
              >
                View all bookings
              </Button>
            }
          />
        ) : (
          <Card>
            <CardContent>
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
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="font-medium">
                          {petInfo ? petInfo.name : "Pet"}
                        </div>
                        <StatusBadge tone={getStatusTone(b.status)}>
                          {b.status}
                        </StatusBadge>
                      </div>
                      <div className="text-xs text-gray-600">
                        {b.service_type} • {formatDateTime(b.start_time)} –{" "}
                        {formatDateTime(b.end_time)}
                      </div>
                    </motion.li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        )}
      </PageSection>
    </PageShell>
  );
}
