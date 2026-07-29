import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/navbar";
import { PageTransition } from "@/components/page-transition";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PetCare Hub",
  description: "A trusted marketplace for pet walkers, sitters, and trainers.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-slate-50 text-slate-950 antialiased`}
      >
        <div className="flex min-h-screen flex-col bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.07),transparent_28rem),radial-gradient(circle_at_top_right,rgba(16,185,129,0.05),transparent_24rem)]">
          <Navbar />
          <main className="flex-1" id="main-content">
            <PageTransition>{children}</PageTransition>
          </main>
        </div>
      </body>
    </html>
  );
}
