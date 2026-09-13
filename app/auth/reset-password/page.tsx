"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseBrowser";
import { PageShell } from "@/components/app/page-shell";
import { PageHeader } from "@/components/app/page-header";
import { PageSection } from "@/components/app/page-section";
import { FeedbackAlert } from "@/components/app/feedback-alert";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const minimumPasswordLength = 8;
const invalidLinkMessage = "This password reset link is invalid or has expired. Return to login to request a new link.";

export default function ResetPasswordPage() {
  const [sessionState, setSessionState] = useState<"checking" | "ready" | "invalid">("checking");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const submitting = useRef(false);

  useEffect(() => {
    let active = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === "PASSWORD_RECOVERY" && session) setSessionState("ready");
      if (event === "SIGNED_OUT") setSessionState("invalid");
    });

    async function checkSession() {
      try {
        // Wait for the SDK's implicit URL handling; do not exchange tokens twice.
        const { error: initializationError } = await supabase.auth.initialize();
        if (initializationError) {
          if (active) setSessionState("invalid");
          return;
        }
        // Also covers an event fired before mount and a refreshed reset page.
        const { data, error } = await supabase.auth.getSession();
        if (active) setSessionState(!error && data.session ? "ready" : "invalid");
      } catch {
        if (active) setSessionState("invalid");
      }
    }
    void checkSession();
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleReset(event: React.FormEvent) {
    event.preventDefault();
    if (submitting.current || sessionState !== "ready" || success) return;
    setErrorMsg(null);
    if (password.length < minimumPasswordLength) {
      setErrorMsg(`Use at least ${minimumPasswordLength} characters.`);
      return;
    }
    if (password !== confirmation) {
      setErrorMsg("Passwords do not match.");
      return;
    }
    submitting.current = true;
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        if (error.status === 401 || error.status === 403 || error.code === "session_not_found" || error.code === "refresh_token_not_found") {
          setSessionState("invalid");
        } else if (error.code === "weak_password") {
          setErrorMsg("Choose a stronger password. Use at least 8 characters with uppercase and lowercase letters, numbers, and symbols, and avoid common passwords.");
        } else if (error.code === "same_password") {
          setErrorMsg("Choose a password different from your current password.");
        } else {
          setErrorMsg("Unable to reset your password. Please try again or request a new reset link.");
        }
        return;
      }
      setPassword("");
      setConfirmation("");
      setSuccess(true);
    } catch {
      setErrorMsg("Unable to reset your password. Please try again or request a new reset link.");
    } finally {
      submitting.current = false;
      setIsLoading(false);
    }
  }

  return (
    <PageShell>
      <div className="mx-auto max-w-md space-y-8">
        <PageHeader title="Reset your password" description="Choose a new password for your PetCare Hub account." />
        <PageSection aria-label="Password reset form">
          <Card>
            <CardContent className="space-y-4">
              {success ? (
                <FeedbackAlert variant="success">Your password has been updated. You can now log in with your new password.</FeedbackAlert>
              ) : sessionState === "checking" ? (
                <FeedbackAlert variant="info">Checking your reset link...</FeedbackAlert>
              ) : sessionState === "invalid" ? (
                <FeedbackAlert variant="error">{invalidLinkMessage}</FeedbackAlert>
              ) : (
                <form className="space-y-4" onSubmit={handleReset} aria-busy={isLoading}>
                  <div className="space-y-2">
                    <label htmlFor="new-password" className="block text-sm font-medium text-foreground">New password (required)</label>
                    <Input id="new-password" type="password" autoComplete="new-password" required minLength={minimumPasswordLength} value={password} onChange={(event) => setPassword(event.target.value)} disabled={isLoading} aria-describedby="password-hint" />
                    <p id="password-hint" className="text-sm text-muted-foreground">Use at least {minimumPasswordLength} characters.</p>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="confirm-password" className="block text-sm font-medium text-foreground">Confirm password (required)</label>
                    <Input id="confirm-password" type="password" autoComplete="new-password" required minLength={minimumPasswordLength} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} disabled={isLoading} />
                  </div>
                  {errorMsg && <FeedbackAlert variant="error">{errorMsg}</FeedbackAlert>}
                  {isLoading && <p role="status" className="text-sm text-muted-foreground">Updating your password...</p>}
                  <Button type="submit" className="w-full rounded-full" disabled={isLoading}>{isLoading ? "Updating..." : "Reset password"}</Button>
                </form>
              )}
              <Button asChild variant="link" className="w-full"><Link href="/auth/login">Back to login</Link></Button>
            </CardContent>
          </Card>
        </PageSection>
      </div>
    </PageShell>
  );
}
