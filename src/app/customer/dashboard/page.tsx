"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

type CustomerProfile = {
  full_name: string | null;
  customer_code: string | null;
  role: string | null;
};

export default function CustomerDashboardPage() {
  const router = useRouter();
  const [profile, setProfile] =
    useState<CustomerProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadCustomer() {
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (!active) return;

        if (authError || !user) {
          router.replace("/login");
          return;
        }

        const { data, error } = await supabase
          .from("profiles")
          .select("full_name, customer_code, role")
          .eq("id", user.id)
          .single();

        if (!active) return;

        if (error || !data) {
          router.replace("/login");
          return;
        }

        if (data.role !== "client") {
          router.replace("/dashboard");
          return;
        }

        setProfile(data);
      } catch (error) {
        console.error(error);
        if (active) router.replace("/login");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadCustomer();

    return () => {
      active = false;
    };
  }, [router]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  if (loading || !profile) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        Checking your SkyShip account...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-white/10 bg-slate-900 px-6 py-5">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-sky-400">
              SKYSHIP
            </h1>
            <p className="text-xs text-slate-400">
              Beyond Limits. Delivered.
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="rounded-xl border border-white/20 px-5 py-2 font-semibold hover:bg-white/10"
          >
            Logout
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-10">
        <h2 className="text-3xl font-bold">
          Welcome, {profile.full_name || "Customer"}
        </h2>

        <p className="mt-2 text-slate-400">
          Manage your SkyShip shipping account.
        </p>

        <section className="mt-8 rounded-2xl border border-sky-500/30 bg-sky-500/10 p-6">
          <p className="text-sm text-slate-300">
            Your SkyShip Customer Code
          </p>

          <p className="mt-2 break-all text-3xl font-black text-sky-400">
            {profile.customer_code || "Pending assignment"}
          </p>
        </section>

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              title: "My Packages",
              description: "View your received shipments.",
            },
            {
              title: "Package Tracking",
              description: "Follow shipment progress.",
            },
            {
              title: "Expected Packages",
              description: "Manage upcoming deliveries.",
            },
            {
              title: "Package Photos",
              description: "View warehouse package images.",
            },
            {
              title: "Notifications",
              description: "Check shipping updates.",
            },
            {
              title: "My Profile",
              description: "Manage account information.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-white/10 bg-slate-900 p-6"
            >
              <h3 className="text-xl font-bold">
                {item.title}
              </h3>
              <p className="mt-3 text-sm text-slate-400">
                {item.description}
              </p>
              <p className="mt-5 text-xs font-semibold text-sky-400">
                Coming soon
              </p>
            </div>
          ))}
        </div>

        <p className="mt-10 text-center text-sm text-slate-500">
          SkyShip LLC — Beyond Limits. Delivered.
        </p>
      </div>
    </main>
  );
}