# PetCare Hub 🐾  
A clean, production-style pet care marketplace where pet owners can browse providers, request bookings, manage pets, and leave reviews — with provider-side availability and booking conflict protection.

**Live Demo:** https://petcare-1ewpqvn5x-busshiiqts-projects.vercel.app/
**Repo:** https://github.com/BusshiiQT/petcare-hub

---

## Why this project
PetCare Hub is a portfolio project built to demonstrate modern full-stack patterns:
- Auth + role-based flows (Owner vs Provider)
- Real database modeling with RLS (Row Level Security)
- Booking lifecycle + conflict prevention
- Production deployment on Vercel

---

## Core features

### Owner experience
- Sign up / log in
- Add and manage pets
- Browse active providers
- Request a booking (time range selection)
- View bookings
- Leave reviews on providers

### Provider experience
- Create/edit provider profile
- Set weekly availability (schedule UI)
- View incoming bookings
- Booking status actions (pending/confirmed/completed/cancelled)
- Provider dashboard overview

### Reliability / validation
- **Server-side booking validation** checks:
  - Provider availability for that weekday/time range
  - Overlapping bookings (pending/confirmed)
  - Pet ownership validation (owner can only book with their own pets)

---

## Tech stack
- **Next.js (App Router)**
- **TypeScript**
- **Supabase** (Postgres, Auth, RLS, SQL)
- **TailwindCSS + shadcn/ui**
- **Framer Motion** (light UI animations)
- **Vercel** deployment

---

## Database (Supabase)
Tables used (high level):
- `profiles` (user profile)
- `provider_profiles`
- `pets`
- `bookings`
- `reviews`
- `provider_availability`

Security:
- RLS policies ensure users only access/modify their own data.

---

## Local setup

### 1) Install dependencies
```bash
npm install
