"use client";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { Session, User } from "@supabase/supabase-js";
import { LogOut, Menu, PawPrint, X } from "lucide-react";
import { Container } from "@/components/container";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabaseBrowser";

type Item = { href: string; label: string; exact?: boolean };
const PUBLIC: Item[] = [{ href: "/", label: "Home", exact: true }, { href: "/providers", label: "Providers" }, { href: "/about", label: "About" }];
const OWNER: Item[] = [{ href: "/owner", label: "Dashboard" }, { href: "/pets", label: "My pets" }, { href: "/bookings", label: "My bookings" }];
const PROVIDER: Item[] = [{ href: "/provider", label: "Overview", exact: true }, { href: "/provider/bookings", label: "Bookings" }, { href: "/provider/availability", label: "Availability" }, { href: "/provider/profile", label: "Profile" }];
const focus = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 focus-visible:ring-offset-2";

function NavLink({ item, path, close, mobile }: { item: Item; path: string; close?: () => void; mobile?: boolean }) {
  const active = item.exact ? path === item.href : path === item.href || path.startsWith(`${item.href}/`);
  return <Link href={item.href} aria-current={active ? "page" : undefined} onClick={close} className={cn("relative inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-medium transition-colors motion-reduce:transition-none", focus, mobile && "w-full justify-between px-3.5", active ? "bg-sky-50 text-sky-900 after:absolute after:inset-x-3 after:bottom-1 after:h-0.5 after:bg-emerald-500" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950")}>
    {item.label}{mobile && active ? <span className="text-xs font-semibold text-emerald-700">Current</span> : null}
  </Link>;
}

export function Navbar() {
  const path = usePathname();
  const router = useRouter();
  const menuId = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [provider, setProvider] = useState(false);
  useEffect(() => {
    let mounted = true;
    const sync = async (user: User | null) => {
      if (!mounted) return;
      setEmail(user?.email ?? null);
      if (!user) return setProvider(false);
      const { data } = await supabase.from("provider_profiles").select("id").eq("user_id", user.id).maybeSingle();
      if (mounted) setProvider(Boolean(data));
    };
    void supabase.auth.getUser().then(({ data }) => sync(data.user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: string, session: Session | null) => void sync(session?.user ?? null));
    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!open) return;
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { setOpen(false); trigger.current?.focus(); } };
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [open]);
  const close = () => setOpen(false);
  const logout = async () => { close(); await supabase.auth.signOut(); setEmail(null); setProvider(false); router.push("/"); };
  const links = (items: Item[], mobile = false) => items.map((item) => <NavLink key={item.href} item={item} path={path} close={mobile ? close : undefined} mobile={mobile} />);

  return <header className="sticky top-0 z-50 border-b border-sky-100/80 bg-white/95 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/85">
    <Container><div className="flex min-h-16 items-center justify-between gap-4 lg:min-h-18">
      <Link href="/" aria-label="PetCare Hub home" className={cn("group inline-flex min-h-11 items-center gap-2 rounded-lg pr-2 font-semibold tracking-tight text-slate-950", focus)}>
        <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-sky-500 to-emerald-500 text-white shadow-sm"><PawPrint className="size-5" aria-hidden="true" /></span><span className="text-lg sm:text-xl">PetCare Hub</span>
      </Link>
      <nav aria-label="Primary navigation" className="hidden items-center gap-0.5 lg:flex">{links(PUBLIC)}</nav>
      <div className="hidden items-center gap-2 lg:flex">{email ? <>
        <div className="flex items-center gap-0.5 border-l border-slate-200 pl-3">{links(OWNER)}{provider ? <NavLink item={{ href: "/provider", label: "Provider" }} path={path} /> : null}</div>
        <Link href="/account" aria-current={path === "/account" ? "page" : undefined} title={email} className={cn("ml-1 flex min-h-11 max-w-44 items-center rounded-lg px-3 text-sm font-medium", focus, path === "/account" ? "bg-sky-50 text-sky-900 ring-1 ring-sky-100" : "text-slate-600 hover:bg-slate-100")}><span className="truncate">{email}</span></Link>
        <Button variant="ghost" size="icon-lg" onClick={logout} aria-label="Log out" title="Log out" className="rounded-lg text-slate-600 hover:bg-rose-50 hover:text-rose-700"><LogOut aria-hidden="true" /></Button>
      </> : <><Link href="/auth/signup" className={cn("inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold text-slate-700 hover:bg-slate-100", focus)}>Sign up</Link><Button asChild className="h-11 rounded-lg bg-sky-600 px-5 hover:bg-sky-700"><Link href="/auth/login">Log in</Link></Button></>}</div>
      <Button ref={trigger} variant="outline" size="icon-lg" className="size-11 rounded-lg lg:hidden" aria-label={open ? "Close navigation menu" : "Open navigation menu"} aria-expanded={open} aria-controls={menuId} onClick={() => setOpen(!open)}>{open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}</Button>
    </div></Container>

    <div id={menuId} hidden={!open} className="border-t border-slate-200 bg-white lg:hidden">
      <Container className="max-h-[calc(100dvh-4rem)] overflow-y-auto py-4"><nav aria-label="Mobile navigation" className="space-y-5">
        <div><p className="px-3.5 pb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Explore</p><div className="grid gap-1">{links(PUBLIC, true)}</div></div>
        {email ? <>
          <div className="border-t border-slate-200 pt-4"><p className="px-3.5 pb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Your workspace</p><div className="grid gap-1">{links(OWNER, true)}</div></div>
          {provider ? <div className="border-t border-slate-200 pt-4"><p className="px-3.5 pb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Provider workspace</p><div className="grid gap-1">{links(PROVIDER, true)}</div></div> : null}
          <div className="border-t border-slate-200 pt-4"><p className="truncate px-3.5 pb-2 text-sm text-slate-500" title={email}>{email}</p><div className="grid grid-cols-2 gap-2">
            <Button asChild variant="outline" className="h-11 rounded-lg"><Link href="/account" onClick={close}>Account</Link></Button>
            <Button variant="outline" className="h-11 rounded-lg text-rose-700 hover:bg-rose-50" onClick={logout}><LogOut aria-hidden="true" />Log out</Button>
          </div></div>
        </> : <div className="grid grid-cols-2 gap-2 border-t border-slate-200 pt-4">
          <Button asChild variant="outline" className="h-11 rounded-lg"><Link href="/auth/signup" onClick={close}>Sign up</Link></Button>
          <Button asChild className="h-11 rounded-lg bg-sky-600 hover:bg-sky-700"><Link href="/auth/login" onClick={close}>Log in</Link></Button>
        </div>}
      </nav></Container>
    </div>
  </header>;
}
