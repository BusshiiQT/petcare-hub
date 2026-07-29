"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseBrowser";

import { Container } from "@/components/container";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setIsLoading(false);

    if (error) {
      setErrorMsg("Unable to sign in. Check your email and password.");
      return;
    }

    router.push("/");
  };

  return (
    <main className="min-h-screen bg-white py-16">
      <Container>
        <div className="flex justify-center">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Log in to PetCare Hub</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleLogin}>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Password
                  </label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                {errorMsg && (
                  <p className="text-sm text-red-600 mb-1">{errorMsg}</p>
                )}

                <Button
                  type="submit"
                  className="w-full rounded-full"
                  disabled={isLoading}
                >
                  {isLoading ? "Logging in..." : "Log In"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </Container>
    </main>
  );
}