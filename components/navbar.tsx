"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";

export function Navbar() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    // Get current user on load
    const loadUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUserEmail(data.user?.email ?? null);
    };

    loadUser();

    // Subscribe to auth change events (login/logout)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUserEmail(null);
    router.push("/");
  };

  return (
    <nav className="w-full border-b bg-white">
      <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
        {/* Brand */}
        <Link href="/" className="text-2xl font-bold text-gray-900">
          PetCare Hub
        </Link>

        {/* Navigation links */}
        <div className="flex items-center gap-4 text-sm">
          <Link href="/" className="text-gray-700 hover:text-gray-900">
            Home
          </Link>

          <Link href="/providers" className="text-gray-700 hover:text-gray-900">
            Providers
          </Link>

          <Link href="/about" className="text-gray-700 hover:text-gray-900">
            About
          </Link>

          {userEmail ? (
            <>
              {/* Owner dashboard */}
              <Link
                href="/owner"
                className="text-gray-700 hover:text-gray-900 hidden sm:inline"
              >
                Dashboard
              </Link>

              {/* Provider dashboard – page itself handles whether user is a provider */}
              <Link
                href="/provider"
                className="text-gray-700 hover:text-gray-900 hidden sm:inline"
              >
                Provider Dashboard
              </Link>

              <Link
                href="/pets"
                className="text-gray-700 hover:text-gray-900 hidden sm:inline"
              >
                My pets
              </Link>

              <Link
                href="/bookings"
                className="text-gray-700 hover:text-gray-900 hidden sm:inline"
              >
                My bookings
              </Link>

              <Link
                href="/account"
                className="text-gray-700 hover:text-gray-900 hidden sm:inline"
              >
                Account
              </Link>

              <span className="hidden sm:inline text-gray-600 max-w-[150px] truncate">
                {userEmail}
              </span>

              <Button
                size="sm"
                variant="outline"
                className="rounded-full"
                onClick={handleLogout}
              >
                Log out
              </Button>
            </>
          ) : (
            <>
              <Link
                href="/auth/signup"
                className="text-gray-700 hover:text-gray-900 hidden sm:inline"
              >
                Sign up
              </Link>

              <Button size="sm" className="rounded-full" asChild>
                <Link href="/auth/login">Log in</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
