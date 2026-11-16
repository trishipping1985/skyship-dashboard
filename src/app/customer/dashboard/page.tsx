"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

type Profile = {
  full_name: string | null;
  customer_code: string | null;
  role: string | null;
};

type Package = {
  id: string;
  sky_code: string | null;
  package_code: string | null;
  carrier_tracking_number: string | null;
  tracking_number: string | null;
  carrier: string | null;
  status: string | null;
  received_at: string | null;
  shipped_at: string | null;
  lebanon_received_at: string | null;
};

type Stage =
  | "received"
  | "shipped"
  | "in_transit"
  | "lebanon"
  | "out_for_delivery"
  | "delivered"
  | "expected"
  | "other";

type IconName =
  | "home"
  | "box"
  | "calendar"
  | "image"
  | "bell"
  | "user"
  | "plane"
  | "globe"
  | "truck"
  | "check"
  | "warehouse"
  | "search"
  | "refresh"
  | "logout"
  | "chevron"
  | "menu"
  | "info";

const PACKAGE_FIELDS = [
  "id",
  "sky_code",
  "package_code",
  "carrier_tracking_number",
  "tracking_number",
  "carrier",
  "status",
  "received_at",
  "shipped_at",
  "lebanon_received_at",
].join(", ");

const STAGES: {
  key: Stage;
  label: string;
  icon: IconName;
  image: string;
}[] = [
  {
    key: "received",
    label: "Received in USA",
    icon: "warehouse",
    image: "/images/dashboard/received-usa.png",
  },
  {
    key: "shipped",
    label: "Shipped",
    icon: "plane",
    image: "/images/dashboard/shipped.png",
  },
  {
    key: "in_transit",
    label: "In Transit",
    icon: "globe",
    image: "/images/dashboard/in-transit.png",
  },
  {
    key: "lebanon",
    label: "Received in Lebanon",
    icon: "warehouse",
    image: "/images/dashboard/received-lebanon.png",
  },
  {
    key: "out_for_delivery",
    label: "Out for Delivery",
    icon: "truck",
    image: "/images/dashboard/out-for-delivery.png",
  },
  {
    key: "delivered",
    label: "Delivered",
    icon: "check",
    image: "/images/dashboard/delivered.png",
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
    box: (
      <>
        <path d="m3 7 9-4 9 4v10l-9 4-9-4V7Z" />
        <path d="m3 7 9 5 9-5M12 12v9" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M7 3v4M17 3v4M3 10h18" />
      </>
    ),
    image: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8" cy="8" r="1.5" />
        <path d="m3 17 6-6 4 4 3-3 5 5" />
      </>
    ),
    bell: (
      <>
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4" />
      </>
    ),
    user: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c0-5 3-8 8-8s8 3 8 8" />
      </>
    ),
    plane: (
      <>
        <path d="M21 3 9 15M21 3l-5 18-5-8-8-5 18-5Z" />
        <path d="m9 15-2 6 4-4" />
      </>
    ),
    globe: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3c-6 6-6 12 0 18M12 3c6 6 6 12 0 18" />
      </>
    ),
    truck: (
      <>
        <path d="M2 6h12v11H2zM14 10h4l4 4v3h-8" />
        <circle cx="6" cy="18" r="2" />
        <circle cx="18" cy="18" r="2" />
      </>
    ),
    check: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m7 12 3 3 7-7" />
      </>
    ),
    warehouse: (
      <>
        <path d="m3 9 9-6 9 6v12H3V9Z" />
        <path d="M7 21v-9h10v9M7 15h10M7 18h10" />
      </>
    ),
    search: (
      <>
        <circle cx="10" cy="10" r="7" />
        <path d="m15 15 6 6" />
      </>
    ),
    refresh: (
      <>
        <path d="M20 7v5h-5M4 17v-5h5" />
        <path d="M5 9a8 8 0 0 1 14-2l1 5M4 12l1 5a8 8 0 0 0 14-2" />
      </>
    ),
    logout: (
      <>
        <path d="M10 4H4v16h6M14 8l4 4-4 4M8 12h10" />
      </>
    ),
    chevron: <path d="m6 9 6 6 6-6" />,
    menu: <path d="M4 6h16M4 12h16M4 18h16" />,
    info: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v6M12 7h.01" />
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

function normalizeStatus(value: string | null) {
  return (value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

function getStage(pkg: Package): Stage {
  const status = normalizeStatus(pkg.status);

  if (status === "delivered") return "delivered";

  if (status === "out_for_delivery") {
    return "out_for_delivery";
  }

  if (
    [
      "received_in_lebanon",
      "lebanon_received",
      "received_lebanon",
      "arrived_in_lebanon",
    ].includes(status) ||
    Boolean(pkg.lebanon_received_at)
  ) {
    return "lebanon";
  }

  if (status === "in_transit") return "in_transit";
  if (status === "shipped") return "shipped";

  if (
    ["received", "received_in_usa", "usa_received"].includes(
      status
    )
  ) {
    return "received";
  }

  if (status === "expected") return "expected";

  return "other";
}

function getStatusLabel(pkg: Package) {
  const stage = getStage(pkg);
  const found = STAGES.find((item) => item.key === stage);

  if (found) return found.label;
  if (stage === "expected") return "Expected";

  return pkg.status
    ? pkg.status.replace(/_/g, " ")
    : "Pending";
}

function formatDate(value: string | null) {
  if (!value) return "Not recorded";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "Not available"
    : date.toLocaleString();
}

function getLastUpdate(pkg: Package) {
  return (
    pkg.lebanon_received_at ||
    pkg.shipped_at ||
    pkg.received_at
  );
}

function StatusCard({
  label,
  value,
  image,
  featured = false,
}: {
  label: string;
  value: number;
  image: string;
  featured?: boolean;
}) {
  return (
    <div
      className={`relative flex min-h-[215px] flex-col items-center overflow-hidden rounded-[20px] border px-3 pb-5 pt-3 text-center shadow-[0_8px_24px_rgba(28,119,184,0.12)] transition-transform duration-200 hover:-translate-y-1 ${
        featured
          ? "border-sky-400 bg-gradient-to-br from-[#19b8f3] via-[#078fdf] to-[#0664c6] text-white"
          : "border-[#c6e5f7] bg-gradient-to-b from-[#ffffff] via-[#f0f9ff] to-[#dcefff] text-[#073a68]"
      }`}
    >
      <div
        className={`relative flex h-[105px] w-full items-center justify-center rounded-xl ${
          featured ? "bg-white/10" : "bg-white/50"
        }`}
      >
        <img
          src={image}
          alt=""
          aria-hidden="true"
          className="h-[100px] w-full object-contain"
        />
      </div>

      <p className="mt-3 flex min-h-[36px] items-center justify-center text-sm font-extrabold leading-tight">
        {label}
      </p>

      <p className="mt-1 text-[38px] font-black leading-none">
        {value}
      </p>

      <div
        className={`absolute inset-x-0 bottom-0 h-[5px] ${
          featured
            ? "bg-white/50"
            : "bg-gradient-to-r from-sky-300 via-cyan-400 to-blue-500"
        }`}
      />
    </div>
  );
}

function SidebarItem({
  icon,
  label,
  active = false,
  onClick,
}: {
  icon: IconName;
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold transition ${
        active
          ? "bg-white text-[#0866ae] shadow-lg"
          : "text-white hover:bg-white/20"
      }`}
    >
      <Icon name={icon} size={21} />
      <span>{label}</span>
    </button>
  );
}

export default function CustomerDashboardPage() {
  const router = useRouter();

  const [profile, setProfile] =
    useState<Profile | null>(null);

  const [packages, setPackages] =
    useState<Package[]>([]);

  const [selectedPackage, setSelectedPackage] =
    useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const loadDashboard = useCallback(
    async (initial = false) => {
      if (initial) setLoading(true);
      else setRefreshing(true);

      setError("");

      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          router.replace("/login");
          return;
        }

        const {
          data: profileData,
          error: profileError,
        } = await supabase
          .from("profiles")
          .select("full_name, customer_code, role")
          .eq("id", user.id)
          .single();

        if (profileError || !profileData) {
          setError(
            "Unable to load your customer profile."
          );
          return;
        }

        if (profileData.role !== "client") {
          router.replace("/dashboard");
          return;
        }

        setProfile(profileData as Profile);

        const {
          data,
          error: packagesError,
        } = await supabase
          .from("packages")
          .select(PACKAGE_FIELDS)
          .eq("owner_id", user.id)
          .order("received_at", {
            ascending: false,
            nullsFirst: false,
          });

        if (packagesError) {
          setError(
            `Unable to load packages: ${packagesError.message}`
          );
          return;
        }

        setPackages(
          (data ?? []) as unknown as Package[]
        );
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load your dashboard."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [router]
  );

  useEffect(() => {
    void loadDashboard(true);
  }, [loadDashboard]);

  const counts = useMemo(() => {
    const result: Record<Stage, number> = {
      received: 0,
      shipped: 0,
      in_transit: 0,
      lebanon: 0,
      out_for_delivery: 0,
      delivered: 0,
      expected: 0,
      other: 0,
    };

    for (const pkg of packages) {
      result[getStage(pkg)] += 1;
    }

    return result;
  }, [packages]);

  const filteredPackages = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return packages;

    return packages.filter((pkg) =>
      [
        pkg.sky_code,
        pkg.package_code,
        pkg.tracking_number,
        pkg.carrier_tracking_number,
        pkg.carrier,
        getStatusLabel(pkg),
      ].some((value) =>
        (value || "").toLowerCase().includes(query)
      )
    );
  }, [packages, search]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  function scrollToSection(id: string) {
    setSidebarOpen(false);

    document
      .getElementById(id)
      ?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#f0f9ff] via-[#dcefff] to-[#b9e4fa]">
        <div className="text-center">
          <img
            src="/images/skyship/skyship-logo.png"
            alt="SkyShip"
            className="mx-auto h-28 w-28 rounded-full object-contain shadow-xl"
          />
          <p className="mt-5 font-semibold text-[#073a68]">
            Loading your dashboard...
          </p>
        </div>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#f0f9ff] to-[#b9e4fa] p-6">
        <div className="w-full max-w-md rounded-3xl border border-sky-100 bg-white/90 p-8 text-center shadow-xl">
          <h1 className="text-2xl font-bold text-[#073a68]">
            Customer Dashboard
          </h1>

          <p className="mt-4 text-red-600">
            {error || "Unable to load your account."}
          </p>

          <button
            type="button"
            onClick={() => void loadDashboard(true)}
            className="mt-6 rounded-xl bg-sky-500 px-6 py-3 font-bold text-white"
          >
            Try Again
          </button>
        </div>
      </main>
    );
  }

  const firstName =
    profile.full_name?.trim().split(/\s+/)[0] ||
    "Customer";

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f2f9ff] via-[#e2f2ff] to-[#c8e8fa] text-[#073a68]">
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[245px] flex-col bg-gradient-to-b from-[#0879c5] via-[#079cdd] to-[#065aab] px-4 py-6 text-white shadow-xl transition-transform lg:translate-x-0 ${
          sidebarOpen
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

        <nav className="space-y-2">
          <SidebarItem
            icon="home"
            label="Dashboard"
            active
            onClick={() => scrollToSection("overview")}
          />

          <SidebarItem
            icon="box"
            label="My Packages"
            onClick={() => scrollToSection("packages")}
          />

          <SidebarItem
            icon="calendar"
            label="Expected Packages"
            onClick={() => router.push("/customer/expected-packages")}
          />

          <SidebarItem
            icon="image"
            label="Package Photos"
            onClick={() => scrollToSection("upcoming")}
          />

          <SidebarItem
            icon="bell"
            label="Notifications"
            onClick={() => scrollToSection("upcoming")}
          />

          <SidebarItem
            icon="user"
            label="My Profile"
            onClick={() => scrollToSection("customer-info")}
          />
        </nav>

        <div className="mt-auto border-t border-white/25 pt-5">
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-white hover:bg-white/20"
          >
            <Icon name="logout" />
            Logout
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
                onClick={() => setSidebarOpen(true)}
                className="rounded-lg p-2 text-sky-700 lg:hidden"
              >
                <Icon name="menu" />
              </button>

              <span className="text-sky-500">
                <Icon name="user" size={25} />
              </span>

              <h1 className="text-base font-black sm:text-xl">
                Customer Dashboard
              </h1>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => void loadDashboard()}
                disabled={refreshing}
                title="Refresh packages"
                aria-label="Refresh packages"
                className="rounded-lg border border-sky-200 bg-white/70 p-2 text-sky-700 hover:bg-sky-50 disabled:opacity-50"
              >
                <Icon name="refresh" size={19} />
              </button>

              <div className="hidden text-right sm:block">
                <p className="text-sm font-bold text-[#073a68]">
                  {profile.full_name || "Customer"}
                </p>
                <p className="text-xs text-slate-500">
                  {profile.customer_code || "SkyShip Client"}
                </p>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-sky-200 bg-sky-100 font-black text-sky-700">
                {firstName.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1500px] space-y-6 p-4 sm:p-6 lg:p-7">
          <section
            id="overview"
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
              <h2 className="text-3xl font-black tracking-tight text-[#073a68] sm:text-4xl">
                Welcome back, {firstName}!
              </h2>

              <p className="mt-3 text-sm font-medium text-[#073a68] sm:text-base">
                Track your packages. Stay updated.
                Delivered to Lebanon.
              </p>

              <button
                type="button"
                onClick={() => scrollToSection("packages")}
                className="mt-6 inline-flex items-center gap-3 rounded-xl bg-gradient-to-r from-[#06a9ee] to-[#087cdb] px-6 py-3 text-sm font-bold text-white shadow-lg hover:brightness-105"
              >
                <Icon name="search" size={19} />
                Track a Package
              </button>
            </div>
          </section>

          <section
            id="customer-info"
            className="flex flex-wrap items-center justify-between gap-5 rounded-2xl border border-sky-200 bg-gradient-to-r from-white/90 to-[#dcefff] px-6 py-5 shadow-sm"
          >
            <div className="flex items-center gap-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
                <Icon name="user" size={25} />
              </span>

              <div>
                <p className="text-xs font-bold text-slate-600">
                  Your SkyShip Customer Code
                </p>
                <p className="mt-1 text-2xl font-black text-[#073a68]">
                  {profile.customer_code ||
                    "Pending assignment"}
                </p>
              </div>
            </div>

            <div className="flex max-w-md items-start gap-3 text-sm text-[#073a68]">
              <span className="mt-0.5 text-sky-600">
                <Icon name="info" size={21} />
              </span>
              <p>
                Your shipments are securely linked to
                your account. You do not need to include
                this code in your shopping address.
              </p>
            </div>
          </section>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          <section>
            <div className="mb-4 flex items-center gap-3">
              <span className="text-sky-600">
                <Icon name="box" size={25} />
              </span>

              <h3 className="text-xl font-black text-[#073a68] sm:text-2xl">
                Shipment Overview
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-7">
              <div className="col-span-2 sm:col-span-1">
                <StatusCard
                  label="Total Packages"
                  value={packages.length}
                  image="/images/dashboard/total-packages.png"
                  featured
                />
              </div>

              {STAGES.map((stage) => (
                <StatusCard
                  key={stage.key}
                  label={stage.label}
                  value={counts[stage.key]}
                  image={stage.image}
                />
              ))}
            </div>

            {(counts.expected > 0 ||
              counts.other > 0) && (
              <p className="mt-3 text-xs text-slate-500">
                {counts.expected > 0 &&
                  `${counts.expected} expected package(s). `}
                {counts.other > 0 &&
                  `${counts.other} package(s) with another status. `}
                These are included in Total Packages.
              </p>
            )}
          </section>

          <section
            id="packages"
            className="overflow-hidden rounded-[22px] border border-sky-200 bg-white/85 shadow-[0_8px_28px_rgba(24,113,177,0.10)] backdrop-blur-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-sky-100 p-5">
              <div className="flex items-center gap-3">
                <span className="text-sky-600">
                  <Icon name="box" size={25} />
                </span>

                <h3 className="text-xl font-black text-[#073a68]">
                  My Packages
                </h3>
              </div>

              <div className="relative w-full sm:w-[330px]">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <Icon name="search" size={19} />
                </span>

                <input
                  type="search"
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder="Search tracking or package code..."
                  className="w-full rounded-xl border border-sky-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                />
              </div>
            </div>

            <div className="hidden grid-cols-[1.2fr_1.7fr_0.8fr_1.2fr_1.2fr] gap-3 border-b border-sky-100 bg-[#eaf5ff] px-5 py-4 text-xs font-black uppercase tracking-wide text-slate-600 md:grid">
              <span>Package Code</span>
              <span>Tracking Number</span>
              <span>Carrier</span>
              <span>Status</span>
              <span>Last Update</span>
            </div>

            {filteredPackages.length === 0 ? (
              <div className="p-10 text-center">
                <p className="font-bold text-[#073a68]">
                  {search
                    ? "No matching packages"
                    : "No packages yet"}
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  {search
                    ? "Try another tracking number or package code."
                    : "Your registered shipments will appear here."}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-sky-100">
                {filteredPackages.map((pkg) => {
                  const open =
                    selectedPackage === pkg.id;

                  const stage = getStage(pkg);

                  const currentIndex =
                    STAGES.findIndex(
                      (item) => item.key === stage
                    );

                  const code =
                    pkg.sky_code ||
                    pkg.package_code ||
                    "SkyShip Package";

                  const tracking =
                    pkg.carrier_tracking_number ||
                    pkg.tracking_number ||
                    "Tracking pending";

                  return (
                    <div key={pkg.id}>
                      <button
                        type="button"
                        aria-expanded={open}
                        onClick={() =>
                          setSelectedPackage(
                            open ? null : pkg.id
                          )
                        }
                        className={`w-full p-5 text-left transition hover:bg-sky-50 ${
                          open ? "bg-[#eaf8ff]" : "bg-white/75"
                        }`}
                      >
                        <div className="grid items-center gap-3 md:grid-cols-[1.2fr_1.7fr_0.8fr_1.2fr_1.2fr]">
                          <div className="flex min-w-0 items-center gap-2">
                            <span
                              className={`shrink-0 text-sky-700 transition-transform ${
                                open ? "rotate-180" : ""
                              }`}
                            >
                              <Icon
                                name="chevron"
                                size={17}
                              />
                            </span>

                            <span className="break-all text-sm font-black text-[#073a68]">
                              {code}
                            </span>
                          </div>

                          <p className="break-all text-sm text-slate-700">
                            {tracking}
                          </p>

                          <p className="text-sm font-bold text-slate-700">
                            {pkg.carrier || "â€”"}
                          </p>

                          <div>
                            <span
                              className={`inline-flex rounded-full px-3 py-1.5 text-xs font-bold ${
                                stage === "delivered"
                                  ? "bg-green-100 text-green-800"
                                  : stage === "out_for_delivery"
                                  ? "bg-violet-100 text-violet-800"
                                  : "bg-sky-100 text-sky-800"
                              }`}
                            >
                              {getStatusLabel(pkg)}
                            </span>
                          </div>

                          <p className="text-xs text-slate-600">
                            {formatDate(
                              getLastUpdate(pkg)
                            )}
                          </p>
                        </div>
                      </button>

                      {open && (
                        <div className="border-t border-sky-100 bg-gradient-to-b from-[#edf8ff] to-[#ffffff] p-5">
                          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <h4 className="text-base font-black text-[#073a68]">
                                Shipment Journey
                              </h4>
                              <p className="mt-1 text-xs text-slate-500">
                                {tracking}
                              </p>
                            </div>

                            <span className="rounded-full bg-sky-100 px-4 py-2 text-xs font-bold text-sky-800">
                              {getStatusLabel(pkg)}
                            </span>
                          </div>

                          <div className="overflow-x-auto pb-3">
                            <div className="relative grid min-w-[680px] grid-cols-6 gap-2">
                              <div className="absolute left-[8.3%] right-[8.3%] top-5 h-[3px] bg-sky-100" />

                              {currentIndex >= 0 && (
                                <div
                                  className="absolute left-[8.3%] top-5 h-[3px] bg-sky-500"
                                  style={{
                                    width: `${
                                      (currentIndex / 5) *
                                      83.4
                                    }%`,
                                  }}
                                />
                              )}

                              {STAGES.map(
                                (item, index) => {
                                  const complete =
                                    currentIndex >= index;

                                  const current =
                                    currentIndex === index;

                                  return (
                                    <div
                                      key={item.key}
                                      className="relative flex flex-col items-center text-center"
                                    >
                                      <span
                                        className={`z-10 flex h-11 w-11 items-center justify-center rounded-full border-[3px] ${
                                          current
                                            ? "border-sky-500 bg-sky-500 text-white"
                                            : complete
                                            ? "border-green-500 bg-green-500 text-white"
                                            : "border-sky-200 bg-white text-slate-400"
                                        }`}
                                      >
                                        <Icon
                                          name={
                                            complete &&
                                            !current
                                              ? "check"
                                              : item.icon
                                          }
                                          size={21}
                                        />
                                      </span>

                                      <p
                                        className={`mt-3 text-xs font-bold leading-4 ${
                                          complete
                                            ? "text-[#073a68]"
                                            : "text-slate-400"
                                        }`}
                                      >
                                        {item.label}
                                      </p>

                                      {item.key ===
                                        "received" &&
                                        pkg.received_at && (
                                          <p className="mt-1 text-[10px] text-slate-500">
                                            {formatDate(
                                              pkg.received_at
                                            )}
                                          </p>
                                        )}

                                      {item.key ===
                                        "shipped" &&
                                        pkg.shipped_at && (
                                          <p className="mt-1 text-[10px] text-slate-500">
                                            {formatDate(
                                              pkg.shipped_at
                                            )}
                                          </p>
                                        )}

                                      {item.key ===
                                        "lebanon" &&
                                        pkg.lebanon_received_at && (
                                          <p className="mt-1 text-[10px] text-slate-500">
                                            {formatDate(
                                              pkg.lebanon_received_at
                                            )}
                                          </p>
                                        )}
                                    </div>
                                  );
                                }
                              )}
                            </div>
                          </div>

                          <p className="mt-4 text-xs text-slate-500">
                            Progress reflects the latest
                            recorded shipment status.
                            Dates appear where available.
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section
            id="upcoming"
            className="rounded-2xl border border-sky-200 bg-gradient-to-r from-white/90 to-[#e5f4ff] p-6 shadow-sm"
          >
            <h3 className="text-lg font-black text-[#073a68]">
              More SkyShip Services
            </h3>

            <p className="mt-2 text-sm text-slate-500">
              Expected Packages, Package Photos,
              Notifications, and Profile management
              are planned for upcoming development.
            </p>
          </section>
        </main>

        <footer className="border-t border-sky-200 bg-white/60 px-6 py-5 text-center text-xs font-semibold text-slate-600">
          SkyShip LLC â€” Beyond Limits. Delivered.
        </footer>
      </div>
    </div>
  );
}
