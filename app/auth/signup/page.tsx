"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";

import { Container } from "@/components/container";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function SignUpPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [debugMsg, setDebugMsg] = useState<string | null>(null);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setDebugMsg(null);
    setIsLoading(true);

    const cleanedEmail = email.trim();

    console.log("Attempting signup with:", {
      rawEmail: email,
      cleanedEmail,
      passwordLength: password.length,
    });

    const { data, error } = await supabase.auth.signUp({
      email: cleanedEmail,
      password,
    });

    setIsLoading(false);

    console.log("Supabase signup result:", { data, error });

    if (error) {
      setErrorMsg(error.message);
      setDebugMsg(JSON.stringify(error, null, 2));
      return;
    }

    setSuccessMsg("Account created! Check your email for a confirmation link.");
    setDebugMsg(JSON.stringify(data, null, 2));
    setEmail("");
    setPassword("");
  };

  return (
    <main className="min-h-screen bg-white py-16">
      <Container>
        <div className="flex justify-center">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Create your PetCare Hub account</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleSignUp}>
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

                {successMsg && (
                  <p className="text-sm text-green-600 mb-1">{successMsg}</p>
                )}

                {debugMsg && (
                  <pre className="text-[10px] text-gray-500 bg-gray-50 p-2 rounded border overflow-x-auto">
                    {debugMsg}
                  </pre>
                )}

                <Button
                  type="submit"
                  className="w-full rounded-full"
                  disabled={isLoading}
                >
                  {isLoading ? "Creating account..." : "Sign Up"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </Container>
    </main>
  );
}
