"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";

import { PageShell } from "@/components/app/page-shell";
import { PageHeader } from "@/components/app/page-header";
import { PageSection } from "@/components/app/page-section";
import { FeedbackAlert } from "@/components/app/feedback-alert";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function SignUpPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsLoading(true);

    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });

    setIsLoading(false);

    if (error) {
      setErrorMsg("Unable to create your account. Please try again.");
      return;
    }

    setSuccessMsg("Account created! Check your email for a confirmation link.");
    setEmail("");
    setPassword("");
  };

  return (
    <PageShell>
      <div className="mx-auto max-w-md space-y-8">
        <PageHeader
          title="Create your PetCare Hub account"
          description="Join PetCare Hub to manage pet care and provider services."
        />
        <PageSection aria-label="Signup form">
          <Card>
            <CardContent>
              <form className="space-y-4" onSubmit={handleSignUp}>
                <div className="space-y-2">
                  <label
                    htmlFor="signup-email"
                    className="block text-sm font-medium text-foreground"
                  >
                    Email{" "}
                    <span className="font-normal text-muted-foreground">
                      (required)
                    </span>
                  </label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="signup-password"
                    className="block text-sm font-medium text-foreground"
                  >
                    Password{" "}
                    <span className="font-normal text-muted-foreground">
                      (required)
                    </span>
                  </label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                {errorMsg && (
                  <FeedbackAlert variant="error">{errorMsg}</FeedbackAlert>
                )}

                {successMsg && (
                  <FeedbackAlert variant="success">{successMsg}</FeedbackAlert>
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
        </PageSection>
      </div>
    </PageShell>
  );
}
