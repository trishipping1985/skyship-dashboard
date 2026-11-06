"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

type PreAlert = {
  id: string;
  tracking_number: string;
  carrier: string | null;
  status: string;
  created_at: string;
};

export default function CustomerExpectedPackagesPage() {
  const router = useRouter();

  const [customerId, setCustomerId] = useState("");
  const [packages, setPackages] = useState<PreAlert[]>([]);
  const [tracking, setTracking] = useState("");
  const [carrier, setCarrier] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadPackages = useCallback(async (id: string) => {
    const { data, error: loadError } = await supabase
      .from("package_prealerts")
      .select(
        "id, tracking_number, carrier, status, created_at"
      )
      .eq("customer_id", id)
      .order("created_at", { ascending: false });

    if (loadError) {
      throw new Error(loadError.message);
    }

    setPackages((data || []) as PreAlert[]);
  }, []);

  useEffect(() => {
    let active = true;

    async function initialize() {
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

        const { data: profile, error: profileError } =
          await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single();

        if (!active) return;

        if (profileError) {
          throw new Error(profileError.message);
        }

        if (profile?.role !== "client") {
          router.replace("/dashboard");
          return;
        }

        setCustomerId(user.id);
        await loadPackages(user.id);
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load expected packages."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void initialize();

    return () => {
      active = false;
    };
  }, [router, loadPackages]);

  async function createPreAlert(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setError("");
    setMessage("");

    const cleanTracking = tracking.trim();
    const cleanCarrier = carrier.trim();

    if (!customerId) {
      setError("Your customer account is not ready.");
      return;
    }

    if (!cleanTracking) {
      setError("Please enter your tracking number.");
      return;
    }

    setSaving(true);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user || user.id !== customerId) {
        throw new Error(
          "Your session has expired. Please log in again."
        );
      }

      const { error: insertError } = await supabase
        .from("package_prealerts")
        .insert({
          customer_id: user.id,
          tracking_number: cleanTracking,
          carrier: cleanCarrier || null,
          status: "expected",
        });

      if (insertError) {
        if (insertError.code === "23505") {
          throw new Error(
            "This tracking number is already registered."
          );
        }
        throw new Error(insertError.message);
      }

      setTracking("");
      setCarrier("");
      setMessage(
        "Your expected package was registered successfully."
      );

      await loadPackages(user.id);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to register your package."
      );
    } finally {
      setSaving(false);
    }
  }

  async function refreshPackages() {
    if (!customerId) return;

    setRefreshing(true);
    setError("");

    try {
      await loadPackages(customerId);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to refresh packages."
      );
    } finally {
      setRefreshing(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        Loading SkyShip Expected Packages...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 text-white">
      <header className="border-b border-white/10 bg-slate-900/80">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-6">
          <div>
            <h1 className="text-2xl font-black text-sky-400">
              SKYSHIP
            </h1>
            <p className="text-xs text-slate-400">
              Beyond Limits. Delivered.
            </p>
          </div>

          <Link
            href="/customer/dashboard"
            className="rounded-xl border border-white/20 px-5 py-3 font-semibold hover:bg-white/10"
          >
            Back to Dashboard
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-10">
        <h2 className="text-3xl font-black">
          Expected Packages
        </h2>

        <p className="mt-3 text-slate-300">
          Register incoming shipments before they arrive
          at our Wilmington, Delaware warehouse.
        </p>

        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <h3 className="text-2xl font-bold">
              Register New Package
            </h3>

            <p className="mt-2 text-sm text-slate-400">
              Your SkyShip account is linked automatically.
              No customer code is required.
            </p>

            <form
              onSubmit={createPreAlert}
              className="mt-7 space-y-5"
            >
              <div>
                <label className="mb-2 block font-semibold">
                  Tracking Number
                </label>

                <input
                  value={tracking}
                  onChange={(e) =>
                    setTracking(e.target.value)
                  }
                  placeholder="Enter carrier tracking number"
                  required
                  disabled={saving}
                  className="w-full rounded-xl border border-white/20 bg-slate-950 px-4 py-4 text-white outline-none focus:border-sky-400 disabled:opacity-50"
                />
              </div>

              <div>
                <label className="mb-2 block font-semibold">
                  Carrier
                </label>

                <select
                  value={carrier}
                  onChange={(e) =>
                    setCarrier(e.target.value)
                  }
                  disabled={saving}
                  className="w-full rounded-xl border border-white/20 bg-slate-950 px-4 py-4 text-white outline-none focus:border-sky-400 disabled:opacity-50"
                >
                  <option value="">Select carrier</option>
                  <option value="FedEx">FedEx</option>
                  <option value="UPS">UPS</option>
                  <option value="DHL">DHL</option>
                  <option value="USPS">USPS</option>
                  <option value="Amazon Logistics">
                    Amazon Logistics
                  </option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {error && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-300">
                  {error}
                </div>
              )}

              {message && (
                <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-green-300">
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={saving || !customerId}
                className="w-full rounded-xl bg-sky-500 px-5 py-4 font-black text-white transition hover:bg-sky-400 disabled:opacity-50"
              >
                {saving
                  ? "Registering Package..."
                  : "Register Expected Package"}
              </button>
            </form>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-2xl font-bold">
                My Expected Packages
              </h3>

              <button
                type="button"
                onClick={() => void refreshPackages()}
                disabled={refreshing}
                className="rounded-xl border border-white/20 px-4 py-2 text-sm font-semibold hover:bg-white/10 disabled:opacity-50"
              >
                {refreshing ? "Refreshing..." : "Refresh"}
              </button>
            </div>

            {packages.length === 0 ? (
              <p className="mt-8 text-slate-400">
                No expected packages registered yet.
              </p>
            ) : (
              <div className="mt-6 space-y-4">
                {packages.map((pkg) => (
                  <div
                    key={pkg.id}
                    className="rounded-2xl border border-white/10 bg-slate-950/60 p-5"
                  >
                    <p className="break-all text-lg font-black text-sky-400">
                      {pkg.tracking_number}
                    </p>

                    <p className="mt-2 text-sm text-slate-300">
                      Carrier: {pkg.carrier || "Not specified"}
                    </p>

                    <p className="mt-2 text-sm text-slate-300">
                      Status:{" "}
                      <span className="font-bold uppercase text-amber-300">
                        {pkg.status}
                      </span>
                    </p>

                    <p className="mt-3 text-xs text-slate-500">
                      Registered:{" "}
                      {new Date(
                        pkg.created_at
                      ).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <p className="mt-10 text-center text-sm text-slate-500">
          SkyShip LLC — Beyond Limits. Delivered.
        </p>
      </section>
    </main>
  );
}