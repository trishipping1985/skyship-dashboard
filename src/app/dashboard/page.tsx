"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";

type PreAlert = {
  id: string;
  tracking_number: string;
  customer_id?: string | null;
  customer_code?: string | null;
  carrier?: string | null;
  status?: string | null;
};

export default function ReceivePackagePage() {
  const [trackingNumber, setTrackingNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [preAlert, setPreAlert] = useState<PreAlert | null>(null);
  const [searched, setSearched] = useState(false);

  async function searchTracking(e: FormEvent) {
    e.preventDefault();

    const tracking = trackingNumber.trim();

    if (!tracking) {
      setMessage("Enter a tracking number.");
      return;
    }

    setLoading(true);
    setMessage("");
    setPreAlert(null);
    setSearched(false);

    const { data, error } = await supabase
      .from("package_prealerts")
      .select("*")
      .eq("tracking_number", tracking)
      .maybeSingle();

    if (error) {
      console.error(error);
      setMessage(error.message);
      setLoading(false);
      return;
    }

    setSearched(true);

    if (!data) {
      setMessage("No customer pre-alert found.");
      setLoading(false);
      return;
    }

    setPreAlert(data as PreAlert);
    setMessage("Customer pre-alert found.");
    setLoading(false);
  }

  async function receivePackage() {
    if (!preAlert) return;

    setLoading(true);
    setMessage("");

    const { error } = await supabase.from("packages").insert({
      tracking_number: preAlert.tracking_number,
      customer_id: preAlert.customer_id ?? null,
      customer_code: preAlert.customer_code ?? null,
      carrier: preAlert.carrier ?? null,
      source: "customer_prealert",
      status: "received",
      received_at: new Date().toISOString(),
    });

    if (error) {
      console.error(error);
      setMessage(error.message);
      setLoading(false);
      return;
    }

    await supabase
      .from("package_prealerts")
      .update({
        status: "received",
      })
      .eq("id", preAlert.id);

    setMessage("Package received successfully.");
    setPreAlert(null);
    setTrackingNumber("");
    setSearched(false);
    setLoading(false);
  }

  function resetSearch() {
    setTrackingNumber("");
    setPreAlert(null);
    setMessage("");
    setSearched(false);
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 text-white">
      <header className="border-b border-white/10 bg-white/5">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
          <div>
            <h1 className="text-3xl font-bold">SkyShip</h1>
            <p className="mt-1 text-sm text-slate-300">
              USA Warehouse • Wilmington, Delaware
            </p>
          </div>

          <Link
            href="/dashboard"
            className="rounded-xl border border-white/15 px-5 py-3 font-semibold transition hover:bg-white/10"
          >
            Back to Dashboard
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-6 py-12">
        <div className="mb-8">
          <h2 className="text-4xl font-bold">Receive Package</h2>

          <p className="mt-3 text-lg text-slate-300">
            Search the tracking number first. SkyShip will automatically check
            for a customer pre-alert.
          </p>
        </div>

        <form
          onSubmit={searchTracking}
          className="rounded-3xl border border-white/10 bg-white/5 p-7 shadow-2xl"
        >
          <label className="mb-3 block text-lg font-semibold">
            Carrier Tracking Number
          </label>

          <div className="flex flex-col gap-4 md:flex-row">
            <input
              type="text"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              placeholder="Enter or scan tracking number"
              autoFocus
              className="flex-1 rounded-xl border border-white/20 bg-slate-950/60 px-5 py-4 text-lg text-white outline-none placeholder:text-slate-500 focus:border-sky-400"
            />

            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-sky-500 px-8 py-4 text-lg font-bold text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Searching..." : "Search"}
            </button>
          </div>
        </form>

        {message && (
          <div
            className={`mt-6 rounded-2xl border p-5 ${
              preAlert
                ? "border-green-500/30 bg-green-500/10 text-green-200"
                : "border-white/10 bg-white/5 text-slate-200"
            }`}
          >
            {message}
          </div>
        )}

        {preAlert && (
          <div className="mt-6 rounded-3xl border border-green-500/30 bg-green-500/10 p-7">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wider text-green-300">
                  Pre-alert found
                </p>

                <h3 className="mt-2 text-2xl font-bold">
                  {preAlert.tracking_number}
                </h3>
              </div>

              <div className="rounded-full bg-green-500/20 px-4 py-2 text-sm font-bold text-green-300">
                MATCHED
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl bg-black/20 p-4">
                <p className="text-sm text-slate-400">Customer Code</p>
                <p className="mt-1 text-lg font-semibold">
                  {preAlert.customer_code || "Not assigned"}
                </p>
              </div>

              <div className="rounded-xl bg-black/20 p-4">
                <p className="text-sm text-slate-400">Carrier</p>
                <p className="mt-1 text-lg font-semibold">
                  {preAlert.carrier || "Not specified"}
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={receivePackage}
                disabled={loading}
                className="flex-1 rounded-xl bg-green-500 px-6 py-4 text-lg font-bold text-white transition hover:bg-green-400 disabled:opacity-50"
              >
                {loading ? "Receiving..." : "Receive Package"}
              </button>

              <button
                type="button"
                onClick={resetSearch}
                className="rounded-xl border border-white/20 px-6 py-4 font-semibold hover:bg-white/10"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {searched && !preAlert && (
          <div className="mt-6 rounded-3xl border border-amber-500/30 bg-amber-500/10 p-7">
            <p className="text-sm font-semibold uppercase tracking-wider text-amber-300">
              No Pre-Alert
            </p>

            <h3 className="mt-2 text-2xl font-bold">
              Tracking number not registered
            </h3>

            <p className="mt-2 text-slate-300">
              This package can be processed as a warehouse received package and
              assigned to a customer manually.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}