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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ProviderProfile = {
  id: string;
  display_name: string | null;
};

export default function AccountPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [providerProfile, setProviderProfile] =
    useState<ProviderProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Profile settings (user metadata)
  const [profileFullName, setProfileFullName] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);

  // Email change
  const [newEmail, setNewEmail] = useState("");
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  const [emailMessage, setEmailMessage] = useState<string | null>(null);

  // Password change
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadAccount = async () => {
      setIsLoading(true);
      setErrorMsg(null);

      try {
        const user = await requireUser(() => router.replace("/auth/login"));
        if (!user) {
          setUserId(null);
          setUserEmail(null);
          return;
        }

        setUserId(user.id);
        setUserEmail(user.email ?? null);

        // Load profile fields from user metadata
        const meta = (user.user_metadata || {}) as {
          full_name?: string;
          phone?: string;
        };
        setProfileFullName(meta.full_name ?? "");
        setProfilePhone(meta.phone ?? "");

        // Check for provider profile
        const { data: profile, error: providerError } = await supabase
          .from("provider_profiles")
          .select("id, display_name")
          .eq("user_id", user.id)
          .maybeSingle();

        if (providerError && providerError.code !== "PGRST116") {
          // PGRST116 = no rows found, which is ok
          throw providerError;
        }

        setProviderProfile(profile as ProviderProfile | null);
      } catch (err) {
        console.error("Error loading account:", err);
        setErrorMsg("Failed to load account details.");
      } finally {
        setIsLoading(false);
      }
    };

    loadAccount();
  }, [router]);

  const isProvider = !!providerProfile;

  // --- Handlers ---

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMessage(null);
    setIsSavingProfile(true);

    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: profileFullName || null,
          phone: profilePhone || null,
        },
      });

      if (error) throw error;

      setProfileMessage("Profile updated successfully.");
    } catch (err) {
      console.error("Error updating profile metadata:", err);
      setProfileMessage("Failed to update profile.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailMessage(null);

    if (!newEmail) {
      setEmailMessage("Please enter a new email address.");
      return;
    }

    setIsUpdatingEmail(true);

    try {
      const { data, error } = await supabase.auth.updateUser({
        email: newEmail,
      });

      if (error) throw error;

      // Supabase will send a confirmation email if email change requires it
      if (data.user?.email === newEmail) {
        setUserEmail(newEmail);
        setEmailMessage("Email updated successfully.");
      } else {
        setEmailMessage(
          "Check your inbox to confirm your new email address."
        );
      }

      setNewEmail("");
    } catch (err) {
      console.error("Error updating email:", err);
      setEmailMessage("Failed to update email.");
    } finally {
      setIsUpdatingEmail(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage(null);

    if (!newPassword || newPassword.length < 6) {
      setPasswordMessage("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage("Passwords do not match.");
      return;
    }

    setIsUpdatingPassword(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      setPasswordMessage("Password updated successfully.");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      console.error("Error updating password:", err);
      setPasswordMessage("Failed to update password.");
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  // --- Render states ---

  if (isLoading) {
    return (
      <PageShell>
        <PageHeader
          title="Account settings"
          description="Manage your profile, workspace access, email, and password."
        />
        <LoadingState label="Loading your account">
          <p className="text-sm text-muted-foreground">
            Loading your account...
          </p>
        </LoadingState>
      </PageShell>
    );
  }

  if (!userId || !userEmail) {
    return (
      <PageShell>
        <PageHeader
          title="Account settings"
          description="Manage your profile, workspace access, email, and password."
        />
        <PageSection aria-label="Sign in required">
          <EmptyState
            variant="panel"
            title="Sign in to view your account"
            description="You need to be logged in to view your account."
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
        title="Account settings"
        description="Manage your profile, workspace access, email, and password."
        actions={
          <Button
            variant="outline"
            className="rounded-full"
            onClick={handleLogout}
          >
            Log out
          </Button>
        }
      />

      {errorMsg && <FeedbackAlert variant="error">{errorMsg}</FeedbackAlert>}

      <div className="grid min-w-0 items-start gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(20rem,0.9fr)]">
        <div className="min-w-0 space-y-8">
          <PageSection title="Account overview">
            <Card>
              <CardContent className="space-y-5">
                <div>
                  <p className="mb-1 text-xs font-semibold text-muted-foreground">
                    Email
                  </p>
                  <p className="break-words text-sm text-foreground">
                    {userEmail}
                  </p>
                </div>

                <div>
                  <p className="mb-1 text-xs font-semibold text-muted-foreground">
                    User ID
                  </p>
                  <p className="break-all text-xs text-muted-foreground">
                    {userId}
                  </p>
                </div>

                <div className="border-t pt-4">
                  <p className="mb-3 text-xs font-semibold text-muted-foreground">
                    Owner tools
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-full"
                      onClick={() => router.push("/owner")}
                    >
                      Owner dashboard
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-full"
                      onClick={() => router.push("/pets")}
                    >
                      Manage pets
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-full"
                      onClick={() => router.push("/bookings")}
                    >
                      View bookings
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </PageSection>

          <PageSection title="Profile information">
            <Card>
              <CardContent>
                <form className="space-y-4" onSubmit={handleSaveProfile}>
                  <div className="space-y-1.5">
                    <label
                      htmlFor="account-full-name"
                      className="block text-xs font-medium text-foreground"
                    >
                      Full name
                    </label>
                    <Input
                      id="account-full-name"
                      type="text"
                      value={profileFullName}
                      onChange={(e) => setProfileFullName(e.target.value)}
                      placeholder="Your name"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label
                      htmlFor="account-phone"
                      className="block text-xs font-medium text-foreground"
                    >
                      Phone
                    </label>
                    <Input
                      id="account-phone"
                      type="tel"
                      value={profilePhone}
                      onChange={(e) => setProfilePhone(e.target.value)}
                      placeholder="Optional phone number"
                    />
                  </div>

                  {profileMessage && (
                    <FeedbackAlert
                      variant={
                        profileMessage.includes("Failed") ? "error" : "success"
                      }
                    >
                      {profileMessage}
                    </FeedbackAlert>
                  )}

                  <Button
                    type="submit"
                    className="rounded-full"
                    disabled={isSavingProfile}
                  >
                    {isSavingProfile ? "Saving..." : "Save changes"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </PageSection>
        </div>

        <div className="min-w-0 space-y-8">
          <PageSection title="Provider status">
            <Card>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <p className="text-sm text-foreground">
                      {isProvider
                        ? `You have a provider profile${
                            providerProfile?.display_name
                              ? ` as "${providerProfile.display_name}".`
                              : "."
                          }`
                        : "You don’t have a provider profile yet."}
                    </p>
                  </div>
                  <StatusBadge tone={isProvider ? "success" : "neutral"}>
                    {isProvider ? "Provider profile" : "No provider profile"}
                  </StatusBadge>
                </div>

                <div className="border-t pt-4">
                  {isProvider ? (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-full"
                        onClick={() => router.push("/provider")}
                      >
                        Provider dashboard
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-full"
                        onClick={() => router.push("/provider/profile")}
                      >
                        Edit provider profile
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">
                        Want to offer walking, sitting, or training services?
                        Become a provider.
                      </p>
                      <Button
                        size="sm"
                        className="rounded-full"
                        onClick={() => router.push("/provider/profile")}
                      >
                        Become a provider
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </PageSection>

          <PageSection title="Email">
            <Card>
              <CardContent>
                <form className="space-y-4" onSubmit={handleUpdateEmail}>
                  <div className="space-y-1.5">
                    <label
                      htmlFor="account-new-email"
                      className="block text-xs font-medium text-foreground"
                    >
                      New email address
                    </label>
                    <Input
                      id="account-new-email"
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="New email address"
                    />
                  </div>
                  {emailMessage && (
                    <FeedbackAlert
                      variant={
                        emailMessage.includes("Failed")
                          ? "error"
                          : emailMessage.includes("successfully")
                          ? "success"
                          : emailMessage.includes("Please")
                          ? "warning"
                          : "info"
                      }
                    >
                      {emailMessage}
                    </FeedbackAlert>
                  )}
                  <Button
                    type="submit"
                    size="sm"
                    variant="outline"
                    className="rounded-full"
                    disabled={isUpdatingEmail}
                  >
                    {isUpdatingEmail ? "Updating..." : "Update email"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </PageSection>

          <PageSection title="Password">
            <Card>
              <CardContent>
                <form className="space-y-4" onSubmit={handleUpdatePassword}>
                  <div className="space-y-1.5">
                    <label
                      htmlFor="account-new-password"
                      className="block text-xs font-medium text-foreground"
                    >
                      New password
                    </label>
                    <Input
                      id="account-new-password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="New password"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label
                      htmlFor="account-confirm-password"
                      className="block text-xs font-medium text-foreground"
                    >
                      Confirm new password
                    </label>
                    <Input
                      id="account-confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                    />
                  </div>
                  {passwordMessage && (
                    <FeedbackAlert
                      variant={
                        passwordMessage.includes("Failed")
                          ? "error"
                          : passwordMessage.includes("successfully")
                          ? "success"
                          : "warning"
                      }
                    >
                      {passwordMessage}
                    </FeedbackAlert>
                  )}
                  <Button
                    type="submit"
                    size="sm"
                    variant="outline"
                    className="rounded-full"
                    disabled={isUpdatingPassword}
                  >
                    {isUpdatingPassword ? "Updating..." : "Update password"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </PageSection>
        </div>
      </div>
    </PageShell>
  );
}
