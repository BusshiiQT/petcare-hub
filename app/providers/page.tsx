"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseBrowser";

import { Container } from "@/components/container";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
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

      // Check auth
      const { data: userData, error: userError } =
        await supabase.auth.getUser();

      if (userError) {
        console.error("Error getting user:", userError);
      }

      const user = userData?.user ?? null;

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
  }, []);

  const formatLocation = (p: Provider) => {
    const parts = [p.city, p.state, p.country].filter(Boolean);
    return parts.join(", ");
  };

  // ---------- RENDER STATES ----------

  if (isLoading) {
    return (
      <main className="min-h-screen bg-white py-16">
        <Container>
          <p>Loading providers...</p>
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
              <CardTitle>Browse Providers</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-700">
                You need to be logged in to browse and book providers.
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
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">
            Providers near you
          </h1>
          {/* Later we can add filters/search here */}
        </div>

        {errorMsg && (
          <p className="text-sm text-red-600 mb-4">{errorMsg}</p>
        )}

        {providers.length === 0 ? (
          <p className="text-sm text-gray-600">
            No providers are available yet. Try again later.
          </p>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {providers.map((p) => (
              <Card
                key={p.id}
                className="flex flex-col justify-between"
              >
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-lg">
                      {p.display_name}
                    </CardTitle>
                    {p.hourly_rate != null && (
                      <span className="text-sm text-gray-700">
                        ${p.hourly_rate.toFixed(0)}/hr
                      </span>
                    )}
                  </div>
                  {formatLocation(p) && (
                    <p className="text-xs text-gray-500 mt-1">
                      {formatLocation(p)}
                    </p>
                  )}
                </CardHeader>
                <CardContent className="space-y-3">
                  {p.services && p.services.length > 0 && (
                    <div className="flex flex-wrap gap-2 text-xs">
                      {p.services.map((service) => (
                        <span
                          key={service}
                          className="px-2 py-1 rounded-full bg-gray-100 text-gray-700"
                        >
                          {service}
                        </span>
                      ))}
                    </div>
                  )}

                  {p.bio && (
                    <p className="text-sm text-gray-700 line-clamp-3">
                      {p.bio}
                    </p>
                  )}

                  <Button
                    className="w-full mt-2 rounded-full"
                    variant="outline"
                    onClick={() => router.push(`/providers/${p.id}`)}
                  >
                    View details &amp; book
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </Container>
    </main>
  );
}
