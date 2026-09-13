"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabaseBrowser";
import { requireUser } from "@/lib/requireUser";

import { PageShell } from "@/components/app/page-shell";
import { PageHeader } from "@/components/app/page-header";
import { PageSection } from "@/components/app/page-section";
import {
  StatusBadge,
  type StatusBadgeTone,
} from "@/components/app/status-badge";
import { FeedbackAlert } from "@/components/app/feedback-alert";
import { EmptyState } from "@/components/app/empty-state";
import { LoadingState } from "@/components/app/loading-state";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type BookingRow = {
  id: string;
  service_type: "walk" | "sitting" | "training" | "other" | null;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  start_time: string;
  end_time: string;
  notes: string | null;
  total_price: number | null;
  provider: { display_name: string } | null;
  pet: { name: string; type: string | null } | null;
};

export default function BookingsPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<BookingRow | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const detailsTriggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (selectedBooking && dialogRef.current && !dialogRef.current.open) {
      dialogRef.current.showModal();
    }
  }, [selectedBooking]);

  useEffect(() => {
    const loadBookings = async () => {
      setIsLoading(true);
      setErrorMsg(null);

      try {
        const user = await requireUser(() => router.replace("/auth/login"));
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
            total_price,
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
  }, [router]);

  const formatDateTime = (iso: string) => {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleString(undefined, {
      year: "numeric", month: "short", day: "numeric",
      hour: "numeric", minute: "2-digit", timeZoneName: "short",
    });
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

  const getStatusTone = (status: BookingRow["status"]): StatusBadgeTone => {
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

  if (isLoading) {
    return (
      <PageShell>
        <PageHeader
          title="My bookings"
          description="Review your current and past pet care bookings."
        />
        <PageSection title="Your bookings">
          <LoadingState label="Loading your bookings">
            <Card>
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
          </LoadingState>
        </PageSection>
      </PageShell>
    );
  }

  if (!userId) {
    return (
      <PageShell>
        <PageHeader
          title="My bookings"
          description="Review your current and past pet care bookings."
        />
        <PageSection aria-label="Sign in required">
          <EmptyState
            variant="panel"
            title="Sign in to view your bookings"
            description="You need to be logged in to view your bookings."
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

  return (
    <PageShell>
      <PageHeader
        title="My bookings"
        description="Review your current and past pet care bookings."
      />
      <PageSection title="Your bookings" contentClassName="space-y-4">
        {errorMsg && <FeedbackAlert variant="error">{errorMsg}</FeedbackAlert>}

        {bookings.length === 0 ? (
          <EmptyState
            variant="panel"
            title="No bookings yet"
            description="Find a trusted provider when you’re ready to arrange pet care."
            primaryAction={
              <Button onClick={() => router.push("/providers")}>
                Find providers
              </Button>
            }
          />
        ) : (
          <Card>
            <CardContent className="space-y-4">
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
                  const petInfo = b.pet;
                  const providerInfo = b.provider;

                  return (
                    <motion.li
                      key={b.id}
                      variants={{
                        hidden: { opacity: 0, y: 8 },
                        show: { opacity: 1, y: 0 },
                      }}
                      className="border rounded-md px-3 py-2 text-sm flex flex-col gap-1"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="font-medium">
                          {petInfo
                            ? `${petInfo.name}${petInfo.type ? ` (${petInfo.type})` : ""}`
                            : "Pet details unavailable"}
                        </div>
                        <StatusBadge tone={getStatusTone(b.status)}>
                          {formatStatus(b.status)}
                        </StatusBadge>
                      </div>

                      <div className="text-xs text-gray-600">
                        {providerInfo
                          ? `With: ${providerInfo.display_name}`
                          : "Provider details unavailable"}
                      </div>

                      <div className="text-xs text-gray-600">
                        {b.service_type ?? "Service not provided"} • {formatDateTime(b.start_time)} –{" "}
                        {formatDateTime(b.end_time)}
                      </div>

                      <Button type="button" size="sm" variant="outline" className="mt-2 self-start"
                        aria-haspopup="dialog"
                        aria-label={`View details for ${petInfo?.name ?? "booking"} on ${formatDateTime(b.start_time)}`}
                        onClick={(event) => {
                          detailsTriggerRef.current = event.currentTarget;
                          setSelectedBooking(b);
                        }}>
                        View details
                      </Button>
                    </motion.li>
                  );
                })}
              </motion.ul>
            </CardContent>
          </Card>
        )}
      </PageSection>
      <dialog ref={dialogRef} aria-labelledby="booking-details-title"
        className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg overflow-y-auto overscroll-contain rounded-xl border bg-card p-6 text-card-foreground shadow-lg backdrop:bg-black/50"
        onClose={() => {
          setSelectedBooking(null);
          detailsTriggerRef.current?.focus();
          detailsTriggerRef.current = null;
        }}>
        {selectedBooking && (
          <div className="min-w-0 space-y-5">
            <div className="flex items-start justify-between gap-4">
              <h2 id="booking-details-title" className="text-lg font-semibold">Booking details</h2>
              <Button type="button" size="sm" variant="outline" onClick={() => dialogRef.current?.close()}>
                Close
              </Button>
            </div>
            <dl className="space-y-4 text-sm [&_dt]:font-medium [&_dd]:mt-1 [&_dd]:break-words [&_dd]:text-muted-foreground">
              <div>
                <dt>Pet</dt>
                <dd>{selectedBooking.pet
                  ? `${selectedBooking.pet.name} (${selectedBooking.pet.type ?? "Type not provided"})`
                  : "Pet details unavailable"}</dd>
              </div>
              <div><dt>Provider</dt><dd>{selectedBooking.provider?.display_name ?? "Provider details unavailable"}</dd></div>
              <div><dt>Service type</dt><dd className="capitalize">{selectedBooking.service_type ?? "Not provided"}</dd></div>
              <div>
                <dt>Status</dt>
                <dd><StatusBadge tone={getStatusTone(selectedBooking.status)}>{formatStatus(selectedBooking.status)}</StatusBadge></dd>
              </div>
              <div><dt>Start</dt><dd>{formatDateTime(selectedBooking.start_time)}</dd></div>
              <div><dt>End</dt><dd>{formatDateTime(selectedBooking.end_time)}</dd></div>
              <div>
                <dt>Total price</dt>
                <dd>{selectedBooking.total_price == null ? "Not provided" : new Intl.NumberFormat("en-US", {
                  style: "currency", currency: "USD",
                }).format(selectedBooking.total_price)}</dd>
              </div>
              <div><dt>Notes</dt><dd className="whitespace-pre-wrap [overflow-wrap:anywhere]">{selectedBooking.notes?.trim() ? selectedBooking.notes : "Not provided"}</dd></div>
              <div className="text-xs"><dt>Booking reference</dt><dd>{selectedBooking.id}</dd></div>
            </dl>
          </div>
        )}
      </dialog>
    </PageShell>
  );
}
