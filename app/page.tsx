"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Container } from "@/components/container";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-emerald-50">
      <Container>
        <section className="py-16 md:py-24 grid gap-10 md:grid-cols-[1.2fr,1fr] items-center">
          {/* Hero text */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="space-y-6"
          >
            <span className="inline-flex items-center rounded-full border border-sky-100 bg-white/70 px-3 py-1 text-xs font-medium text-sky-700 shadow-sm">
              🐾 PetCare Hub · Trusted pet services marketplace
            </span>

            <h1 className="text-3xl md:text-5xl font-semibold tracking-tight text-gray-900">
              Book trusted walkers, sitters, and trainers{" "}
              <span className="text-emerald-600">in your neighborhood.</span>
            </h1>

            <p className="text-base md:text-lg text-gray-700 max-w-xl">
              PetCare Hub connects loving pet professionals with busy pet
              parents. Manage pets, bookings, and reviews in one simple,
              secure place.
            </p>

            <div className="flex flex-wrap gap-3 pt-2">
              <Button
                asChild
                className="rounded-full px-6 py-2 text-base shadow-md"
              >
                <Link href="/auth/signup">Get started as an owner</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="rounded-full px-6 py-2 text-base border-gray-300"
              >
                <Link href="/provider/profile">
                  Offer walking & sitting services
                </Link>
              </Button>
            </div>

            <div className="flex flex-wrap gap-4 pt-4 text-xs text-gray-600">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span>Verified providers</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-sky-500" />
                <span>Secure bookings & reviews</span>
              </div>
            </div>
          </motion.div>

          {/* Hero card / illustration */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut", delay: 0.05 }}
          >
            <div className="relative rounded-3xl bg-white/80 shadow-xl border border-sky-100 p-6 md:p-7 overflow-hidden">
              <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-emerald-100" />
              <div className="absolute -bottom-16 -left-8 h-40 w-40 rounded-full bg-sky-100" />

              <div className="relative space-y-4">
                <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">
                  Today&apos;s snapshot
                </p>

                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-3xl font-semibold text-gray-900">
                      3
                      <span className="text-base text-gray-500"> walks</span>
                    </p>
                    <p className="text-xs text-gray-500">
                      Booked for your pets this week
                    </p>
                  </div>
                  <div className="rounded-2xl bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                    <p className="font-medium">Next up</p>
                    <p>Today · 3:00 PM</p>
                    <p className="text-[11px] text-emerald-600 mt-1">
                      Luna · 30 min walk
                    </p>
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-4 space-y-3">
                  <p className="text-xs font-semibold text-gray-700">
                    Top providers near you
                  </p>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="h-7 w-7 rounded-full bg-sky-100" />
                        <div>
                          <p className="font-medium text-gray-800">
                            Alex · Dog Walker
                          </p>
                          <p className="text-[11px] text-gray-500">
                            4.9 ★ · 120+ walks
                          </p>
                        </div>
                      </div>
                      <span className="rounded-full bg-gray-50 px-2 py-1 text-[11px] text-gray-700">
                        $22/hr
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="h-7 w-7 rounded-full bg-emerald-100" />
                        <div>
                          <p className="font-medium text-gray-800">
                            Jamie · Pet Sitter
                          </p>
                          <p className="text-[11px] text-gray-500">
                            5.0 ★ · 40+ stays
                          </p>
                        </div>
                      </div>
                      <span className="rounded-full bg-gray-50 px-2 py-1 text-[11px] text-gray-700">
                        $40/night
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 text-[11px] text-gray-500">
                  Built for busy pet parents & trusted pros.
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* Features section */}
        <section className="pb-20">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut", delay: 0.1 }}
            className="grid gap-6 md:grid-cols-3"
          >
            <div className="rounded-2xl border border-gray-100 bg-white/80 p-5 shadow-sm">
              <p className="text-sm font-semibold text-gray-800 mb-2">
                For pet owners
              </p>
              <p className="text-xs text-gray-600 mb-3">
                Create pet profiles, browse local providers, and manage all your
                bookings in one place.
              </p>
              <ul className="space-y-1 text-xs text-gray-600">
                <li>• Track walks, sittings, and training sessions</li>
                <li>• Leave reviews and favorite providers</li>
                <li>• Secure login with Supabase Auth</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white/80 p-5 shadow-sm">
              <p className="text-sm font-semibold text-gray-800 mb-2">
                For providers
              </p>
              <p className="text-xs text-gray-600 mb-3">
                Build a professional profile, manage bookings, and grow a
                part-time or full-time pet business.
              </p>
              <ul className="space-y-1 text-xs text-gray-600">
                <li>• Set your services and hourly rates</li>
                <li>• Manage availability and booking status</li>
                <li>• Collect ratings & reviews from happy owners</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white/80 p-5 shadow-sm">
              <p className="text-sm font-semibold text-gray-800 mb-2">
                Built to scale
              </p>
              <p className="text-xs text-gray-600 mb-3">
                Next.js 14, Supabase, and Vercel under the hood—designed to be
                production-ready from day one.
              </p>
              <ul className="space-y-1 text-xs text-gray-600">
                <li>• Fast, animated page transitions</li>
                <li>• Secure, row-level data access</li>
                <li>• Easy deployment to Vercel</li>
              </ul>
            </div>
          </motion.div>
        </section>
      </Container>
    </main>
  );
}
