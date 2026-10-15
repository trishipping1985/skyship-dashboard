"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";

type Customer = {
  id: string;
  customer_code: string | null;
  full_name: string | null;
  email: string | null;
};

type PreAlert = {
  id: string;
  customer_id: string | null;
  tracking_number: string;
  carrier: string | null;
  status: string;
  created_at: string;
};

export default function ExpectedPackagesPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [preAlerts, setPreAlerts] = useState<PreAlert[]>([]);

  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [carrier, setCarrier] = useState("");

  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [loadingPreAlerts, setLoadingPreAlerts] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const customerMap = useMemo(() => {
    return new Map(
      customers.map((customer) => [
        customer.id,
        customer,
      ])
    );
  }, [customers]);

  const loadCustomers = useCallback(async () => {
    setLoadingCustomers(true);

    const { data, error: loadError } = await supabase
      .from("profiles")
      .select("id, customer_code, full_name, email")
      .order("customer_code", { ascending: true });

    if (loadError) {
      console.error("CUSTOMER LOAD ERROR:", loadError);
      setError(`CUSTOMER ERROR: ${loadError.message}`);
      setLoadingCustomers(false);
      return;
    }

    setCustomers((data as Customer[]) || []);
    setLoadingCustomers(false);
  }, []);

  const loadExpectedPackages = useCallback(async () => {
    setLoadingPreAlerts(true);

    const { data, error: loadError } = await supabase
      .from("package_prealerts")
      .select(
        `
          id,
          customer_id,
          tracking_number,
          carrier,
          status,
          created_at
        `
      )
      .eq("status", "expected")
      .order("created_at", { ascending: false });

    if (loadError) {
      console.error("PRE-ALERT LOAD ERROR:", loadError);
      setError(`PRE-ALERT ERROR: ${loadError.message}`);
      setLoadingPreAlerts(false);
      return;
    }

    setPreAlerts((data as PreAlert[]) || []);
    setLoadingPreAlerts(false);
  }, []);

  useEffect(() => {
    void loadCustomers();
    void loadExpectedPackages();
  }, [loadCustomers, loadExpectedPackages]);

  async function createPreAlert(
    e: FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    setMessage("");
    setError("");

    const cleanTrackingNumber = trackingNumber.trim();
    const cleanCarrier = carrier.trim();

    if (!selectedCustomer) {
      setError("Select a SkyShip customer.");
      return;
    }

    if (!cleanTrackingNumber) {
      setError("Enter the expected tracking number.");
      return;
    }

    setSaving(true);

    try {
      const { data: existing, error: existingError } =
        await supabase
          .from("package_prealerts")
          .select("id, tracking_number, status")
          .eq("tracking_number", cleanTrackingNumber)
          .limit(1)
          .maybeSingle();

      if (existingError) {
        console.error(
          "PRE-ALERT DUPLICATE CHECK ERROR:",
          existingError
        );

        setError(
          `CHECK ERROR: ${existingError.message}`
        );

        return;
      }

      if (existing) {
        setError(
          `Tracking number ${cleanTrackingNumber} is already registered as a pre-alert.`
        );
        return;
      }

      const { data, error: insertError } =
        await supabase
          .from("package_prealerts")
          .insert({
            customer_id: selectedCustomer,
            tracking_number: cleanTrackingNumber,
            carrier: cleanCarrier || null,
            status: "expected",
          })
          .select(
            `
              id,
              customer_id,
              tracking_number,
              carrier,
              status,
              created_at
            `
          )
          .single();

      if (insertError) {
        console.error(
          "PRE-ALERT INSERT ERROR:",
          insertError
        );

        setError(
          `SAVE ERROR: ${insertError.message}`
        );

        return;
      }

      setPreAlerts((current) => [
        data as PreAlert,
        ...current,
      ]);

      setMessage(
        `Expected package ${data.tracking_number} added successfully.`
      );

      setTrackingNumber("");
      setCarrier("");
      setSelectedCustomer("");
    } catch (err) {
      console.error(err);

      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(
          "An unexpected error occurred while creating the pre-alert."
        );
      }
    } finally {
      setSaving(false);
    }
  }

  function customerLabel(customerId: string | null) {
    if (!customerId) {
      return {
        code: "NO CUSTOMER",
        name: "Not assigned",
      };
    }

    const customer = customerMap.get(customerId);

    if (!customer) {
      return {
        code: "UNKNOWN",
        name: "Customer record unavailable",
      };
    }

    return {
      code: customer.customer_code || "NO CODE",
      name:
        customer.full_name ||
        customer.email ||
        "Unnamed Customer",
    };
  }

  function formatDate(value: string) {
    return new Date(value).toLocaleString();
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 text-white">
      <header className="border-b border-white/10 bg-white/5">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-6">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-sky-400">
              SkyShip Operations
            </p>

            <h1 className="mt-2 text-3xl font-black">
              Expected Packages
            </h1>

            <p className="mt-1 text-sm text-slate-300">
              Customer pre-alert management
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

      <section className="mx-auto max-w-7xl px-6 py-12">
        <div className="grid gap-8 xl:grid-cols-[0.9fr_1.1fr]">
          <div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-7 shadow-2xl">
              <p className="text-sm font-bold uppercase tracking-wider text-sky-400">
                New Pre-Alert
              </p>

              <h2 className="mt-2 text-3xl font-black">
                Add Expected Package
              </h2>

              <p className="mt-3 text-slate-300">
                Register a customer package before it reaches
                the Wilmington warehouse.
              </p>

              <form
                onSubmit={createPreAlert}
                className="mt-8 space-y-5"
              >
                <div>
                  <label className="mb-2 block font-semibold">
                    Customer
                  </label>

                  <select
                    value={selectedCustomer}
                    onChange={(e) =>
                      setSelectedCustomer(e.target.value)
                    }
                    disabled={loadingCustomers || saving}
                    className="w-full rounded-xl border border-white/20 bg-slate-950/70 px-5 py-4 text-white outline-none focus:border-sky-400 disabled:opacity-50"
                  >
                    <option value="">
                      {loadingCustomers
                        ? "Loading customers..."
                        : "Select customer"}
                    </option>

                    {customers.map((customer) => (
                      <option
                        key={customer.id}
                        value={customer.id}
                      >
                        {customer.customer_code ||
                          "NO CODE"}{" "}
                        —{" "}
                        {customer.full_name ||
                          customer.email ||
                          "Unnamed Customer"}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block font-semibold">
                    Tracking Number
                  </label>

                  <input
                    type="text"
                    value={trackingNumber}
                    onChange={(e) =>
                      setTrackingNumber(e.target.value)
                    }
                    disabled={saving}
                    placeholder="Enter carrier tracking number"
                    className="w-full rounded-xl border border-white/20 bg-slate-950/70 px-5 py-4 text-lg outline-none focus:border-sky-400 disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="mb-2 block font-semibold">
                    Carrier
                  </label>

                  <input
                    type="text"
                    value={carrier}
                    onChange={(e) =>
                      setCarrier(e.target.value)
                    }
                    disabled={saving}
                    placeholder="FedEx, UPS, DHL, USPS..."
                    className="w-full rounded-xl border border-white/20 bg-slate-950/70 px-5 py-4 outline-none focus:border-sky-400 disabled:opacity-50"
                  />
                </div>

                {error && (
                  <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-red-200">
                    <p className="font-bold">
                      ERROR
                    </p>

                    <p className="mt-1 break-words">
                      {error}
                    </p>
                  </div>
                )}

                {message && (
                  <div className="rounded-2xl border border-green-500/40 bg-green-500/10 p-4 text-green-200">
                    <p className="font-bold">
                      PRE-ALERT CREATED
                    </p>

                    <p className="mt-1">
                      {message}
                    </p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={saving || loadingCustomers}
                  className="w-full rounded-xl bg-sky-500 px-6 py-4 text-lg font-black text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving
                    ? "Adding Expected Package..."
                    : "Add Expected Package"}
                </button>
              </form>
            </div>
          </div>

          <div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-7 shadow-2xl">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                  <p className="text-sm font-bold uppercase tracking-wider text-green-400">
                    Awaiting Arrival
                  </p>

                  <h2 className="mt-2 text-3xl font-black">
                    Current Expected Packages
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    void loadExpectedPackages()
                  }
                  disabled={loadingPreAlerts}
                  className="rounded-xl border border-white/15 px-5 py-3 font-semibold transition hover:bg-white/10 disabled:opacity-50"
                >
                  {loadingPreAlerts
                    ? "Refreshing..."
                    : "Refresh"}
                </button>
              </div>

              {loadingPreAlerts ? (
                <div className="mt-8 rounded-2xl border border-white/10 bg-slate-950/40 p-5 text-slate-300">
                  Loading expected packages...
                </div>
              ) : preAlerts.length === 0 ? (
                <div className="mt-8 rounded-2xl border border-white/10 bg-slate-950/40 p-6 text-slate-300">
                  No expected packages are currently waiting
                  for warehouse arrival.
                </div>
              ) : (
                <div className="mt-8 space-y-4">
                  {preAlerts.map((preAlert) => {
                    const customer = customerLabel(
                      preAlert.customer_id
                    );

                    return (
                      <div
                        key={preAlert.id}
                        className="rounded-2xl border border-white/10 bg-slate-950/40 p-5"
                      >
                        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                          <div>
                            <p className="text-sm font-bold uppercase tracking-wider text-sky-400">
                              {customer.code}
                            </p>

                            <h3 className="mt-2 break-all text-xl font-black">
                              {preAlert.tracking_number}
                            </h3>

                            <p className="mt-1 text-slate-300">
                              {customer.name}
                            </p>
                          </div>

                          <div className="w-fit rounded-full border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-xs font-black uppercase tracking-wider text-amber-300">
                            Expected
                          </div>
                        </div>

                        <div className="mt-5 grid gap-3 sm:grid-cols-2">
                          <InfoBox
                            title="Carrier"
                            value={
                              preAlert.carrier ||
                              "Not specified"
                            }
                          />

                          <InfoBox
                            title="Created"
                            value={formatDate(
                              preAlert.created_at
                            )}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function InfoBox({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-4">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
        {title}
      </p>

      <p className="mt-1 break-words font-semibold text-slate-200">
        {value}
      </p>
    </div>
  );
}