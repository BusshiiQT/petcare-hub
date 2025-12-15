# 🐾 PetCare Hub

**PetCare Hub** is a full-stack web application that connects pet owners with trusted pet care providers for services like walking, sitting, and training.

This project was built as a **production-ready portfolio application**, focusing on clean architecture, real-world constraints, and scalable patterns.

👉 **Live Demo:** https://YOUR-VERCEL-URL.vercel.app  
👉 **Source Code:** https://github.com/BusshiiQT/petcare-hub

---

## ✨ Key Features

### 🐶 Pet Owners
- Create and manage pet profiles
- Browse available pet care providers
- Request bookings with live availability validation
- Track upcoming and past bookings
- Leave provider reviews

### 🧑‍⚕️ Providers
- Create a public provider profile
- Set weekly availability schedules
- View and manage incoming booking requests
- Prevent overlapping bookings automatically
- Dashboard with booking stats and ratings

### 🔐 Authentication & Security
- Email/password authentication via Supabase
- Role-aware dashboards (owner vs provider)
- Server-side validation for bookings
- Secure row-level access enforced via Supabase RLS
- Service-role protected server actions for critical logic

---

## 🧠 Technical Highlights (What Recruiters Care About)

- **Server-side availability validation**  
  Booking requests are validated against provider schedules and existing bookings on the server (not just the UI).

- **Real-world booking logic**
  - Prevents overlapping bookings
  - Enforces provider working hours
  - Handles race conditions safely

- **Modern Next.js architecture**
  - App Router
  - Server Actions
  - Client/Server Supabase separation
  - Type-safe data handling

- **Clean UX**
  - Interactive availability picker
  - Skeleton loading states
  - Clear success/error feedback

---

## 🛠️ Tech Stack

- **Frontend:** Next.js 16 (App Router), TypeScript, Tailwind CSS
- **Backend:** Supabase (Postgres, Auth, Row Level Security)
- **Deployment:** Vercel
- **Animations:** Framer Motion
- **State & Data:** React hooks + Supabase client

---

## 🚀 Getting Started (Local Setup)

```bash
git clone https://github.com/BusshiiQT/petcare-hub.git
cd petcare-hub
npm install
