"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseBrowser";
import { requireUser } from "@/lib/requireUser";

import { Container } from "@/components/container";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
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
      <main className="min-h-screen bg-white py-16">
        <Container>
          <p>Loading provider profile...</p>
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
              <CardTitle>Become a Provider</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-700">
                You need to be logged in to create a provider profile.
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

  if (!profile) {
    return (
      <main className="min-h-screen bg-white py-16">
        <Container>
          <p>Unable to load provider profile.</p>
        </Container>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white py-16">
      <Container>
        <div className="flex justify-center">
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <CardTitle>Provider Profile</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleSave}>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Display name
                  </label>
                  <Input
                    value={profile.display_name}
                    onChange={(e) =>
                      setProfile({ ...profile, display_name: e.target.value })
                    }
                    placeholder="Your provider name"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Bio
                  </label>
                  <textarea
                    className="w-full border rounded-md px-3 py-2 text-sm"
                    rows={3}
                    value={profile.bio ?? ""}
                    onChange={(e) =>
                      setProfile({ ...profile, bio: e.target.value })
                    }
                    placeholder="Tell pet owners about your experience and services."
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      City
                    </label>
                    <Input
                      value={profile.city ?? ""}
                      onChange={(e) =>
                        setProfile({ ...profile, city: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      State
                    </label>
                    <Input
                      value={profile.state ?? ""}
                      onChange={(e) =>
                        setProfile({ ...profile, state: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Country
                    </label>
                    <Input
                      value={profile.country ?? ""}
                      onChange={(e) =>
                        setProfile({ ...profile, country: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Services offered
                  </label>
                  <div className="flex flex-wrap gap-3">
                    {SERVICE_OPTIONS.map((option) => (
                      <label
                        key={option.value}
                        className="flex items-center gap-2 text-sm"
                      >
                        <input
                          type="checkbox"
                          className="h-4 w-4"
                          checked={profile.services?.includes(option.value)}
                          onChange={() => toggleService(option.value)}
                        />
                        {option.label}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Hourly rate (USD)
                  </label>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={profile.hourly_rate ?? ""}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        hourly_rate:
                          e.target.value === ""
                            ? null
                            : Number(e.target.value),
                      })
                    }
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    id="is_active"
                    type="checkbox"
                    className="h-4 w-4"
                    checked={profile.is_active}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        is_active: e.target.checked,
                      })
                    }
                  />
                  <label
                    htmlFor="is_active"
                    className="text-sm text-gray-700 select-none"
                  >
                    Show my profile in search results
                  </label>
                </div>

                {errorMsg && (
                  <p className="text-sm text-red-600 mb-1">{errorMsg}</p>
                )}
                {successMsg && (
                  <p className="text-sm text-green-600 mb-1">{successMsg}</p>
                )}

                <Button
                  type="submit"
                  className="w-full rounded-full"
                  disabled={isSaving}
                >
                  {isSaving ? "Saving..." : "Save provider profile"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </Container>
    </main>
  );
}
