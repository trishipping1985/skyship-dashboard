"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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

const navigation = [
  {
    name: "Overview",
    href: "/dashboard",
    icon: "▦",
  },
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

export default function ExpectedPackagesPage() {
  const router = useRouter();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [preAlerts, setPreAlerts] = useState<PreAlert[]>([]);

  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [carrier, setCarrier] = useState("");

  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [loadingPreAlerts, setLoadingPreAlerts] = useState(true);
  const [saving, setSaving] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [logoutError, setLogoutError] = useState("");

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

  async function handleLogout() {
    setLoggingOut(true);
    setLogoutError("");

    const { error: signOutError } =
      await supabase.auth.signOut();

    if (signOutError) {
      setLogoutError(signOutError.message);
      setLoggingOut(false);
      return;
    }

    router.replace("/login");
    router.refresh();
  }

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
    const date = new Date(value);

    return Number.isNaN(date.getTime())
      ? "Not available"
      : date.toLocaleString();
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f2f9ff] via-[#e2f2ff] to-[#c8e8fa] text-[#073a68]">
      {menuOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setMenuOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[245px] flex-col bg-gradient-to-b from-[#0879c5] via-[#079cdd] to-[#065aab] px-4 py-6 text-white shadow-xl transition-transform lg:translate-x-0 ${
          menuOpen
            ? "translate-x-0"
            : "-translate-x-full"
        }`}
      >
        <div className="mb-8 flex flex-col items-center px-3 text-center">
          <img
            src="/images/skyship/skyship-logo.png"
            alt="SkyShip LLC"
            className="h-32 w-32 rounded-full object-contain shadow-xl"
          />

          <p className="mt-3 text-xs font-semibold text-white/90">
            Beyond Limits. Delivered.
          </p>
        </div>

        <p className="mb-3 px-4 text-xs font-bold uppercase tracking-widest text-white/70">
          Operations
        </p>

        <nav className="space-y-2">
          {navigation.map((item) => {
            const active =
              item.href === "/dashboard/expected-packages";

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                  active
                    ? "bg-white text-[#0866ae] shadow-lg"
                    : "text-white hover:bg-white/20"
                }`}
              >
                <span className="w-6 text-center text-xl">
                  {item.icon}
                </span>

                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto border-t border-white/25 pt-5">
          <div className="mb-4 rounded-xl bg-white/10 p-4">
            <p className="text-sm font-bold">
              SkyShip Operations
            </p>

            <p className="mt-1 text-xs text-white/80">
              USA • Lebanon
            </p>
          </div>

          {logoutError && (
            <p className="mb-3 text-sm text-red-100">
              {logoutError}
            </p>
          )}

          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold text-white transition hover:bg-white/20 disabled:opacity-50"
          >
            <span className="text-xl">↪</span>
            {loggingOut ? "Signing out..." : "Logout"}
          </button>
        </div>
      </aside>

      <div className="min-h-screen lg:ml-[245px]">
        <header className="sticky top-0 z-30 border-b border-sky-200 bg-white/75 shadow-sm backdrop-blur-xl">
          <div className="flex min-h-[70px] items-center justify-between gap-4 px-5 sm:px-8">
            <div className="flex items-center gap-3">
              <button
                type="button"
                aria-label="Open navigation"
                onClick={() => setMenuOpen(true)}
                className="rounded-lg p-2 text-sky-700 lg:hidden"
              >
                ☰
              </button>

              <span className="text-2xl text-sky-600">
                ◫
              </span>

              <h1 className="text-base font-black sm:text-xl">
                Expected Packages
              </h1>
            </div>

            <Link
              href="/dashboard"
              className="rounded-xl border border-sky-200 bg-white px-4 py-2 text-sm font-bold text-sky-700 transition hover:bg-sky-50"
            >
              Back to Dashboard
            </Link>
          </div>
        </header>

        <main className="mx-auto max-w-[1500px] space-y-6 p-4 sm:p-6 lg:p-7">
          <section
            className="relative overflow-hidden rounded-[22px] border border-sky-200 bg-[#d9f3ff] shadow-[0_8px_28px_rgba(24,113,177,0.12)]"
            style={{
              backgroundImage:
                "linear-gradient(90deg,rgba(226,247,255,0.99) 0%,rgba(226,247,255,0.94) 35%,rgba(226,247,255,0.10) 85%),url('/images/skyship/skyship-banner.png')",
              backgroundSize: "contain",
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right center",
            }}
          >
            <div className="relative max-w-xl px-6 py-8 sm:px-10 sm:py-10">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-sky-700">
                SkyShip Operations
              </p>

              <h2 className="mt-3 text-3xl font-black tracking-tight text-[#073a68] sm:text-4xl">
                Expected Packages
              </h2>

              <p className="mt-3 text-sm font-medium text-[#073a68] sm:text-base">
                Register incoming shipments before they
                arrive at our Wilmington, Delaware
                warehouse.
              </p>

              <a
                href="#register-package"
                className="mt-6 inline-flex items-center gap-3 rounded-xl bg-gradient-to-r from-[#06a9ee] to-[#087cdb] px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:brightness-105"
              >
                + Register Package
              </a>
            </div>
          </section>

          <section className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black text-[#073a68]">
                Pre-Alert Management
              </h2>

              <p className="mt-1 text-sm text-slate-600">
                Manage customer shipments awaiting USA
                warehouse arrival.
              </p>
            </div>

            <div className="rounded-2xl border border-sky-200 bg-white/85 px-6 py-4 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Awaiting Arrival
              </p>

              <p className="mt-1 text-3xl font-black text-sky-700">
                {loadingPreAlerts ? "..." : preAlerts.length}
              </p>
            </div>
          </section>

          <div className="grid items-start gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <section
              id="register-package"
              className="rounded-[22px] border border-sky-200 bg-white/90 p-6 shadow-[0_8px_28px_rgba(24,113,177,0.10)] sm:p-7"
            >
              <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-600">
                New Pre-Alert
              </p>

              <h2 className="mt-2 text-2xl font-black text-[#073a68] sm:text-3xl">
                Add Expected Package
              </h2>

              <p className="mt-3 text-sm leading-6 text-slate-600">
                Select a customer and register their
                carrier tracking number.
              </p>

              <form
                onSubmit={createPreAlert}
                className="mt-7 space-y-5"
              >
                <div>
                  <label
                    htmlFor="expected-customer"
                    className="mb-2 block text-sm font-bold text-[#073a68]"
                  >
                    Customer
                  </label>

                  <select
                    id="expected-customer"
                    value={selectedCustomer}
                    onChange={(e) =>
                      setSelectedCustomer(e.target.value)
                    }
                    disabled={loadingCustomers || saving}
                    className="w-full rounded-xl border border-sky-200 bg-white px-4 py-3.5 text-[#073a68] outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 disabled:opacity-50"
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
                        {customer.customer_code || "NO CODE"}
                        {" — "}
                        {customer.full_name ||
                          customer.email ||
                          "Unnamed Customer"}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="expected-tracking"
                    className="mb-2 block text-sm font-bold text-[#073a68]"
                  >
                    Tracking Number
                  </label>

                  <input
                    id="expected-tracking"
                    type="text"
                    value={trackingNumber}
                    onChange={(e) =>
                      setTrackingNumber(e.target.value)
                    }
                    disabled={saving}
                    placeholder="Enter carrier tracking number"
                    className="w-full rounded-xl border border-sky-200 bg-white px-4 py-3.5 text-[#073a68] outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 disabled:opacity-50"
                  />
                </div>

                <div>
                  <label
                    htmlFor="expected-carrier"
                    className="mb-2 block text-sm font-bold text-[#073a68]"
                  >
                    Carrier
                  </label>

                  <input
                    id="expected-carrier"
                    type="text"
                    value={carrier}
                    onChange={(e) =>
                      setCarrier(e.target.value)
                    }
                    disabled={saving}
                    placeholder="FedEx, UPS, DHL, USPS..."
                    className="w-full rounded-xl border border-sky-200 bg-white px-4 py-3.5 text-[#073a68] outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 disabled:opacity-50"
                  />
                </div>

                {error && (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    <p className="font-black">Error</p>
                    <p className="mt-1 break-words">{error}</p>
                  </div>
                )}

                {message && (
                  <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
                    <p className="font-black">
                      Pre-Alert Created
                    </p>
                    <p className="mt-1">{message}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={saving || loadingCustomers}
                  className="w-full rounded-xl bg-gradient-to-r from-[#06a9ee] to-[#087cdb] px-6 py-4 text-base font-black text-white shadow-lg transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving
                    ? "Adding Expected Package..."
                    : "Add Expected Package"}
                </button>
              </form>
            </section>

            <section className="rounded-[22px] border border-sky-200 bg-white/90 p-6 shadow-[0_8px_28px_rgba(24,113,177,0.10)] sm:p-7">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-600">
                    Awaiting Arrival
                  </p>

                  <h2 className="mt-2 text-2xl font-black text-[#073a68] sm:text-3xl">
                    Current Expected Packages
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    void loadExpectedPackages()
                  }
                  disabled={loadingPreAlerts}
                  className="rounded-xl border border-sky-200 bg-white px-5 py-3 text-sm font-bold text-sky-700 transition hover:bg-sky-50 disabled:opacity-50"
                >
                  {loadingPreAlerts
                    ? "Refreshing..."
                    : "↻ Refresh"}
                </button>
              </div>

              {loadingPreAlerts ? (
                <div className="mt-7 rounded-2xl border border-sky-100 bg-sky-50 p-5 text-sm text-slate-600">
                  Loading expected packages...
                </div>
              ) : preAlerts.length === 0 ? (
                <div className="mt-7 rounded-2xl border border-sky-100 bg-sky-50 p-6 text-sm text-slate-600">
                  No expected packages are currently
                  waiting for warehouse arrival.
                </div>
              ) : (
                <div className="mt-7 space-y-4">
                  {preAlerts.map((preAlert) => {
                    const customer = customerLabel(
                      preAlert.customer_id
                    );

                    return (
                      <div
                        key={preAlert.id}
                        className="rounded-2xl border border-sky-200 bg-gradient-to-br from-white to-[#edf8ff] p-5 shadow-sm"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div className="min-w-0">
                            <p className="text-xs font-black uppercase tracking-wider text-sky-600">
                              {customer.code}
                            </p>

                            <h3 className="mt-2 break-all text-lg font-black text-[#073a68] sm:text-xl">
                              {preAlert.tracking_number}
                            </h3>

                            <p className="mt-2 text-sm text-slate-600">
                              {customer.name}
                            </p>
                          </div>

                          <span className="rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-black uppercase tracking-wider text-amber-700">
                            Expected
                          </span>
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
            </section>
          </div>

          <footer className="border-t border-sky-200 py-5 text-center text-xs font-semibold text-slate-500">
            SkyShip LLC — Beyond Limits. Delivered.
          </footer>
        </main>
      </div>
    </div>
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
    <div className="rounded-xl border border-sky-100 bg-white/85 p-4">
      <p className="text-xs font-black uppercase tracking-wider text-slate-500">
        {title}
      </p>

      <p className="mt-2 break-words text-sm font-semibold text-[#073a68]">
        {value}
      </p>
    </div>
  );
}