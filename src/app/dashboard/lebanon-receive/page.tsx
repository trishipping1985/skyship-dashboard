"use client";

import {
  FormEvent,
  Suspense,
  useCallback,
  useEffect,
  useState,
} from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

type PackageRow = {
  id: string;
  sky_code: string | null;
  carrier_tracking_number: string | null;
  customer_id: string | null;
  customer_code: string | null;
  carrier: string | null;
  status: string | null;
  warehouse_location: string | null;
  received_at: string | null;
  lebanon_received_at: string | null;
};

const PACKAGE_FIELDS = `
  id,
  sky_code,
  carrier_tracking_number,
  customer_id,
  customer_code,
  carrier,
  status,
  warehouse_location,
  received_at,
  lebanon_received_at
`;

function extractSkyCode(value: string) {
  const cleanValue = value.trim();

  if (!cleanValue) return "";

  try {
    const parsed = JSON.parse(cleanValue);

    if (
      parsed &&
      typeof parsed === "object" &&
      typeof parsed.sky_code === "string"
    ) {
      return parsed.sky_code.trim().toUpperCase();
    }
  } catch {
    // Continue checking other formats.
  }

  try {
    const url = new URL(cleanValue);
    const code = url.searchParams.get("code");

    if (code) {
      const match = code.match(/SKY-PKG-\d+/i);
      if (match) return match[0].toUpperCase();
    }
  } catch {
    // Not a URL.
  }

  const match = cleanValue.match(/SKY-PKG-\d+/i);

  return match
    ? match[0].toUpperCase()
    : cleanValue.toUpperCase();
}

function formatDate(value: string | null) {
  if (!value) return "Not recorded";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "Not available"
    : date.toLocaleString();
}

function InfoCard({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-[#c6e5f7] bg-gradient-to-br from-white to-[#edf8ff] p-5 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {title}
      </p>

      <p className="mt-2 break-words text-base font-extrabold text-[#073a68] sm:text-lg">
        {value}
      </p>
    </div>
  );
}

function LebanonReceiveLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#f2f9ff] via-[#e2f2ff] to-[#c8e8fa] p-6">
      <div className="rounded-2xl border border-sky-200 bg-white px-8 py-6 font-bold text-[#073a68] shadow-xl">
        Loading Lebanon Receiving...
      </div>
    </main>
  );
}

export default function LebanonReceivePage() {
  return (
    <Suspense fallback={<LebanonReceiveLoading />}>
      <LebanonReceiveContent />
    </Suspense>
  );
}

function LebanonReceiveContent() {
  const searchParams = useSearchParams();

  const [scanValue, setScanValue] = useState("");
  const [packageData, setPackageData] =
    useState<PackageRow | null>(null);

  const [searching, setSearching] = useState(false);
  const [receiving, setReceiving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const findPackage = useCallback(
    async (value: string) => {
      setError("");
      setSuccess("");
      setPackageData(null);

      const skyCode = extractSkyCode(value);

      if (!skyCode) {
        setError("Scan or enter a SkyShip package code.");
        return;
      }

      setSearching(true);
      setScanValue(skyCode);

      try {
        const { data, error: searchError } =
          await supabase
            .from("packages")
            .select(PACKAGE_FIELDS)
            .eq("sky_code", skyCode)
            .maybeSingle();

        if (searchError) {
          console.error(
            "PACKAGE SEARCH ERROR:",
            searchError
          );

          setError(
            `SEARCH ERROR: ${searchError.message}`
          );
          return;
        }

        if (!data) {
          setError(`No package found for ${skyCode}.`);
          return;
        }

        setPackageData(data as PackageRow);
      } catch (err) {
        console.error("PACKAGE SEARCH EXCEPTION:", err);

        setError(
          err instanceof Error
            ? err.message
            : "An unexpected search error occurred."
        );
      } finally {
        setSearching(false);
      }
    },
    []
  );

  useEffect(() => {
    const code = searchParams.get("code");

    if (!code) return;

    const skyCode = extractSkyCode(code);

    if (skyCode) {
      setScanValue(skyCode);
      void findPackage(skyCode);
    }
  }, [searchParams, findPackage]);

  async function searchPackage(
    e?: FormEvent<HTMLFormElement>
  ) {
    e?.preventDefault();
    await findPackage(scanValue);
  }

  async function refreshPackage(id: string) {
    const { data, error: refreshError } =
      await supabase
        .from("packages")
        .select(PACKAGE_FIELDS)
        .eq("id", id)
        .maybeSingle();

    if (refreshError) {
      throw new Error(
        `Could not verify package: ${refreshError.message}`
      );
    }

    return data as PackageRow | null;
  }

  async function markReceivedInLebanon() {
    if (!packageData?.id || receiving) return;

    if (packageData.lebanon_received_at) {
      setError(
        "This package has already been received in Lebanon."
      );
      return;
    }

    if (!packageData.received_at) {
      setError(
        "This package has not yet been received at the USA warehouse."
      );
      return;
    }

    setError("");
    setSuccess("");
    setReceiving(true);

    const packageId = packageData.id;

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setError(
          "Your login session has expired. Please sign in again."
        );
        return;
      }

      console.info("LEBANON RECEIVE: authenticated", {
        packageId,
        userId: user.id,
      });

      const receivedTime = new Date().toISOString();

      // Update the existing package only.
      // Never insert or create a duplicate package.
      const { data, error: updateError } =
        await supabase
          .from("packages")
          .update({
            status: "received_in_lebanon",
            lebanon_received_at: receivedTime,
            lebanon_received_by: user.id,
          })
          .eq("id", packageId)
          .is("lebanon_received_at", null)
          .not("received_at", "is", null)
          .select(PACKAGE_FIELDS)
          .maybeSingle();

      console.info("LEBANON RECEIVE: update result", {
        data,
        error: updateError,
      });

      if (updateError) {
        console.error(
          "LEBANON RECEIVE UPDATE ERROR:",
          updateError
        );

        setError(
          `UPDATE ERROR: ${updateError.message}`
        );
        return;
      }

      // Always read the database again.
      // An update response alone is not sufficient
      // proof that the record was saved.
      const current = await refreshPackage(packageId);

      if (!current) {
        setError(
          "Package verification failed. The record is not visible after the update."
        );
        return;
      }

      setPackageData(current);

      if (
        current.lebanon_received_at &&
        current.status === "received_in_lebanon"
      ) {
        setSuccess(
          `${current.sky_code} was successfully received in Lebanon. The database update is confirmed.`
        );
        return;
      }

      if (current.lebanon_received_at) {
        setError(
          "Lebanon arrival was recorded, but the package status was not updated correctly. Please check the database."
        );
        return;
      }

      if (!current.received_at) {
        setError(
          "The package is not marked as received at the USA warehouse."
        );
        return;
      }

      if (!data) {
        setError(
          "Supabase returned no updated package. The update may be blocked by a database policy or condition. No Lebanon arrival was saved."
        );
        return;
      }

      setError(
        "The database did not retain the Lebanon receiving update. Please check database triggers and permissions."
      );
    } catch (err) {
      console.error(
        "LEBANON RECEIVE EXCEPTION:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "An unexpected error occurred while confirming receipt."
      );
    } finally {
      setReceiving(false);
    }
  }

  function receiveNextPackage() {
    setScanValue("");
    setPackageData(null);
    setError("");
    setSuccess("");

    window.history.replaceState(
      {},
      "",
      "/dashboard/lebanon-receive"
    );
  }

  const alreadyReceived =
    Boolean(packageData?.lebanon_received_at);

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#f2f9ff] via-[#e2f2ff] to-[#c8e8fa] text-[#073a68]">
      <header className="border-b border-sky-200 bg-white/80 shadow-sm backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-5 sm:px-8">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#19b8f3] to-[#0664c6] text-2xl font-black text-white shadow-lg">
              S
            </div>

            <div>
              <h1 className="text-2xl font-black tracking-tight text-[#073a68] sm:text-3xl">
                SkyShip
              </h1>

              <p className="text-xs font-semibold text-sky-600 sm:text-sm">
                Lebanon Warehouse Control
              </p>
            </div>
          </div>

          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-xl border border-sky-200 bg-white px-5 py-3 text-sm font-bold text-[#0866ae] shadow-sm transition hover:bg-sky-50"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-6xl space-y-7 px-4 py-8 sm:px-6 sm:py-12">
        <div className="relative overflow-hidden rounded-[24px] border border-sky-200 bg-gradient-to-r from-[#e2f7ff] via-[#d5efff] to-[#a9dfff] p-7 shadow-[0_8px_28px_rgba(24,113,177,0.12)] sm:p-10">
          <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/25 blur-2xl" />

          <div className="relative">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-sky-700">
              SkyShip • Lebanon Operations
            </p>

            <h2 className="mt-3 text-3xl font-black tracking-tight text-[#073a68] sm:text-4xl">
              Lebanon Receiving
            </h2>

            <p className="mt-3 max-w-2xl text-sm font-medium leading-7 text-[#285b80] sm:text-base">
              Scan a SkyShip QR label or enter the
              package code to identify incoming
              shipments and confirm their arrival
              at the Lebanon warehouse.
            </p>

            <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white/80 px-4 py-2 text-xs font-bold text-sky-700 shadow-sm">
              <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
              Warehouse Receiving System
            </div>
          </div>
        </div>

        <form
          onSubmit={searchPackage}
          className="rounded-[22px] border border-sky-200 bg-white/90 p-5 shadow-[0_8px_28px_rgba(24,113,177,0.10)] sm:p-8"
        >
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-100 text-2xl text-sky-700">
              ▦
            </div>

            <div>
              <h3 className="text-xl font-black text-[#073a68]">
                Scan or Find Package
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Search using a SkyShip package code.
              </p>
            </div>
          </div>

          <label
            htmlFor="skyship-package-code"
            className="mb-3 block text-sm font-bold text-[#073a68]"
          >
            SkyShip Package QR / Package Code
          </label>

          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              id="skyship-package-code"
              type="text"
              value={scanValue}
              onChange={(e) =>
                setScanValue(e.target.value)
              }
              placeholder="Scan QR or enter SKY-PKG code"
              autoFocus
              className="min-w-0 flex-1 rounded-xl border border-sky-200 bg-[#f7fbff] px-5 py-4 text-base font-semibold uppercase text-[#073a68] outline-none transition placeholder:normal-case placeholder:font-normal placeholder:text-slate-400 focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
            />

            <button
              type="submit"
              disabled={searching || receiving}
              className="rounded-xl bg-gradient-to-r from-[#06a9ee] to-[#087cdb] px-8 py-4 text-base font-black text-white shadow-lg transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {searching
                ? "Searching..."
                : "Find Package"}
            </button>
          </div>

          <p className="mt-4 text-xs font-medium text-slate-500">
            Supports SkyShip QR links and manual
            SKY-PKG package codes.
          </p>
        </form>

        {searching && (
          <div className="rounded-2xl border border-sky-200 bg-white/90 p-5 font-semibold text-sky-700 shadow-sm">
            Loading package...
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700 shadow-sm"
          >
            <p className="font-black">
              PACKAGE ERROR
            </p>

            <p className="mt-2 break-words text-sm">
              {error}
            </p>
          </div>
        )}

        {success && (
          <div
            role="status"
            className="rounded-2xl border border-green-200 bg-green-50 p-5 text-green-800 shadow-sm"
          >
            <p className="font-black">
              PACKAGE RECEIVED IN LEBANON
            </p>

            <p className="mt-2 text-sm">
              {success}
            </p>
          </div>
        )}

        {packageData && (
          <div className="overflow-hidden rounded-[24px] border border-sky-200 bg-white/90 shadow-[0_8px_28px_rgba(24,113,177,0.12)]">
            <div className="border-b border-sky-100 bg-gradient-to-r from-[#edf9ff] to-[#d5efff] p-6 sm:p-8">
              <div className="flex flex-col justify-between gap-5 md:flex-row md:items-start">
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-widest text-sky-600">
                    SkyShip Package
                  </p>

                  <h3 className="mt-3 break-all text-3xl font-black tracking-tight text-[#073a68] sm:text-4xl">
                    {packageData.sky_code}
                  </h3>

                  <p className="mt-2 text-base font-bold text-[#285b80]">
                    {packageData.customer_code ||
                      "No customer code"}
                  </p>
                </div>

                {alreadyReceived ? (
                  <div className="w-fit rounded-xl border border-green-200 bg-green-50 px-5 py-3 text-xs font-black text-green-700 shadow-sm sm:text-sm">
                    ✓ RECEIVED IN LEBANON
                  </div>
                ) : (
                  <div className="w-fit rounded-xl border border-amber-200 bg-amber-50 px-5 py-3 text-xs font-black text-amber-700 shadow-sm sm:text-sm">
                    AWAITING LEBANON ARRIVAL
                  </div>
                )}
              </div>
            </div>

            <div className="p-5 sm:p-8">
              <h4 className="mb-5 text-lg font-black text-[#073a68]">
                Package Information
              </h4>

              <div className="grid gap-4 sm:grid-cols-2">
                <InfoCard
                  title="Customer"
                  value={packageData.customer_code || "—"}
                />

                <InfoCard
                  title="Carrier"
                  value={packageData.carrier || "—"}
                />

                <InfoCard
                  title="Carrier Tracking"
                  value={
                    packageData.carrier_tracking_number ||
                    "—"
                  }
                />

                <InfoCard
                  title="Current Status"
                  value={
                    packageData.status
                      ? packageData.status
                          .replace(/_/g, " ")
                          .toUpperCase()
                      : "—"
                  }
                />

                <InfoCard
                  title="USA Warehouse"
                  value={
                    packageData.warehouse_location ||
                    "Wilmington, Delaware"
                  }
                />
              </div>

              {alreadyReceived && (
                <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 p-5">
                  <p className="text-xs font-bold uppercase tracking-wide text-green-700">
                    Lebanon Received
                  </p>

                  <p className="mt-2 text-lg font-black text-[#073a68]">
                    {formatDate(
                      packageData.lebanon_received_at
                    )}
                  </p>
                </div>
              )}

              {!alreadyReceived && (
                <button
                  type="button"
                  onClick={markReceivedInLebanon}
                  disabled={receiving || searching}
                  className="mt-8 w-full rounded-xl bg-gradient-to-r from-[#06b6d4] to-[#087cdb] px-6 py-5 text-base font-black text-white shadow-lg transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50 sm:text-lg"
                >
                  {receiving
                    ? "Receiving Package..."
                    : "Confirm Received in Lebanon"}
                </button>
              )}

              <button
                type="button"
                onClick={receiveNextPackage}
                disabled={receiving}
                className="mt-4 w-full rounded-xl border border-sky-200 bg-white px-6 py-4 text-sm font-bold text-sky-700 transition hover:bg-sky-50 disabled:opacity-50 sm:text-base"
              >
                Scan Next Package
              </button>
            </div>
          </div>
        )}

        <footer className="pt-3 text-center text-xs font-semibold text-slate-500">
          SkyShip LLC — Beyond Limits. Delivered.
        </footer>
      </section>
    </main>
  );
}