"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

type IconName =
  | "home"
  | "calendar"
  | "warehouse"
  | "package"
  | "shipments"
  | "logout"
  | "menu"
  | "arrow"
  | "check";

type ShipmentStatus =
  | "received"
  | "shipped"
  | "in_transit"
  | "received_in_lebanon"
  | "out_for_delivery"
  | "delivered";

type PackageRecord = {
  id: string;
  sky_code: string | null;
  package_code: string | null;
  carrier_tracking_number: string | null;
  tracking_number: string | null;
  customer_code: string | null;
  carrier: string | null;
  status: string | null;
  lebanon_received_at: string | null;
};

const PAGE_SIZE = 25;

const PACKAGE_FIELDS =
  "id, sky_code, package_code, carrier_tracking_number, tracking_number, customer_code, carrier, status, lebanon_received_at";

const SHIPMENT_STATUSES: {
  value: ShipmentStatus;
  label: string;
  description: string;
}[] = [
  {
    value: "received",
    label: "Received in USA",
    description: "Packages received at the USA warehouse.",
  },
  {
    value: "shipped",
    label: "Shipped",
    description: "Packages shipped from the USA warehouse.",
  },
  {
    value: "in_transit",
    label: "In Transit",
    description: "Packages currently traveling toward Lebanon.",
  },
  {
    value: "received_in_lebanon",
    label: "Received in Lebanon",
    description: "Packages confirmed at the Lebanon warehouse.",
  },
  {
    value: "out_for_delivery",
    label: "Out for Delivery",
    description: "Packages assigned to the delivery stage.",
  },
  {
    value: "delivered",
    label: "Delivered",
    description: "Packages marked as delivered.",
  },
];

const navigation: {
  name: string;
  href: string;
  icon: IconName;
}[] = [
  {
    name: "Overview",
    href: "/dashboard",
    icon: "home",
  },
  {
    name: "Expected Packages",
    href: "/dashboard/expected-packages",
    icon: "calendar",
  },
  {
    name: "USA Receiving",
    href: "/dashboard/receive",
    icon: "warehouse",
  },
  {
    name: "Lebanon Receiving",
    href: "/dashboard/lebanon-receive",
    icon: "package",
  },
  {
    name: "Shipment Management",
    href: "/dashboard/shipments",
    icon: "shipments",
  },
];

function Icon({
  name,
  size = 22,
}: {
  name: IconName;
  size?: number;
}) {
  const paths: Record<IconName, React.ReactNode> = {
    home: (
      <>
        <path d="m3 10 9-7 9 7v11H3V10Z" />
        <path d="M9 21v-8h6v8" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M7 3v4M17 3v4M3 10h18" />
      </>
    ),
    warehouse: (
      <>
        <path d="m3 9 9-6 9 6v12H3V9Z" />
        <path d="M7 21v-9h10v9M7 15h10M7 18h10" />
      </>
    ),
    package: (
      <>
        <path d="m3 7 9-4 9 4v10l-9 4-9-4V7Z" />
        <path d="m3 7 9 5 9-5M12 12v9" />
      </>
    ),
    shipments: (
      <>
        <path d="M3 17h18M5 17V8h14v9" />
        <path d="M8 8V5h8v3M9 12h6" />
        <circle cx="8" cy="19" r="2" />
        <circle cx="16" cy="19" r="2" />
      </>
    ),
    logout: (
      <>
        <path d="M10 4H4v16h6M14 8l4 4-4 4M8 12h10" />
      </>
    ),
    menu: <path d="M4 6h16M4 12h16M4 18h16" />,
    arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
    check: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m7 12 3 3 7-7" />
      </>
    ),
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
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
      badge: "bg-amber-100 text-amber-800",
      icon: "bg-amber-100 text-amber-700",
    },
    sky: {
      badge: "bg-sky-100 text-sky-800",
      icon: "bg-sky-100 text-sky-700",
    },
    green: {
      badge: "bg-green-100 text-green-800",
      icon: "bg-green-100 text-green-700",
    },
  };

  const style = colors[color];

  return (
    <Link
      href={href}
      className="group flex h-full flex-col rounded-[22px] border border-sky-200 bg-white/90 p-6 shadow-[0_8px_24px_rgba(28,119,184,0.10)] transition hover:-translate-y-1 hover:shadow-xl"
    >
      <div className="flex items-center justify-between gap-3">
        <span
          className={`rounded-full px-3 py-2 text-xs font-black uppercase tracking-wide ${style.badge}`}
        >
          {badge}
        </span>

        <span
          className={`flex h-11 w-11 items-center justify-center rounded-xl ${style.icon}`}
        >
          <Icon name="package" size={23} />
        </span>
      </div>

      <h3 className="mt-6 text-2xl font-black text-[#073a68]">
        {title}
      </h3>

      <p className="mt-3 flex-1 text-sm leading-7 text-slate-600">
        {description}
      </p>

      <div className="mt-7 flex items-center justify-between border-t border-sky-100 pt-5 text-sm font-bold text-[#087cdb]">
        <span>{action}</span>
        <span className="transition group-hover:translate-x-1">
          <Icon name="arrow" size={20} />
        </span>
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
    <div className="rounded-2xl border border-sky-200 bg-gradient-to-b from-white to-[#eaf6ff] p-5">
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-100 text-sm font-black text-sky-700">
        {number}
      </span>

      <h3 className="mt-4 text-base font-black text-[#073a68]">
        {title}
      </h3>

      <p className="mt-2 text-sm leading-6 text-slate-600">
        {description}
      </p>
    </div>
  );
}

function packageStatusLabel(item: PackageRecord) {
  const effectiveStatus =
    item.status === "in_transit" &&
    item.lebanon_received_at
      ? "received_in_lebanon"
      : item.status;

  return (
    SHIPMENT_STATUSES.find(
      (status) => status.value === effectiveStatus
    )?.label ||
    (effectiveStatus || "Unknown")
      .replace(/_/g, " ")
      .toUpperCase()
  );
}

export default function DashboardPage() {
  const router = useRouter();

  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");

  // Stage 5: Read-only shipment status overview.
  const [selectedStatus, setSelectedStatus] =
    useState<ShipmentStatus | null>(null);

  const [statusPackages, setStatusPackages] =
    useState<PackageRecord[]>([]);

  const [statusLoading, setStatusLoading] =
    useState(false);

  const [statusError, setStatusError] =
    useState("");

  const [statusPage, setStatusPage] =
    useState(0);

  const [statusTotal, setStatusTotal] =
    useState(0);

  // Prevent older requests from overwriting newer results.
  const overviewRequestRef = useRef(0);

  async function loadStatusPackages(
    status: ShipmentStatus,
    page: number
  ) {
    const requestId = ++overviewRequestRef.current;

    setSelectedStatus(status);
    setStatusLoading(true);
    setStatusError("");
    setStatusPackages([]);
    setStatusPage(page);
    setStatusTotal(0);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (requestId !== overviewRequestRef.current) {
        return;
      }

      if (authError || !user) {
        setStatusError(
          "Please sign in to view shipment information."
        );
        return;
      }

      let query = supabase
        .from("packages")
        .select(PACKAGE_FIELDS, {
          count: "exact",
        });

      // Do not classify an older shipment as
      // "In Transit" if Lebanon receipt is confirmed.
      if (status === "in_transit") {
        query = query
          .eq("status", "in_transit")
          .is("lebanon_received_at", null);
      } else if (status === "received_in_lebanon") {
        query = query.or(
          "status.eq.received_in_lebanon,and(status.eq.in_transit,lebanon_received_at.not.is.null)"
        );
      } else {
        query = query.eq("status", status);
      }

      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error, count } = await query
        .order("sky_code", {
          ascending: false,
        })
        .order("id", {
          ascending: true,
        })
        .range(from, to);

      if (requestId !== overviewRequestRef.current) {
        return;
      }

      if (error) {
        setStatusError(error.message);
        return;
      }

      setStatusPackages(
        (data || []) as PackageRecord[]
      );

      setStatusTotal(count ?? 0);
    } catch (error) {
      if (requestId !== overviewRequestRef.current) {
        return;
      }

      setStatusError(
        error instanceof Error
          ? error.message
          : "Unable to load shipment information."
      );
    } finally {
      if (requestId === overviewRequestRef.current) {
        setStatusLoading(false);
      }
    }
  }

  async function handleLogout() {
    setLoggingOut(true);
    setLogoutError("");

    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        setLogoutError(error.message);
        return;
      }

      router.replace("/login");
      router.refresh();
    } catch (error) {
      setLogoutError(
        error instanceof Error
          ? error.message
          : "Unable to sign out."
      );
    } finally {
      setLoggingOut(false);
    }
  }

  const selectedStatusInfo =
    SHIPMENT_STATUSES.find(
      (item) => item.value === selectedStatus
    );

  const totalPages = Math.ceil(
    statusTotal / PAGE_SIZE
  );

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

      {/* SkyShip sidebar */}
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

        <p className="mb-4 px-4 text-xs font-black uppercase tracking-widest text-white/70">
          Operations
        </p>

        <nav className="space-y-2">
          {navigation.map((item) => {
            const active = item.href === "/dashboard";

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
                <Icon name={item.icon} size={21} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto border-t border-white/25 pt-5">
          <div className="mb-4 rounded-xl bg-white/15 p-4">
            <p className="text-sm font-bold">
              SkyShip Operations
            </p>

            <p className="mt-1 text-xs text-white/80">
              USA • Lebanon
            </p>
          </div>

          {logoutError && (
            <p className="mb-3 rounded-lg bg-red-500/20 p-3 text-xs text-white">
              {logoutError}
            </p>
          )}

          <button
            type="button"
            onClick={() => void handleLogout()}
            disabled={loggingOut}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/20 disabled:opacity-50"
          >
            <Icon name="logout" size={21} />
            {loggingOut ? "Signing out..." : "Logout"}
          </button>
        </div>
      </aside>

      {/* Main dashboard */}
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
                <Icon name="menu" />
              </button>

              <span className="text-sky-500">
                <Icon name="warehouse" size={25} />
              </span>

              <h1 className="text-base font-black sm:text-xl">
                Admin Dashboard
              </h1>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-bold">
                  SkyShip Operations
                </p>

                <p className="text-xs text-slate-500">
                  Warehouse Control Center
                </p>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-sky-200 bg-sky-100 font-black text-sky-700">
                A
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1500px] space-y-7 p-4 sm:p-6 lg:p-7">
          {/* Original SkyShip banner */}
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
              <p className="text-xs font-black uppercase tracking-[0.25em] text-sky-700">
                SkyShip Operations
              </p>

              <h2 className="mt-3 text-3xl font-black tracking-tight text-[#073a68] sm:text-4xl">
                Welcome back, Admin!
              </h2>

              <p className="mt-3 text-sm font-medium text-[#073a68] sm:text-base">
                Manage packages, monitor warehouse
                operations, and coordinate shipments
                between the USA and Lebanon.
              </p>

              <Link
                href="/dashboard/expected-packages"
                className="mt-6 inline-flex items-center gap-3 rounded-xl bg-gradient-to-r from-[#06a9ee] to-[#087cdb] px-6 py-3 text-sm font-bold text-white shadow-lg hover:brightness-105"
              >
                <Icon name="package" size={19} />
                Manage Packages
              </Link>
            </div>
          </section>

          {/* Existing warehouse operations */}
          <section>
            <div className="mb-5 flex items-center gap-3">
              <span className="text-sky-600">
                <Icon name="warehouse" size={25} />
              </span>

              <div>
                <h2 className="text-xl font-black sm:text-2xl">
                  Warehouse Operations
                </h2>

                <p className="mt-1 text-sm text-slate-600">
                  Select a warehouse operation to continue.
                </p>
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
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
          </section>

          {/* Stage 5: Shipment Status Overview */}
          <section
            id="shipment-status-overview"
            className="rounded-[22px] border border-sky-200 bg-white/90 p-5 shadow-[0_8px_28px_rgba(24,113,177,0.10)] sm:p-6"
          >
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-sky-600">
                  SkyShip Shipment Control
                </p>

                <h2 className="mt-2 text-xl font-black sm:text-2xl">
                  Shipment Status Overview
                </h2>

                <p className="mt-2 text-sm text-slate-600">
                  Select a status to view matching packages
                  directly from the database.
                </p>
              </div>

              <Link
                href="/dashboard/shipments"
                className="inline-flex items-center gap-2 rounded-xl bg-[#0879c5] px-5 py-3 text-sm font-bold text-white hover:bg-[#0669ad]"
              >
                Shipment Management
                <Icon name="arrow" size={18} />
              </Link>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {SHIPMENT_STATUSES.map((stage, index) => {
                const active =
                  selectedStatus === stage.value;

                return (
                  <button
                    key={stage.value}
                    type="button"
                    aria-pressed={active}
                    onClick={() =>
                      void loadStatusPackages(
                        stage.value,
                        0
                      )
                    }
                    className={`rounded-2xl border p-5 text-left transition hover:shadow-md ${
                      active
                        ? "border-sky-500 bg-sky-100 ring-2 ring-sky-300"
                        : "border-sky-200 bg-gradient-to-br from-white to-[#edf8ff] hover:border-sky-400"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span
                        className={`flex h-11 w-11 items-center justify-center rounded-xl text-sm font-black ${
                          active
                            ? "bg-[#0879c5] text-white"
                            : "bg-sky-100 text-sky-700"
                        }`}
                      >
                        {index + 1}
                      </span>

                      <span className="text-sky-600">
                        <Icon name="arrow" size={20} />
                      </span>
                    </div>

                    <h3 className="mt-4 text-base font-black text-[#073a68]">
                      {stage.label}
                    </h3>

                    <p className="mt-2 text-xs leading-5 text-slate-600">
                      {stage.description}
                    </p>

                    <p className="mt-4 text-sm font-bold text-[#0879c5]">
                      View Packages
                    </p>
                  </button>
                );
              })}
            </div>

            {selectedStatus && (
              <div
                className="mt-7 rounded-2xl border border-sky-200 bg-[#f8fcff] p-4 sm:p-6"
                aria-live="polite"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-black text-[#0879c5]">
                      {selectedStatusInfo?.label}
                    </h3>

                    <p className="mt-1 text-sm text-slate-600">
                      Current packages in this status.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      void loadStatusPackages(
                        selectedStatus,
                        statusPage
                      )
                    }
                    disabled={statusLoading}
                    className="rounded-xl border border-sky-300 bg-white px-4 py-3 text-sm font-bold text-sky-700 hover:bg-sky-50 disabled:opacity-50"
                  >
                    {statusLoading
                      ? "Loading..."
                      : "Refresh List"}
                  </button>
                </div>

                {statusLoading && (
                  <p
                    role="status"
                    className="mt-5 rounded-xl border border-sky-100 bg-white p-4 text-sm font-semibold text-sky-700"
                  >
                    Loading matching shipments...
                  </p>
                )}

                {statusError && (
                  <div
                    role="alert"
                    className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
                  >
                    <p className="font-bold">
                      Unable to load shipments
                    </p>

                    <p className="mt-2 break-words">
                      {statusError}
                    </p>

                    <p className="mt-2">
                      No package records were changed.
                    </p>
                  </div>
                )}

                {!statusLoading &&
                  !statusError && (
                    <>
                      <p className="mt-5 text-sm font-bold text-slate-700">
                        {statusTotal} matching{" "}
                        {statusTotal === 1
                          ? "package"
                          : "packages"}
                      </p>

                      {statusPackages.length === 0 ? (
                        <div className="mt-4 rounded-xl border border-sky-100 bg-white p-5 text-sm text-slate-600">
                          No packages found in this status
                          among records visible to your account.
                        </div>
                      ) : (
                        <div className="mt-4 space-y-3">
                          {statusPackages.map((item) => (
                            <div
                              key={item.id}
                              className="rounded-xl border border-sky-100 bg-white p-4 shadow-sm"
                            >
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="break-all text-base font-black text-[#0879c5]">
                                    {item.sky_code ||
                                      item.package_code ||
                                      "Package"}
                                  </p>

                                  <p className="mt-2 break-all text-sm text-slate-600">
                                    Tracking:{" "}
                                    {item.carrier_tracking_number ||
                                      item.tracking_number ||
                                      "Not recorded"}
                                  </p>
                                </div>

                                <span className="rounded-full bg-sky-100 px-3 py-2 text-xs font-bold text-sky-800">
                                  {packageStatusLabel(item)}
                                </span>
                              </div>

                              <div className="mt-4 grid gap-3 border-t border-sky-100 pt-4 text-sm sm:grid-cols-2">
                                <div>
                                  <p className="text-xs text-slate-500">
                                    Customer Code
                                  </p>

                                  <p className="mt-1 font-semibold">
                                    {item.customer_code || "—"}
                                  </p>
                                </div>

                                <div>
                                  <p className="text-xs text-slate-500">
                                    Carrier
                                  </p>

                                  <p className="mt-1 font-semibold">
                                    {item.carrier || "—"}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {totalPages > 1 && (
                        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-sky-200 pt-5">
                          <button
                            type="button"
                            disabled={statusPage === 0}
                            onClick={() =>
                              void loadStatusPackages(
                                selectedStatus,
                                statusPage - 1
                              )
                            }
                            className="rounded-xl border border-sky-300 bg-white px-4 py-3 text-sm font-bold text-sky-700 disabled:opacity-40"
                          >
                            Previous
                          </button>

                          <p className="text-sm font-bold text-slate-600">
                            Page {statusPage + 1} of{" "}
                            {totalPages}
                          </p>

                          <button
                            type="button"
                            disabled={
                              statusPage + 1 >= totalPages
                            }
                            onClick={() =>
                              void loadStatusPackages(
                                selectedStatus,
                                statusPage + 1
                              )
                            }
                            className="rounded-xl border border-sky-300 bg-white px-4 py-3 text-sm font-bold text-sky-700 disabled:opacity-40"
                          >
                            Next
                          </button>
                        </div>
                      )}
                    </>
                  )}

                <p className="mt-5 text-xs leading-5 text-slate-500">
                  Read-only view of current package records.
                  Results are subject to database access
                  permissions. Historical events are available
                  in Shipment Management.
                </p>
              </div>
            )}
          </section>

          {/* Existing Live Workflow */}
          <section className="rounded-[22px] border border-sky-200 bg-white/85 p-6 shadow-[0_8px_28px_rgba(24,113,177,0.10)]">
            <div className="mb-5 flex items-center gap-3">
              <span className="text-sky-600">
                <Icon name="check" size={25} />
              </span>

              <div>
                <h2 className="text-xl font-black sm:text-2xl">
                  Live Workflow
                </h2>

                <p className="mt-1 text-sm text-slate-600">
                  From customer pre-alert to Lebanon receiving.
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
          </section>
        </main>

        <footer className="border-t border-sky-200 bg-white/60 px-6 py-5 text-center text-xs font-semibold text-slate-600">
          SkyShip LLC • Beyond Limits. Delivered.
        </footer>
      </div>
    </div>
  );
}