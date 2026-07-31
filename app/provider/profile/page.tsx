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
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type ProviderProfile = {
  id: string;
  user_id: string;
  display_name: string;
  bio: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  services: string[]; // e.g. ["walk", "sitting"]
  hourly_rate: number | null;
  is_active: boolean;
};

const SERVICE_OPTIONS = [
  { value: "walk", label: "Dog walking" },
  { value: "sitting", label: "Pet sitting" },
  { value: "training", label: "Training" },
];

export default function ProviderProfilePage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProviderProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    const loadProviderProfile = async () => {
      setIsLoading(true);
      setErrorMsg(null);

      const user = await requireUser(() => router.replace("/auth/login"));

      if (!user) {
        setIsLoading(false);
        setUserId(null);
        return;
      }

      setUserId(user.id);

      // Load existing provider profile (if any)
      const { data, error } = await supabase
        .from("provider_profiles")
        .select(
          "id, user_id, display_name, bio, city, state, country, services, hourly_rate, is_active"
        )
        .eq("user_id", user.id)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        console.error("Error loading provider profile:", error);
        setErrorMsg("Failed to load provider profile.");
      } else if (data) {
        setProfile({
          id: data.id,
          user_id: data.user_id,
          display_name: data.display_name,
          bio: data.bio,
          city: data.city,
          state: data.state,
          country: data.country,
          services: data.services ?? [],
          hourly_rate: data.hourly_rate,
          is_active: data.is_active,
        });
      } else {
        // no existing profile; initialize empty form
        setProfile({
          id: "",
          user_id: user.id,
          display_name: "",
          bio: "",
          city: "",
          state: "",
          country: "",
          services: [],
          hourly_rate: null,
          is_active: true,
        });
      }

      setIsLoading(false);
    };

    loadProviderProfile();
  }, [router]);

  const toggleService = (value: string) => {
    if (!profile) return;
    const services = new Set(profile.services ?? []);
    if (services.has(value)) {
      services.delete(value);
    } else {
      services.add(value);
    }
    setProfile({ ...profile, services: Array.from(services) });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !profile) return;

    setIsSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const payload = {
      user_id: userId,
      display_name: profile.display_name,
      bio: profile.bio,
      city: profile.city,
      state: profile.state,
      country: profile.country,
      services: profile.services,
      hourly_rate: profile.hourly_rate,
      is_active: profile.is_active,
    };

    let error;

    if (profile.id) {
      const { error: updateError } = await supabase
        .from("provider_profiles")
        .update(payload)
        .eq("id", profile.id);
      error = updateError ?? null;
    } else {
      const { data, error: insertError } = await supabase
        .from("provider_profiles")
        .insert(payload)
        .select("id")
        .single();
      error = insertError ?? null;
      if (data && !insertError) {
        setProfile({ ...profile, id: data.id });
      }
    }

    setIsSaving(false);

    if (error) {
      console.error("Error saving provider profile:", error);
      setErrorMsg("Failed to save provider profile.");
      return;
    }

    setSuccessMsg("Provider profile saved.");
  };

  if (isLoading) {
    return (
      <PageShell>
        <PageHeader
          title="Provider profile"
          description="Manage the information pet owners see when choosing care."
        />
        <LoadingState label="Loading provider profile">
          <p className="text-sm text-muted-foreground">
            Loading provider profile...
          </p>
        </LoadingState>
      </PageShell>
    );
  }

  if (!userId) {
    return (
      <PageShell>
        <PageHeader
          title="Provider profile"
          description="Manage the information pet owners see when choosing care."
        />
        <PageSection aria-label="Sign in required">
          <EmptyState
            variant="panel"
            title="Sign in to create your profile"
            description="You need to be logged in to create a provider profile."
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

  if (!profile) {
    return (
      <PageShell>
        <PageHeader
          title="Provider profile"
          description="Manage the information pet owners see when choosing care."
        />
        <PageSection aria-label="Unable to load profile">
          <FeedbackAlert variant="error">
            {errorMsg ?? "Unable to load provider profile."}
          </FeedbackAlert>
        </PageSection>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title="Provider profile"
        description="Manage the information pet owners see when choosing care."
      />

      <form className="max-w-3xl space-y-8" onSubmit={handleSave}>
        <PageSection
          title="Public profile"
          description="Introduce yourself and your care experience."
        >
          <Card>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <label
                  htmlFor="display-name"
                  className="block text-sm font-medium text-foreground"
                >
                  Display name{" "}
                  <span className="font-normal text-muted-foreground">
                    (required)
                  </span>
                </label>
                <Input
                  id="display-name"
                  value={profile.display_name}
                  onChange={(e) =>
                    setProfile({ ...profile, display_name: e.target.value })
                  }
                  placeholder="Your provider name"
                  required
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="bio"
                  className="block text-sm font-medium text-foreground"
                >
                  Bio
                </label>
                <textarea
                  id="bio"
                  className="min-h-24 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30"
                  rows={3}
                  value={profile.bio ?? ""}
                  onChange={(e) =>
                    setProfile({ ...profile, bio: e.target.value })
                  }
                  placeholder="Tell pet owners about your experience and services."
                />
              </div>
            </CardContent>
          </Card>
        </PageSection>

        <PageSection
          title="Location"
          description="Help pet owners understand where you provide services."
        >
          <Card>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <label
                    htmlFor="city"
                    className="block text-sm font-medium text-foreground"
                  >
                    City
                  </label>
                  <Input
                    id="city"
                    value={profile.city ?? ""}
                    onChange={(e) =>
                      setProfile({ ...profile, city: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label
                    htmlFor="state"
                    className="block text-sm font-medium text-foreground"
                  >
                    State
                  </label>
                  <Input
                    id="state"
                    value={profile.state ?? ""}
                    onChange={(e) =>
                      setProfile({ ...profile, state: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label
                    htmlFor="country"
                    className="block text-sm font-medium text-foreground"
                  >
                    Country
                  </label>
                  <Input
                    id="country"
                    value={profile.country ?? ""}
                    onChange={(e) =>
                      setProfile({ ...profile, country: e.target.value })
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </PageSection>

        <PageSection
          title="Services and pricing"
          description="Choose the care you offer and set your hourly rate."
        >
          <Card>
            <CardContent className="space-y-5">
              <fieldset className="space-y-3">
                <legend className="text-sm font-medium text-foreground">
                  Services offered
                </legend>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {SERVICE_OPTIONS.map((option) => (
                    <label
                      key={option.value}
                      htmlFor={`service-${option.value}`}
                      className="flex min-h-10 items-center gap-2 rounded-md border border-input px-3 py-2 text-sm text-foreground"
                    >
                      <input
                        id={`service-${option.value}`}
                        type="checkbox"
                        className="size-4 shrink-0 accent-primary"
                        checked={profile.services?.includes(option.value)}
                        onChange={() => toggleService(option.value)}
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className="space-y-2">
                <label
                  htmlFor="hourly-rate"
                  className="block text-sm font-medium text-foreground"
                >
                  Hourly rate (USD)
                </label>
                <Input
                  id="hourly-rate"
                  type="number"
                  min="0"
                  step="1"
                  value={profile.hourly_rate ?? ""}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      hourly_rate:
                        e.target.value === "" ? null : Number(e.target.value),
                    })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </PageSection>

        <PageSection
          title="Profile visibility"
          description="Control whether pet owners can discover your profile."
        >
          <Card>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <label
                  htmlFor="is_active"
                  className="flex min-h-10 items-center gap-3 text-sm text-foreground select-none"
                >
                  <input
                    id="is_active"
                    type="checkbox"
                    className="size-4 shrink-0 accent-primary"
                    checked={profile.is_active}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        is_active: e.target.checked,
                      })
                    }
                  />
                  Show my profile in search results
                </label>
                <StatusBadge tone={profile.is_active ? "success" : "neutral"}>
                  {profile.is_active ? "Visible" : "Hidden"}
                </StatusBadge>
              </div>
            </CardContent>
          </Card>
        </PageSection>

        <div className="space-y-4">
          {errorMsg && (
            <FeedbackAlert variant="error">{errorMsg}</FeedbackAlert>
          )}
          {successMsg && (
            <FeedbackAlert variant="success">{successMsg}</FeedbackAlert>
          )}

          <div className="flex flex-wrap items-center justify-end gap-3">
            <Button
              type="submit"
              className="min-w-44 rounded-full"
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : "Save provider profile"}
            </Button>
          </div>
        </div>
      </form>
    </PageShell>
  );
}
