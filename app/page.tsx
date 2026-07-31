"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { PageShell } from "@/components/app/page-shell";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <PageShell className="bg-gradient-to-b from-sky-50 via-white to-emerald-50 py-0">
      <section className="grid items-center gap-10 py-14 md:grid-cols-[1.2fr_1fr] md:py-20 lg:py-24">
          {/* Hero text */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="space-y-6"
          >
            <span className="inline-flex items-center rounded-full border border-sky-100 bg-white/70 px-3 py-1 text-xs font-medium text-sky-700 shadow-sm">
              <span aria-hidden="true">🐾</span>
              <span className="ml-1">PetCare Hub · Pet services marketplace</span>
            </span>

            <h1 className="text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl md:text-5xl">
              Book trusted walkers, sitters, and trainers{" "}
              <span className="text-emerald-600">in your neighborhood.</span>
            </h1>

            <p className="max-w-xl text-base leading-7 text-gray-700 md:text-lg">
              PetCare Hub connects loving pet professionals with busy pet
              parents. Manage pets, bookings, and reviews in one simple,
              organized place.
            </p>

            <div className="flex flex-wrap gap-3 pt-2">
              <Button
                asChild
                className="h-auto min-h-11 rounded-full px-6 py-2 text-base shadow-md"
              >
                <Link href="/auth/signup">Get started as an owner</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="h-auto min-h-11 whitespace-normal rounded-full border-gray-300 px-6 py-2 text-center text-base"
              >
                <Link href="/provider/profile">
                  Offer walking & sitting services
                </Link>
              </Button>
            </div>

            <div className="flex flex-wrap gap-4 pt-4 text-xs text-gray-600">
              <div className="flex items-center gap-2">
                <span
                  className="h-2 w-2 rounded-full bg-emerald-500"
                  aria-hidden="true"
                />
                <span>Active provider profiles</span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="h-2 w-2 rounded-full bg-sky-500"
                  aria-hidden="true"
                />
                <span>Booking and review workflows</span>
              </div>
            </div>
          </motion.div>

          {/* Hero card / illustration */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut", delay: 0.05 }}
          >
            <div className="relative overflow-hidden rounded-3xl border border-sky-100 bg-white/80 p-6 shadow-xl md:p-7">
              <div
                className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-emerald-100"
                aria-hidden="true"
              />
              <div
                className="absolute -bottom-16 -left-8 h-40 w-40 rounded-full bg-sky-100"
                aria-hidden="true"
              />

              <div className="relative space-y-4">
                <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">
                  Illustrative product preview
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
                    <p className="mt-1 text-xs text-emerald-600">
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
                        <span
                          className="h-7 w-7 rounded-full bg-sky-100"
                          aria-hidden="true"
                        />
                        <div>
                          <p className="font-medium text-gray-800">
                            Alex · Dog Walker
                          </p>
                          <p className="text-xs text-gray-500">
                            4.9 ★ · 120+ walks
                          </p>
                        </div>
                      </div>
                      <span className="rounded-full bg-gray-50 px-2 py-1 text-xs text-gray-700">
                        $22/hr
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-7 w-7 rounded-full bg-emerald-100"
                          aria-hidden="true"
                        />
                        <div>
                          <p className="font-medium text-gray-800">
                            Jamie · Pet Sitter
                          </p>
                          <p className="text-xs text-gray-500">
                            5.0 ★ · 40+ stays
                          </p>
                        </div>
                      </div>
                      <span className="rounded-full bg-gray-50 px-2 py-1 text-xs text-gray-700">
                        $40/night
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 text-xs text-gray-500">
                  Designed for pet parents and care providers.
                </div>
              </div>
            </div>
          </motion.div>
      </section>

      {/* Features section */}
      <section
        className="space-y-8 pb-16 md:pb-20"
        aria-labelledby="features-heading"
      >
          <div className="mx-auto max-w-2xl space-y-2 text-center">
            <h2
              id="features-heading"
              className="text-2xl font-semibold tracking-tight text-gray-900 sm:text-3xl"
            >
              Built for owners and providers
            </h2>
            <p className="text-sm leading-6 text-gray-600 sm:text-base">
              One responsive workspace for pet profiles, provider services,
              booking requests, availability, and reviews.
            </p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut", delay: 0.1 }}
            className="grid gap-6 md:grid-cols-3"
          >
            <Card className="gap-4 border-gray-100 bg-white/80 py-5">
              <CardHeader className="px-5">
                <CardTitle>
                  <h3 className="text-base text-gray-800">For pet owners</h3>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 px-5">
                <p className="text-sm leading-6 text-gray-600">
                  Create pet profiles, browse local providers, and manage all
                  your bookings in one place.
                </p>
                <ul className="list-disc space-y-2 pl-5 text-sm text-gray-600">
                  <li>Track walks, sittings, and training sessions</li>
                  <li>Request bookings and leave provider reviews</li>
                  <li>Sign in with Supabase authentication</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="gap-4 border-gray-100 bg-white/80 py-5">
              <CardHeader className="px-5">
                <CardTitle>
                  <h3 className="text-base text-gray-800">For providers</h3>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 px-5">
                <p className="text-sm leading-6 text-gray-600">
                  Build a professional profile, manage bookings, and grow a
                  part-time or full-time pet business.
                </p>
                <ul className="list-disc space-y-2 pl-5 text-sm text-gray-600">
                  <li>Set services and hourly rates</li>
                  <li>Manage availability and booking status</li>
                  <li>Receive ratings and reviews from owners</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="gap-4 border-gray-100 bg-white/80 py-5">
              <CardHeader className="px-5">
                <CardTitle>
                  <h3 className="text-base text-gray-800">Modern foundation</h3>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 px-5">
                <p className="text-sm leading-6 text-gray-600">
                  Built as a responsive portfolio application with current web
                  tooling and reusable interface patterns.
                </p>
                <ul className="list-disc space-y-2 pl-5 text-sm text-gray-600">
                  <li>Next.js 16 and React 19</li>
                  <li>Supabase authentication and data workflows</li>
                  <li>Accessible semantic states and responsive navigation</li>
                </ul>
              </CardContent>
            </Card>
          </motion.div>
      </section>
    </PageShell>
  );
}
