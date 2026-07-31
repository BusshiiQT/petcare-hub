"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseBrowser";
import { requireUser } from "@/lib/requireUser";

import { PageShell } from "@/components/app/page-shell";
import { PageHeader } from "@/components/app/page-header";
import { PageSection } from "@/components/app/page-section";
import { FeedbackAlert } from "@/components/app/feedback-alert";
import { EmptyState } from "@/components/app/empty-state";
import { LoadingState } from "@/components/app/loading-state";
import { StatusBadge } from "@/components/app/status-badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
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

export default function ProvidersPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const loadProviders = async () => {
      setIsLoading(true);
      setErrorMsg(null);

      const user = await requireUser(() => router.replace("/auth/login"));

      if (!user) {
        setUserId(null);
        setIsLoading(false);
        return;
      }

      setUserId(user.id);

      // Fetch active providers
      const { data, error } = await supabase
        .from("provider_profiles")
        .select(
          "id, display_name, bio, city, state, country, services, hourly_rate"
        )
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading providers:", error);
        setErrorMsg("Failed to load providers.");
      } else {
        setProviders((data || []) as Provider[]);
      }

      setIsLoading(false);
    };

    loadProviders();
  }, [router]);

  const formatLocation = (p: Provider) => {
    const parts = [p.city, p.state, p.country].filter(Boolean);
    return parts.join(", ");
  };

  // ---------- RENDER STATES ----------

  if (isLoading) {
    return (
      <PageShell>
        <PageHeader
          title="Find care providers"
          description="Browse active local professionals for walking, sitting, training, and more."
        />
        <LoadingState label="Loading providers">
          <p className="text-sm text-muted-foreground">Loading providers...</p>
        </LoadingState>
      </PageShell>
    );
  }

  if (!userId) {
    return (
      <PageShell>
        <PageHeader
          title="Find care providers"
          description="Browse active local professionals for walking, sitting, training, and more."
        />
        <PageSection aria-label="Sign in required">
          <EmptyState
            variant="panel"
            title="Sign in to browse providers"
            description="You need to be logged in to browse and book providers."
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
        title="Find care providers"
        description="Browse active local professionals for walking, sitting, training, and more."
      />

      {errorMsg && <FeedbackAlert variant="error">{errorMsg}</FeedbackAlert>}

      <PageSection title="Providers near you">
        {providers.length === 0 ? (
          <EmptyState
            variant="panel"
            title="No providers available"
            description="No providers are available yet. Try again later."
          />
        ) : (
          <ul className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {providers.map((p) => (
              <li key={p.id} className="min-w-0">
                <Card className="h-full gap-0 py-0">
                  <CardHeader className="gap-3 border-b px-5 py-5">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <CardTitle>
                        <h3 className="text-lg leading-6">{p.display_name}</h3>
                      </CardTitle>
                      <StatusBadge tone="success">Active</StatusBadge>
                    </div>

                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      {formatLocation(p) ? (
                        <p className="text-sm text-muted-foreground">
                          {formatLocation(p)}
                        </p>
                      ) : (
                        <span />
                      )}
                      {p.hourly_rate != null && (
                        <span className="shrink-0 text-sm font-medium text-foreground">
                          ${p.hourly_rate.toFixed(0)}/hr
                        </span>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="flex-1 space-y-4 px-5 py-5">
                    {p.services && p.services.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Services
                        </p>
                        <div className="flex flex-wrap gap-2 text-xs">
                          {p.services.map((service) => (
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

                    {p.bio && (
                      <p className="line-clamp-3 text-sm leading-6 text-foreground">
                        {p.bio}
                      </p>
                    )}
                  </CardContent>

                  <CardFooter className="border-t px-5 py-4">
                    <Button
                      className="w-full rounded-full"
                      onClick={() => router.push(`/providers/${p.id}`)}
                    >
                      View details &amp; book
                    </Button>
                  </CardFooter>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </PageSection>
    </PageShell>
  );
}
