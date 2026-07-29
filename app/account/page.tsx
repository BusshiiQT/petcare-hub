"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseBrowser";
import { requireUser } from "@/lib/requireUser";

import { Container } from "@/components/container";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
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
      <main className="min-h-screen bg-white py-16">
        <Container>
          <p>Loading your account...</p>
        </Container>
      </main>
    );
  }

  if (!userId || !userEmail) {
    return (
      <main className="min-h-screen bg-white py-16">
        <Container>
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle>Account</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-700">
                You need to be logged in to view your account.
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
        {errorMsg && (
          <p className="text-sm text-red-600 mb-4">{errorMsg}</p>
        )}

        <div className="grid gap-6 md:grid-cols-[2fr,1.5fr]">
          {/* Left column: account details + profile settings */}
          <div className="space-y-6">
            {/* Account details */}
            <Card>
              <CardHeader>
                <CardTitle>Account details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-xs font-semibold text-gray-700 mb-1">
                    Email
                  </p>
                  <p className="text-sm text-gray-900">{userEmail}</p>
                </div>

                <div>
                  <p className="text-xs font-semibold text-gray-700 mb-1">
                    User ID
                  </p>
                  <p className="text-xs text-gray-500 break-all">{userId}</p>
                </div>

                <div>
                  <p className="text-xs font-semibold text-gray-700 mb-1">
                    Provider status
                  </p>
                  {isProvider ? (
                    <p className="text-sm text-green-700">
                      You have a provider profile
                      {providerProfile?.display_name
                        ? ` as "${providerProfile.display_name}".`
                        : "."}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-700">
                      You don&apos;t have a provider profile yet.
                    </p>
                  )}
                </div>

                <div className="pt-2 border-t mt-4">
                  <Button
                    variant="outline"
                    className="rounded-full"
                    onClick={handleLogout}
                  >
                    Log out
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Profile settings (user metadata) */}
            <Card>
              <CardHeader>
                <CardTitle>Profile settings</CardTitle>
              </CardHeader>
              <CardContent>
                <form className="space-y-3" onSubmit={handleSaveProfile}>
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-gray-700">
                      Full name
                    </label>
                    <Input
                      type="text"
                      value={profileFullName}
                      onChange={(e) => setProfileFullName(e.target.value)}
                      placeholder="Your name"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-gray-700">
                      Phone
                    </label>
                    <Input
                      type="tel"
                      value={profilePhone}
                      onChange={(e) => setProfilePhone(e.target.value)}
                      placeholder="Optional phone number"
                    />
                  </div>

                  {profileMessage && (
                    <p
                      className={`text-sm ${
                        profileMessage.includes("Failed")
                          ? "text-red-600"
                          : "text-green-600"
                      }`}
                    >
                      {profileMessage}
                    </p>
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
          </div>

          {/* Right column: quick actions + security */}
          <div className="space-y-6">
            {/* Quick actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-700">
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

                <div className="space-y-2 pt-2 border-t">
                  <p className="text-xs font-semibold text-gray-700">
                    Provider tools
                  </p>
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
                      <p className="text-xs text-gray-600">
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

            {/* Security: email + password */}
            <Card>
              <CardHeader>
                <CardTitle>Security</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Change email */}
                <form className="space-y-2" onSubmit={handleUpdateEmail}>
                  <p className="text-xs font-semibold text-gray-700">
                    Change email
                  </p>
                  <Input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="New email address"
                  />
                  {emailMessage && (
                    <p
                      className={`text-xs ${
                        emailMessage.includes("Failed")
                          ? "text-red-600"
                          : "text-gray-700"
                      }`}
                    >
                      {emailMessage}
                    </p>
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

                {/* Change password */}
                <form
                  className="space-y-2 pt-3 border-t"
                  onSubmit={handleUpdatePassword}
                >
                  <p className="text-xs font-semibold text-gray-700">
                    Change password
                  </p>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="New password"
                  />
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                  />
                  {passwordMessage && (
                    <p
                      className={`text-xs ${
                        passwordMessage.includes("Failed")
                          ? "text-red-600"
                          : "text-gray-700"
                      }`}
                    >
                      {passwordMessage}
                    </p>
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
          </div>
        </div>
      </Container>
    </main>
  );
}
