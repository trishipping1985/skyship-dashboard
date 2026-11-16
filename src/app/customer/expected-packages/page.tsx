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

  function formatDate(value: string) {
    const date = new Date(value);

    return Number.isNaN(date.getTime())
      ? "Not available"
      : date.toLocaleString();
  }

  const inputClass =
    "w-full rounded-xl border border-sky-200 " +
    "bg-white px-4 py-4 text-[#073a68] " +
    "placeholder:text-slate-400 outline-none " +
    "transition focus:border-sky-500 " +
    "focus:ring-2 focus:ring-sky-100 " +
    "disabled:opacity-50";

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#f8fdff] via-[#eaf8ff] to-[#cdefff] px-6">
        <div className="text-center">
          <h1 className="text-4xl font-black italic text-[#087cdb]">
            SKYSHIP
          </h1>
          <p className="mt-3 text-[#52718c]">
            Loading Expected Packages...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#f8fdff] via-[#eaf8ff] to-[#cdefff] text-[#073a68]">
      <header className="border-b border-sky-100 bg-white/90 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-5 sm:px-8">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#19b9f4] to-[#087cdb] shadow-md">
              <span className="text-2xl font-black italic text-white">
                S
              </span>
            </div>

            <div>
              <h1 className="text-2xl font-black italic tracking-tight text-[#087cdb]">
                SKYSHIP
              </h1>
              <p className="text-xs font-semibold italic text-[#52718c]">
                Beyond Limits. Delivered.
              </p>
            </div>
          </div>

          <Link
            href="/customer/dashboard"
            className="inline-flex items-center justify-center rounded-xl border border-sky-200 bg-white px-5 py-3 text-sm font-bold text-[#087cdb] shadow-sm transition hover:bg-sky-50"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-12">
        <div className="overflow-hidden rounded-[24px] border border-sky-100 bg-gradient-to-r from-[#dff5ff] via-[#eaf8ff] to-[#bceaff] px-6 py-8 shadow-[0_8px_28px_rgba(14,130,200,0.08)] sm:px-10">
          <div className="flex flex-wrap items-center justify-between gap-5">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#087cdb]">
                SkyShip Customer Portal
              </p>

              <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
                Expected Packages
              </h2>

              <p className="mt-3 max-w-xl text-sm font-medium leading-6 text-[#426782] sm:text-base">
                Register incoming shipments before they
                arrive at our Wilmington, Delaware
                warehouse.
              </p>
            </div>

            <div className="rounded-2xl border border-white/80 bg-white/75 px-6 py-4 text-center shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wide text-[#52718c]">
                Registered Packages
              </p>

              <p className="mt-1 text-4xl font-black text-[#087cdb]">
                {packages.length}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-7 grid items-start gap-6 lg:grid-cols-2">
          <section className="overflow-hidden rounded-[24px] border border-sky-100 bg-white/95 shadow-[0_8px_28px_rgba(14,130,200,0.09)]">
            <div className="border-b border-sky-100 bg-gradient-to-r from-[#f5fcff] to-[#e7f7ff] px-6 py-6">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#16b5f2] to-[#087cdb] text-xl font-black text-white shadow-sm">
                  +
                </span>

                <h3 className="text-xl font-black sm:text-2xl">
                  Register New Package
                </h3>
              </div>

              <p className="mt-3 text-sm leading-6 text-[#52718c]">
                Your SkyShip account is linked
                automatically. No customer code is
                required in your shipping address.
              </p>
            </div>

            <form
              onSubmit={createPreAlert}
              className="space-y-6 p-6"
            >
              <div>
                <label
                  htmlFor="tracking"
                  className="mb-2 block text-sm font-bold text-[#073a68]"
                >
                  Tracking Number
                </label>

                <input
                  id="tracking"
                  type="text"
                  autoComplete="off"
                  maxLength={200}
                  value={tracking}
                  onChange={(event) =>
                    setTracking(event.target.value)
                  }
                  placeholder="Enter carrier tracking number"
                  required
                  disabled={saving}
                  className={inputClass}
                />

                <p className="mt-2 text-xs text-[#64829a]">
                  Enter the tracking number provided by
                  your seller or shipping carrier.
                </p>
              </div>

              <div>
                <label
                  htmlFor="carrier"
                  className="mb-2 block text-sm font-bold text-[#073a68]"
                >
                  Shipping Carrier
                </label>

                <select
                  id="carrier"
                  value={carrier}
                  onChange={(event) =>
                    setCarrier(event.target.value)
                  }
                  disabled={saving}
                  className={inputClass}
                >
                  <option value="">
                    Select carrier
                  </option>
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
                <div
                  role="alert"
                  className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700"
                >
                  {error}
                </div>
              )}

              {message && (
                <div
                  role="status"
                  className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-medium text-green-800"
                >
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={saving || !customerId}
                className="w-full rounded-xl bg-gradient-to-r from-[#08b4ee] to-[#087cdb] px-6 py-4 text-base font-black text-white shadow-[0_6px_16px_rgba(8,124,219,0.22)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving
                  ? "Registering Package..."
                  : "Register Expected Package"}
              </button>
            </form>
          </section>

          <section className="overflow-hidden rounded-[24px] border border-sky-100 bg-white/95 shadow-[0_8px_28px_rgba(14,130,200,0.09)]">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-sky-100 bg-gradient-to-r from-[#f5fcff] to-[#e7f7ff] px-6 py-6">
              <div>
                <h3 className="text-xl font-black sm:text-2xl">
                  My Expected Packages
                </h3>

                <p className="mt-2 text-sm text-[#52718c]">
                  Track packages registered with your
                  SkyShip account.
                </p>
              </div>

              <button
                type="button"
                onClick={() => void refreshPackages()}
                disabled={refreshing || !customerId}
                className="rounded-xl border border-sky-200 bg-white px-5 py-3 text-sm font-bold text-[#087cdb] shadow-sm transition hover:bg-sky-50 disabled:opacity-50"
              >
                {refreshing ? "Refreshing..." : "Refresh"}
              </button>
            </div>

            <div className="p-6">
              {packages.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-sky-200 bg-gradient-to-b from-[#f8fdff] to-[#edf9ff] px-5 py-12 text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-100 text-3xl">
                    📦
                  </div>

                  <h4 className="mt-5 text-lg font-black">
                    No Expected Packages Yet
                  </h4>

                  <p className="mx-auto mt-3 max-w-xs text-sm leading-6 text-[#52718c]">
                    Once you register a tracking number,
                    your expected shipment will appear
                    here.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {packages.map((pkg) => (
                    <article
                      key={pkg.id}
                      className="rounded-2xl border border-sky-100 bg-gradient-to-r from-[#f8fdff] to-[#edf9ff] p-5 shadow-sm"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs font-bold uppercase tracking-wide text-[#64829a]">
                            Tracking Number
                          </p>

                          <p className="mt-2 break-all text-lg font-black text-[#087cdb]">
                            {pkg.tracking_number}
                          </p>
                        </div>

                        <span className="rounded-full border border-sky-200 bg-sky-100 px-3 py-1.5 text-xs font-extrabold uppercase text-[#087cdb]">
                          {pkg.status.replace(/_/g, " ")}
                        </span>
                      </div>

                      <div className="mt-5 grid gap-3 border-t border-sky-100 pt-4 sm:grid-cols-2">
                        <div>
                          <p className="text-xs font-bold text-[#64829a]">
                            Carrier
                          </p>

                          <p className="mt-1 text-sm font-bold text-[#073a68]">
                            {pkg.carrier || "Not specified"}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs font-bold text-[#64829a]">
                            Registered
                          </p>

                          <p className="mt-1 text-sm font-semibold text-[#073a68]">
                            {formatDate(pkg.created_at)}
                          </p>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>

        <div className="mt-8 rounded-2xl border border-sky-100 bg-white/75 px-6 py-5 text-center text-sm text-[#52718c]">
          Your shipment will be matched to your account
          using its carrier tracking number when it is
          received at our USA warehouse.
        </div>

        <footer className="py-8 text-center text-xs font-semibold text-[#64829a]">
          SkyShip LLC — Beyond Limits. Delivered.
        </footer>
      </section>
    </main>
  );
}