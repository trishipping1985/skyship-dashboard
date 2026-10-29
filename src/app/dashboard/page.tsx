"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

const navigation = [
  { name: "Overview", href: "/dashboard", icon: "▦", active: true },
  {
    name: "Expected Packages",
    href: "/dashboard/expected-packages",
    icon: "◫",
  },
  {
    name: "USA Receiving",
    href: "/dashboard/receive",
    icon: "▣",
  },
  {
    name: "Lebanon Receiving",
    href: "/dashboard/lebanon-receive",
    icon: "▤",
  },
];

export default function DashboardPage() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");

  async function handleLogout() {
    setLoggingOut(true);
    setLogoutError("");

    const { error } = await supabase.auth.signOut();

    if (error) {
      setLogoutError(error.message);
      setLoggingOut(false);
      return;
    }

    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Mobile top bar */}
      <div className="flex items-center justify-between border-b border-white/10 bg-slate-900 px-5 py-4 lg:hidden">
        <div>
          <h1 className="text-xl font-black tracking-wide">
            SKYSHIP
          </h1>
          <p className="text-xs text-sky-400">
            Warehouse Control Center
          </p>
        </div>

        <button
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          className="rounded-xl border border-white/20 px-4 py-2 text-xl"
        >
          {menuOpen ? "✕" : "☰"}
        </button>
      </div>

      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside
          className={`${
            menuOpen ? "block" : "hidden"
          } w-full shrink-0 border-r border-white/10 bg-slate-900 lg:fixed lg:inset-y-0 lg:block lg:w-72`}
        >
          <div className="flex h-full flex-col p-6">
            <div className="hidden border-b border-white/10 pb-8 lg:block">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-2xl font-black">
                  S
                </div>

                <div>
                  <h2 className="text-2xl font-black tracking-wide">
                    SKYSHIP
                  </h2>
                  <p className="text-xs text-sky-400">
                    Beyond Limits. Delivered.
                  </p>
                </div>
              </div>
            </div>

            <p className="mt-8 mb-4 text-xs font-bold uppercase tracking-widest text-slate-500">
              Operations
            </p>

            <nav className="space-y-2">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center gap-4 rounded-xl px-4 py-3 font-semibold transition ${
                    item.active
                      ? "bg-blue-600 text-white"
                      : "text-slate-300 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <span className="w-6 text-center text-xl">
                    {item.icon}
                  </span>
                  <span>{item.name}</span>
                </Link>
              ))}
            </nav>

            <div className="mt-auto border-t border-white/10 pt-6">
              <div className="mb-5 rounded-xl bg-slate-800 p-4">
                <p className="text-sm font-bold">
                  SkyShip Operations
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  USA • Lebanon
                </p>
              </div>

              {logoutError && (
                <p className="mb-3 text-sm text-red-300">
                  {logoutError}
                </p>
              )}

              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="w-full rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-left font-semibold text-red-300 transition hover:bg-red-500/20 disabled:opacity-50"
              >
                {loggingOut ? "Signing out..." : "↪ Logout"}
              </button>
            </div>
          </div>
        </aside>

        {/* Main dashboard */}
        <main
          className={`min-w-0 flex-1 bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 lg:ml-72 ${
            menuOpen ? "hidden lg:block" : "block"
          }`}
        >
          <header className="border-b border-white/10 bg-white/5">
            <div className="mx-auto max-w-7xl px-6 py-8">
              <p className="text-sm font-bold uppercase tracking-[0.25em] text-sky-400">
                SkyShip Operations
              </p>

              <h1 className="mt-3 text-3xl font-black md:text-4xl">
                Warehouse Control Center
              </h1>

              <p className="mt-3 max-w-2xl text-slate-300">
                Manage expected packages and warehouse receiving
                between the USA and Lebanon.
              </p>
            </div>
          </header>

          <section className="mx-auto max-w-7xl px-6 py-10">
            <div className="mb-8">
              <h2 className="text-2xl font-bold">
                Operations Overview
              </h2>
              <p className="mt-2 text-slate-400">
                Select a warehouse operation to continue.
              </p>
            </div>

            <div className="grid gap-6 xl:grid-cols-3">
              <OperationCard
                href="/dashboard/expected-packages"
                badge="Pre-Alerts"
                title="Expected Packages"
                description="Register customer tracking numbers before packages arrive at the USA warehouse."
                action="Open Expected Packages"
                color="amber"
              />

              <OperationCard
                href="/dashboard/receive"
                badge="USA Warehouse"
                title="Receive Package"
                description="Receive packages in Wilmington, Delaware, match customer pre-alerts, generate SKY-PKG codes, and print QR labels."
                action="Open USA Receiving"
                color="sky"
              />

              <OperationCard
                href="/dashboard/lebanon-receive"
                badge="Lebanon Warehouse"
                title="Lebanon Receiving"
                description="Scan SkyShip QR labels, identify packages, and confirm their arrival in Lebanon."
                action="Open Lebanon Receiving"
                color="green"
              />
            </div>

            <div className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-7">
              <p className="text-sm font-bold uppercase tracking-wider text-slate-400">
                Live Workflow
              </p>

              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <StatusCard
                  number="01"
                  title="Customer Pre-Alert"
                  description="Expected tracking number is registered before arrival."
                />

                <StatusCard
                  number="02"
                  title="USA Receives"
                  description="Package receives a SKY-PKG code and live QR label."
                />

                <StatusCard
                  number="03"
                  title="Package Travels"
                  description="QR remains attached to the package throughout transit."
                />

                <StatusCard
                  number="04"
                  title="Lebanon Confirms"
                  description="Scan the QR and confirm receipt in the Lebanon warehouse."
                />
              </div>
            </div>

            <footer className="mt-10 border-t border-white/10 pt-6 text-center text-xs text-slate-500">
              SkyShip LLC • Warehouse Management Platform
            </footer>
          </section>
        </main>
      </div>
    </div>
  );
}

function OperationCard({
  href,
  badge,
  title,
  description,
  action,
  color,
}: {
  href: string;
  badge: string;
  title: string;
  description: string;
  action: string;
  color: "amber" | "sky" | "green";
}) {
  const colors = {
    amber: {
      border: "hover:border-amber-400/50",
      badge: "border-amber-400/30 bg-amber-400/10 text-amber-300",
      text: "text-amber-300",
    },
    sky: {
      border: "hover:border-sky-400/50",
      badge: "border-sky-400/30 bg-sky-400/10 text-sky-300",
      text: "text-sky-300",
    },
    green: {
      border: "hover:border-green-400/50",
      badge: "border-green-400/30 bg-green-400/10 text-green-300",
      text: "text-green-300",
    },
  };

  const style = colors[color];

  return (
    <Link
      href={href}
      className={`group rounded-3xl border border-white/10 bg-white/5 p-7 shadow-xl transition hover:-translate-y-1 hover:bg-white/10 ${style.border}`}
    >
      <div className="flex h-full flex-col">
        <div>
          <span
            className={`inline-flex rounded-xl border px-4 py-2 text-xs font-bold uppercase tracking-wider ${style.badge}`}
          >
            {badge}
          </span>

          <h3 className="mt-6 text-2xl font-black">
            {title}
          </h3>

          <p className="mt-4 leading-7 text-slate-300">
            {description}
          </p>
        </div>

        <div className="mt-10 flex items-center justify-between gap-3">
          <span className={`font-semibold ${style.text}`}>
            {action}
          </span>

          <span className="text-2xl transition group-hover:translate-x-2">
            →
          </span>
        </div>
      </div>
    </Link>
  );
}

function StatusCard({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-5">
      <p className="text-sm font-black text-sky-400">
        {number}
      </p>

      <h3 className="mt-2 text-lg font-bold">
        {title}
      </h3>

      <p className="mt-2 text-sm leading-6 text-slate-400">
        {description}
      </p>
    </div>
  );
}