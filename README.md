🐾 PetCare Hub

PetCare Hub is a full-stack marketplace that connects pet owners with trusted local walkers, sitters, and trainers. It supports real bookings, provider availability, reviews, and secure role-based access — built with production-grade authentication and database security.

Live Demo: https://petcare-hub-gilt.vercel.app

GitHub Repo: https://github.com/BusshiiQT/petcare-hub

Key Features
Pet Owners

Secure signup/login with Supabase Auth

Create and manage pet profiles

Book providers based on real availability

View and manage upcoming bookings

Leave reviews after completed services

Service Providers

Create and manage a public provider profile

Set weekly availability windows

Accept and manage bookings tied to their profile

View reviews and booking history

Platform

Role-aware access (owners vs providers)

Server-validated booking creation

Row Level Security (RLS) enforced in Postgres

Production deployment on Vercel

Why This Is Impressive (Engineering Decisions)
Server-Side Booking Validation

Booking creation is handled via a Next.js Server Action, not directly from the client. Each booking request:

Verifies the user’s Supabase access token

Confirms pet ownership

Validates provider availability windows

Detects overlapping bookings

Inserts records with safe fallback handling

This prevents client-side tampering and booking race conditions.

Defense-in-Depth Security

Security is enforced at multiple layers:

Supabase Auth for identity

Server-side token verification

Postgres Row Level Security (RLS)

Service-role access restricted to server-only code

Even if the frontend is bypassed, unauthorized reads and writes are blocked.

Real Production RLS (Not Demo Policies)

Each table has explicit RLS rules:

Owners can only access their own pets, bookings, and reviews

Providers can only manage availability and bookings tied to their profile

Authenticated users can read active provider profiles and reviews

This mirrors real SaaS data-security requirements.

Tech Stack

Frontend

Next.js 16 (App Router)

React 19

TypeScript

Tailwind CSS v4

Framer Motion

Radix UI primitives

Backend / Data

Supabase (Postgres + Auth)

Supabase SSR helpers

Row Level Security (RLS)

Next.js Server Actions

Deployment

Vercel

Architecture Overview
app/
 ├─ auth/              → signup/login flows
 ├─ bookings/          → owner booking views
 ├─ provider/          → provider dashboards
 ├─ providers/         → public provider browsing
 ├─ pets/              → pet management
 ├─ actions/           → server actions (booking creation)
lib/
 ├─ supabaseBrowser    → browser client (anon key)
 ├─ supabaseAdmin      → server-only service role client
 ├─ requireUser        → auth guard helper


Pattern

Client → Server Action

Server → validates identity + business rules

Database → enforces RLS regardless of client behavior

Database & RLS (High-Level)

Tables

profiles

pets

provider_profiles

provider_availability

bookings

reviews

RLS Highlights

Owners: scoped access to their own data

Providers: scoped access to their profile and bookings

Authenticated reads for active providers, availability, and reviews

No unauthenticated writes

Local Setup
git clone https://github.com/BusshiiQT/petcare-hub
cd petcare-hub
npm install


Create .env.local:

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=


Run locally:

npm run dev

Deployment Notes

Deployed on Vercel

Environment variables managed via Vercel dashboard

Service role key used only in server actions

Supabase handles authentication, database, and RLS

Roadmap / Next Improvements

Provider booking approval workflow

Booking cancellation & refund logic

Calendar-based availability management

Owner ↔ provider messaging

Admin moderation tools

Stripe payment integration