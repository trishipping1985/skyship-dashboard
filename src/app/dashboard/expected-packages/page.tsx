"use client";

import {
  ChangeEvent,
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

type PackageRecord = {
  id: string;
  customer_id: string | null;
  owner_id: string | null;
  status: string | null;
};

type PhotoType =
  | "package"
  | "label"
  | "weight"
  | "damage"
  | "other";

const BUCKET = "package-photos";
const MAX_SIZE = 10 * 1024 * 1024;

const navigation = [
  { name: "Overview", href: "/dashboard", icon: "▦" },
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

const inputClass =
  "w-full rounded-xl border border-sky-200 bg-white " +
  "px-4 py-3.5 text-[#073a68] outline-none " +
  "focus:border-sky-500 focus:ring-2 focus:ring-sky-100 " +
  "disabled:opacity-50";

export default function ExpectedPackagesPage() {
  const router = useRouter();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [preAlerts, setPreAlerts] = useState<PreAlert[]>([]);

  const [selectedCustomer, setSelectedCustomer] =
    useState("");
  const [trackingNumber, setTrackingNumber] =
    useState("");
  const [carrier, setCarrier] = useState("");

  const [loadingCustomers, setLoadingCustomers] =
    useState(true);
  const [loadingPreAlerts, setLoadingPreAlerts] =
    useState(true);
  const [saving, setSaving] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [logoutError, setLogoutError] = useState("");

  const [openPhotoId, setOpenPhotoId] = useState<
    string | null
  >(null);
  const [selectedPhotos, setSelectedPhotos] = useState<
    File[]
  >([]);
  const [photoType, setPhotoType] =
    useState<PhotoType>("package");
  const [photoCaption, setPhotoCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [photoMessage, setPhotoMessage] = useState("");

  const customerMap = useMemo(
    () =>
      new Map(
        customers.map((customer) => [
          customer.id,
          customer,
        ])
      ),
    [customers]
  );

  const loadCustomers = useCallback(async () => {
    setLoadingCustomers(true);

    const { data, error: loadError } = await supabase
      .from("profiles")
      .select("id, customer_code, full_name, email")
      .eq("role", "client")
      .order("customer_code", { ascending: true });

    if (loadError) {
      setError(`CUSTOMER ERROR: ${loadError.message}`);
    } else {
      setCustomers((data || []) as Customer[]);
    }

    setLoadingCustomers(false);
  }, []);

  const loadExpectedPackages = useCallback(async () => {
    setLoadingPreAlerts(true);

    const { data, error: loadError } = await supabase
      .from("package_prealerts")
      .select(
        "id, customer_id, tracking_number, carrier, status, created_at"
      )
      .eq("status", "expected")
      .order("created_at", { ascending: false });

    if (loadError) {
      setError(`PRE-ALERT ERROR: ${loadError.message}`);
    } else {
      setPreAlerts((data || []) as PreAlert[]);
    }

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
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setMessage("");
    setError("");

    const cleanTracking = trackingNumber.trim();
    const cleanCarrier = carrier.trim();

    if (!selectedCustomer) {
      setError("Select a SkyShip customer.");
      return;
    }

    if (!cleanTracking) {
      setError("Enter the expected tracking number.");
      return;
    }

    setSaving(true);

    try {
      const { data: existing, error: checkError } =
        await supabase
          .from("package_prealerts")
          .select("id")
          .eq("tracking_number", cleanTracking)
          .limit(1)
          .maybeSingle();

      if (checkError) throw checkError;

      if (existing) {
        throw new Error(
          `Tracking number ${cleanTracking} is already registered.`
        );
      }

      const { data, error: insertError } =
        await supabase
          .from("package_prealerts")
          .insert({
            customer_id: selectedCustomer,
            tracking_number: cleanTracking,
            carrier: cleanCarrier || null,
            status: "expected",
          })
          .select(
            "id, customer_id, tracking_number, carrier, status, created_at"
          )
          .single();

      if (insertError) throw insertError;

      const newAlert = data as PreAlert;

      setPreAlerts((current) => [
        newAlert,
        ...current,
      ]);

      setMessage(
        `Expected package ${cleanTracking} registered. You can add photos to its card.`
      );

      setSelectedCustomer("");
      setTrackingNumber("");
      setCarrier("");

      openPhotoSection(newAlert.id);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to register package."
      );
    } finally {
      setSaving(false);
    }
  }

  function openPhotoSection(id: string) {
    setOpenPhotoId(id);
    setSelectedPhotos([]);
    setPhotoType("package");
    setPhotoCaption("");
    setPhotoError("");
    setPhotoMessage("");
  }

  function choosePhotos(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const files = Array.from(
      event.target.files || []
    );

    setPhotoError("");
    setPhotoMessage("");

    const allowed = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    const invalid = files.find(
      (file) =>
        !allowed.includes(file.type) ||
        file.size > MAX_SIZE
    );

    if (invalid) {
      setSelectedPhotos([]);
      setPhotoError(
        "Only JPEG, PNG, or WebP images up to 10 MB each are allowed."
      );
      return;
    }

    setSelectedPhotos(files);
  }

  async function uploadPhotos(alert: PreAlert) {
    if (uploading) return;

    setPhotoError("");
    setPhotoMessage("");

    if (!alert.customer_id) {
      setPhotoError(
        "This expected package has no assigned customer. Upload blocked."
      );
      return;
    }

    if (selectedPhotos.length === 0) {
      setPhotoError("Choose at least one photo.");
      return;
    }

    setUploading(true);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error(
          "Please sign in again."
        );
      }

      const { data: profile, error: roleError } =
        await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

      if (roleError) throw roleError;

      if (
        !["admin", "staff", "staff2", "staff4"].includes(
          String(profile?.role || "")
        )
      ) {
        throw new Error(
          "Only authorized SkyShip staff can upload photos."
        );
      }

      // Recheck the pre-alert before creating or
      // linking any package records.
      const { data: latestAlert, error: alertError } =
        await supabase
          .from("package_prealerts")
          .select("id, customer_id, tracking_number, carrier, status")
          .eq("id", alert.id)
          .single();

      if (alertError) throw alertError;

      if (
        latestAlert.status !== "expected" ||
        latestAlert.customer_id !== alert.customer_id ||
        latestAlert.tracking_number !== alert.tracking_number
      ) {
        throw new Error(
          "This expected package has changed. Refresh before uploading."
        );
      }

      // Existing warehouse records take priority.
      // Never choose arbitrarily between duplicates.
      const { data: matches, error: findError } =
        await supabase
          .from("packages")
          .select("id, customer_id, owner_id, status")
          .eq(
            "carrier_tracking_number",
            alert.tracking_number
          )
          .limit(2);

      if (findError) throw findError;

      if ((matches || []).length > 1) {
        throw new Error(
          "Multiple package records share this tracking number. Photo upload blocked until the duplicate is resolved."
        );
      }

      let pkg = (
        matches?.[0] as PackageRecord | undefined
      ) || null;

      if (pkg) {
        if (
          pkg.customer_id !== alert.customer_id ||
          pkg.owner_id !== alert.customer_id
        ) {
          throw new Error(
            "Package customer ownership does not match the expected shipment. Upload blocked."
          );
        }
      } else {
        // Create a single expected-stage package record
        // so photos have a permanent package UUID.
        // USA Receiving already updates this record
        // when it finds the same carrier tracking number.
        const customer = customerMap.get(
          alert.customer_id
        );

        if (!customer) {
          throw new Error(
            "Customer record could not be verified."
          );
        }

        const { data: created, error: createError } =
          await supabase
            .from("packages")
            .insert({
              carrier_tracking_number:
                alert.tracking_number,
              customer_id: alert.customer_id,
              customer_code:
                customer.customer_code || null,
              carrier: alert.carrier || null,
              status: "expected",
              source: "warehouse",
            })
            .select(
              "id, customer_id, owner_id, status"
            )
            .single();

        if (createError) {
          throw new Error(
            `Unable to prepare expected package: ${createError.message}`
          );
        }

        pkg = created as PackageRecord;

        if (
          pkg.customer_id !== alert.customer_id ||
          pkg.owner_id !== alert.customer_id
        ) {
          throw new Error(
            "New package ownership verification failed. No photos uploaded."
          );
        }
      }

      let uploadedCount = 0;

      for (const file of selectedPhotos) {
        const extension =
          file.type === "image/png"
            ? "png"
            : file.type === "image/webp"
              ? "webp"
              : "jpg";

        const path =
          `${pkg.id}/${crypto.randomUUID()}.${extension}`;

        const { error: storageError } =
          await supabase.storage
            .from(BUCKET)
            .upload(path, file, {
              contentType: file.type,
              upsert: false,
            });

        if (storageError) {
          throw new Error(
            `Uploaded ${uploadedCount} of ${selectedPhotos.length}. Storage error: ${storageError.message}`
          );
        }

        const { error: photoInsertError } =
          await supabase
            .from("package_photos")
            .insert({
              package_id: pkg.id,
              storage_path: path,
              photo_type: photoType,
              caption: photoCaption.trim() || null,
              created_by: user.id,
            });

        if (photoInsertError) {
          const { error: cleanupError } =
            await supabase.storage
              .from(BUCKET)
              .remove([path]);

          throw new Error(
            `Uploaded ${uploadedCount} of ${selectedPhotos.length}. Photo record error: ${photoInsertError.message}` +
              (cleanupError
                ? ` Cleanup also failed: ${cleanupError.message}`
                : "")
          );
        }

        uploadedCount += 1;
      }

      setSelectedPhotos([]);
      setPhotoCaption("");
      setPhotoMessage(
        `${uploadedCount} photo${uploadedCount === 1 ? "" : "s"} uploaded successfully for ${alert.tracking_number}.`
      );
    } catch (err) {
      setPhotoError(
        err instanceof Error
          ? err.message
          : "Photo upload failed."
      );
    } finally {
      setUploading(false);
    }
  }

  function customerLabel(id: string | null) {
    if (!id) {
      return {
        code: "NO CUSTOMER",
        name: "Not assigned",
      };
    }

    const customer = customerMap.get(id);

    return {
      code: customer?.customer_code || "NO CODE",
      name:
        customer?.full_name ||
        customer?.email ||
        "Customer record unavailable",
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
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMenuOpen(false)}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold ${
                item.href ===
                "/dashboard/expected-packages"
                  ? "bg-white text-[#0866ae] shadow-lg"
                  : "text-white hover:bg-white/20"
              }`}
            >
              <span className="w-6 text-center text-xl">
                {item.icon}
              </span>
              {item.name}
            </Link>
          ))}
        </nav>

        <div className="mt-auto border-t border-white/25 pt-5">
          <p className="mb-4 text-xs text-white/80">
            SkyShip Operations — USA • Lebanon
          </p>

          {logoutError && (
            <p className="mb-3 text-sm text-red-100">
              {logoutError}
            </p>
          )}

          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-full rounded-xl px-4 py-3 text-left text-sm font-bold hover:bg-white/20"
          >
            {loggingOut ? "Signing out..." : "↪ Logout"}
          </button>
        </div>
      </aside>

      <div className="min-h-screen lg:ml-[245px]">
        <header className="sticky top-0 z-30 border-b border-sky-200 bg-white/85 shadow-sm backdrop-blur-xl">
          <div className="flex min-h-[70px] items-center justify-between gap-4 px-5 sm:px-8">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMenuOpen(true)}
                className="rounded-lg p-2 text-sky-700 lg:hidden"
                aria-label="Open navigation"
              >
                ☰
              </button>

              <span className="text-2xl text-sky-600">
                ◫
              </span>

              <h1 className="text-lg font-black">
                Expected Packages
              </h1>
            </div>

            <Link
              href="/dashboard"
              className="rounded-xl border border-sky-200 bg-white px-4 py-2 text-sm font-bold text-sky-700"
            >
              Back to Dashboard
            </Link>
          </div>
        </header>

        <main className="mx-auto max-w-[1500px] space-y-6 p-4 sm:p-6 lg:p-7">
          <section
            className="overflow-hidden rounded-[22px] border border-sky-200 bg-[#d9f3ff] shadow-lg"
            style={{
              backgroundImage:
                "linear-gradient(90deg,rgba(226,247,255,0.99) 0%,rgba(226,247,255,0.94) 35%,rgba(226,247,255,0.10) 85%),url('/images/skyship/skyship-banner.png')",
              backgroundSize: "contain",
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right center",
            }}
          >
            <div className="max-w-xl px-6 py-8 sm:px-10 sm:py-10">
              <p className="text-xs font-black uppercase tracking-widest text-sky-700">
                SkyShip Operations
              </p>

              <h2 className="mt-3 text-3xl font-black sm:text-4xl">
                Expected Packages
              </h2>

              <p className="mt-3 text-sm font-medium">
                Register incoming shipments before they
                arrive at our Wilmington, Delaware warehouse.
                Authorized staff can attach package photos
                directly to expected shipments.
              </p>

              <a
                href="#register-package"
                className="mt-6 inline-flex rounded-xl bg-gradient-to-r from-[#06a9ee] to-[#087cdb] px-6 py-3 text-sm font-bold text-white shadow-lg"
              >
                + Register Package
              </a>
            </div>
          </section>

          <section className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black">
                Pre-Alert Management
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Manage customer shipments awaiting USA
                warehouse arrival.
              </p>
            </div>

            <div className="rounded-2xl border border-sky-200 bg-white/85 px-6 py-4 shadow-sm">
              <p className="text-xs font-bold uppercase text-slate-500">
                Awaiting Arrival
              </p>
              <p className="mt-1 text-3xl font-black text-sky-700">
                {loadingPreAlerts
                  ? "..."
                  : preAlerts.length}
              </p>
            </div>
          </section>

          <div className="grid items-start gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <section
              id="register-package"
              className="rounded-[22px] border border-sky-200 bg-white/90 p-6 shadow-lg sm:p-7"
            >
              <p className="text-xs font-black uppercase tracking-widest text-sky-600">
                New Pre-Alert
              </p>

              <h2 className="mt-2 text-2xl font-black">
                Add Expected Package
              </h2>

              <p className="mt-3 text-sm text-slate-600">
                Register a tracking number, then attach
                photos to its expected package card.
              </p>

              <form
                onSubmit={createPreAlert}
                className="mt-7 space-y-5"
              >
                <div>
                  <label
                    htmlFor="expected-customer"
                    className="mb-2 block text-sm font-bold"
                  >
                    Customer
                  </label>

                  <select
                    id="expected-customer"
                    value={selectedCustomer}
                    onChange={(event) =>
                      setSelectedCustomer(
                        event.target.value
                      )
                    }
                    disabled={loadingCustomers || saving}
                    className={inputClass}
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
                          "NO CODE"}
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
                    className="mb-2 block text-sm font-bold"
                  >
                    Tracking Number
                  </label>

                  <input
                    id="expected-tracking"
                    value={trackingNumber}
                    onChange={(event) =>
                      setTrackingNumber(
                        event.target.value
                      )
                    }
                    disabled={saving}
                    placeholder="Enter carrier tracking number"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label
                    htmlFor="expected-carrier"
                    className="mb-2 block text-sm font-bold"
                  >
                    Carrier
                  </label>

                  <input
                    id="expected-carrier"
                    value={carrier}
                    onChange={(event) =>
                      setCarrier(event.target.value)
                    }
                    disabled={saving}
                    placeholder="FedEx, UPS, DHL, USPS..."
                    className={inputClass}
                  />
                </div>

                {error && (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    <p className="font-black">Error</p>
                    <p className="mt-1">{error}</p>
                  </div>
                )}

                {message && (
                  <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
                    <p className="font-black">
                      Expected Package Registered
                    </p>
                    <p className="mt-1">{message}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={saving || loadingCustomers}
                  className="w-full rounded-xl bg-gradient-to-r from-[#06a9ee] to-[#087cdb] px-6 py-4 font-black text-white shadow-lg disabled:opacity-50"
                >
                  {saving
                    ? "Adding Expected Package..."
                    : "Add Expected Package"}
                </button>
              </form>
            </section>

            <section className="rounded-[22px] border border-sky-200 bg-white/90 p-6 shadow-lg sm:p-7">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-sky-600">
                    Awaiting Arrival
                  </p>

                  <h2 className="mt-2 text-2xl font-black">
                    Current Expected Packages
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    void loadExpectedPackages()
                  }
                  disabled={loadingPreAlerts}
                  className="rounded-xl border border-sky-200 bg-white px-5 py-3 text-sm font-bold text-sky-700"
                >
                  {loadingPreAlerts
                    ? "Refreshing..."
                    : "↻ Refresh"}
                </button>
              </div>

              {loadingPreAlerts ? (
                <p className="mt-7 text-slate-600">
                  Loading expected packages...
                </p>
              ) : preAlerts.length === 0 ? (
                <p className="mt-7 rounded-xl bg-sky-50 p-5 text-slate-600">
                  No expected packages are currently
                  awaiting arrival.
                </p>
              ) : (
                <div className="mt-7 space-y-4">
                  {preAlerts.map((alert) => {
                    const customer = customerLabel(
                      alert.customer_id
                    );

                    const isOpen =
                      openPhotoId === alert.id;

                    return (
                      <article
                        key={alert.id}
                        className="rounded-2xl border border-sky-200 bg-gradient-to-br from-white to-[#edf8ff] p-5 shadow-sm"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div className="min-w-0">
                            <p className="text-xs font-black uppercase text-sky-600">
                              {customer.code}
                            </p>

                            <h3 className="mt-2 break-all text-xl font-black">
                              {alert.tracking_number}
                            </h3>

                            <p className="mt-2 text-sm text-slate-600">
                              {customer.name}
                            </p>
                          </div>

                          <span className="rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-black uppercase text-amber-700">
                            Expected
                          </span>
                        </div>

                        <div className="mt-5 grid gap-3 sm:grid-cols-2">
                          <InfoBox
                            title="Carrier"
                            value={
                              alert.carrier ||
                              "Not specified"
                            }
                          />

                          <InfoBox
                            title="Created"
                            value={formatDate(
                              alert.created_at
                            )}
                          />
                        </div>

                        <div className="mt-5 border-t border-sky-200 pt-4">
                          <button
                            type="button"
                            onClick={() =>
                              isOpen
                                ? setOpenPhotoId(null)
                                : openPhotoSection(alert.id)
                            }
                            disabled={uploading}
                            className="w-full rounded-xl bg-gradient-to-r from-[#06a9ee] to-[#087cdb] px-5 py-3 text-sm font-black text-white shadow-md disabled:opacity-50"
                          >
                            {isOpen
                              ? "Close Photo Upload"
                              : "📷 Add Package Photos"}
                          </button>
                        </div>

                        {isOpen && (
                          <div className="mt-4 space-y-4 rounded-xl border border-sky-200 bg-white p-4">
                            <div>
                              <p className="font-black text-sky-800">
                                Package Photos
                              </p>
                              <p className="mt-1 text-xs text-slate-600">
                                Only SkyShip administrators
                                and authorized staff may
                                upload photos. Customers
                                have view-only access.
                              </p>
                            </div>

                            <div>
                              <label className="mb-2 block text-sm font-bold">
                                Select Photos
                              </label>
                              <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                multiple
                                disabled={uploading}
                                onChange={choosePhotos}
                                className="block w-full rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm"
                              />
                              <p className="mt-2 text-xs text-slate-500">
                                JPEG, PNG, or WebP. Maximum
                                10 MB per photo.
                              </p>
                            </div>

                            {selectedPhotos.length > 0 && (
                              <p className="text-sm font-bold text-sky-700">
                                {selectedPhotos.length} photo
                                {selectedPhotos.length === 1
                                  ? ""
                                  : "s"}{" "}
                                selected
                              </p>
                            )}

                            <div>
                              <label className="mb-2 block text-sm font-bold">
                                Photo Category
                              </label>
                              <select
                                value={photoType}
                                onChange={(event) =>
                                  setPhotoType(
                                    event.target.value as PhotoType
                                  )
                                }
                                disabled={uploading}
                                className={inputClass}
                              >
                                <option value="package">
                                  Package
                                </option>
                                <option value="label">
                                  Shipping Label
                                </option>
                                <option value="weight">
                                  Weight
                                </option>
                                <option value="damage">
                                  Damage
                                </option>
                                <option value="other">
                                  Other
                                </option>
                              </select>
                            </div>

                            <div>
                              <label className="mb-2 block text-sm font-bold">
                                Caption (Optional)
                              </label>
                              <input
                                value={photoCaption}
                                onChange={(event) =>
                                  setPhotoCaption(
                                    event.target.value
                                  )
                                }
                                disabled={uploading}
                                placeholder="Package received in warehouse..."
                                className={inputClass}
                              />
                            </div>

                            {photoError && (
                              <div
                                role="alert"
                                className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                              >
                                {photoError}
                              </div>
                            )}

                            {photoMessage && (
                              <div
                                role="status"
                                className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm font-semibold text-green-800"
                              >
                                {photoMessage}
                              </div>
                            )}

                            <button
                              type="button"
                              disabled={
                                uploading ||
                                selectedPhotos.length === 0
                              }
                              onClick={() =>
                                void uploadPhotos(alert)
                              }
                              className="w-full rounded-xl bg-sky-700 px-5 py-3 font-black text-white disabled:opacity-50"
                            >
                              {uploading
                                ? "Uploading Photos..."
                                : `Upload ${selectedPhotos.length} Photo${selectedPhotos.length === 1 ? "" : "s"}`}
                            </button>
                          </div>
                        )}
                      </article>
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
      <p className="text-xs font-black uppercase text-slate-500">
        {title}
      </p>

      <p className="mt-2 break-words text-sm font-semibold text-[#073a68]">
        {value}
      </p>
    </div>
  );
}