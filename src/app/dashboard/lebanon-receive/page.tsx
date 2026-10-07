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
  weight_kg: number | null;
  length_cm: number | null;
  width_cm: number | null;
  height_cm: number | null;
  status: string | null;
  warehouse_location: string | null;
  received_at: string | null;
  lebanon_received_at: string | null;
};

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

  function extractSkyCode(value: string) {
    const cleanValue = value.trim();

    if (!cleanValue) {
      return "";
    }

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
      // Not JSON. Continue checking the scanned value.
    }

    try {
      const url = new URL(cleanValue);

      const codeFromUrl = url.searchParams.get("code");

      if (codeFromUrl) {
        const match = codeFromUrl.match(
          /SKY-PKG-\d+/i
        );

        if (match) {
          return match[0].toUpperCase();
        }
      }
    } catch {
      // Not a full URL. Continue checking.
    }

    const match = cleanValue.match(
      /SKY-PKG-\d+/i
    );

    if (match) {
      return match[0].toUpperCase();
    }

    return cleanValue.toUpperCase();
  }

  const findPackage = useCallback(
    async (value: string) => {
      setError("");
      setSuccess("");
      setPackageData(null);

      const skyCode = extractSkyCode(value);

      if (!skyCode) {
        setError(
          "Scan or enter a SkyShip package code."
        );
        return;
      }

      setSearching(true);
      setScanValue(skyCode);

      try {
        const { data, error: searchError } =
          await supabase
            .from("packages")
            .select(
              `
                id,
                sky_code,
                carrier_tracking_number,
                customer_id,
                customer_code,
                carrier,
                weight_kg,
                length_cm,
                width_cm,
                height_cm,
                status,
                warehouse_location,
                received_at,
                lebanon_received_at
              `
            )
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
          setError(
            `No package found for ${skyCode}.`
          );

          return;
        }

        setPackageData(data as PackageRow);
      } catch (err) {
        console.error(err);

        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError(
            "An unexpected error occurred while searching."
          );
        }
      } finally {
        setSearching(false);
      }
    },
    []
  );

  useEffect(() => {
    const code = searchParams.get("code");

    if (!code) {
      return;
    }

    const skyCode = extractSkyCode(code);

    if (!skyCode) {
      return;
    }

    setScanValue(skyCode);
    void findPackage(skyCode);
  }, [searchParams, findPackage]);

  async function searchPackage(
    e?: FormEvent<HTMLFormElement>
  ) {
    if (e) {
      e.preventDefault();
    }

    await findPackage(scanValue);
  }

  async function markReceivedInLebanon() {
    if (!packageData?.id) {
      return;
    }

    if (packageData.lebanon_received_at) {
      setError(
        "This package has already been received in Lebanon."
      );
      return;
    }

    setError("");
    setSuccess("");
    setReceiving(true);

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

      const receivedTime =
        new Date().toISOString();

      const { data, error: updateError } =
        await supabase
          .from("packages")
          .update({
            lebanon_received_at: receivedTime,
            lebanon_received_by: user.id,
          })
          .eq("id", packageData.id)
          .is("lebanon_received_at", null)
          .select(
            `
              id,
              sky_code,
              carrier_tracking_number,
              customer_id,
              customer_code,
              carrier,
              weight_kg,
              length_cm,
              width_cm,
              height_cm,
              status,
              warehouse_location,
              received_at,
              lebanon_received_at
            `
          )
          .maybeSingle();

      if (updateError) {
        console.error(
          "LEBANON RECEIVE ERROR:",
          updateError
        );

        setError(
          `UPDATE ERROR: ${updateError.message}`
        );

        return;
      }

      if (!data) {
        const {
          data: currentPackage,
          error: refreshError,
        } = await supabase
          .from("packages")
          .select(
            `
              id,
              sky_code,
              carrier_tracking_number,
              customer_id,
              customer_code,
              carrier,
              weight_kg,
              length_cm,
              width_cm,
              height_cm,
              status,
              warehouse_location,
              received_at,
              lebanon_received_at
            `
          )
          .eq("id", packageData.id)
          .single();

        if (refreshError) {
          setError(
            `REFRESH ERROR: ${refreshError.message}`
          );
          return;
        }

        setPackageData(
          currentPackage as PackageRow
        );

        setError(
          "This package was already received in Lebanon."
        );

        return;
      }

      setPackageData(data as PackageRow);

      setSuccess(
        `${data.sky_code} received in Lebanon successfully.`
      );
    } catch (err) {
      console.error(err);

      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(
          "An unexpected error occurred."
        );
      }
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

  function formatDate(value: string | null) {
    if (!value) {
      return "—";
    }

    return new Date(value).toLocaleString();
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 text-white">

      <header className="border-b border-white/10 bg-white/5">

        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">

          <div>

            <h1 className="text-3xl font-bold">
              SkyShip
            </h1>

            <p className="mt-1 text-sm text-slate-300">
              Lebanon Receiving
            </p>

          </div>

          <Link
            href="/dashboard"
            className="rounded-xl border border-white/15 px-5 py-3 font-semibold hover:bg-white/10"
          >
            Back to Dashboard
          </Link>

        </div>

      </header>

      <section className="mx-auto max-w-5xl px-6 py-12">

        <div>

          <p className="text-sm font-bold uppercase tracking-widest text-sky-400">
            Lebanon Warehouse
          </p>

          <h2 className="mt-2 text-4xl font-bold">
            Scan Package QR
          </h2>

          <p className="mt-3 text-lg text-slate-300">
            Scan the SkyShip QR label to identify the
            package when it arrives in Lebanon.
          </p>

        </div>

        <form
          onSubmit={searchPackage}
          className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-7"
        >

          <label className="mb-3 block text-lg font-semibold">
            SkyShip Package QR / Package Code
          </label>

          <div className="flex flex-col gap-4 md:flex-row">

            <input
              type="text"
              value={scanValue}
              onChange={(e) =>
                setScanValue(e.target.value)
              }
              placeholder="Scan QR or enter SKY-PKG code"
              autoFocus
              className="flex-1 rounded-xl border border-white/20 bg-slate-950/60 px-5 py-4 text-lg uppercase outline-none focus:border-sky-400"
            />

            <button
              type="submit"
              disabled={searching}
              className="rounded-xl bg-sky-500 px-8 py-4 text-lg font-bold hover:bg-sky-400 disabled:opacity-50"
            >
              {searching
                ? "Searching..."
                : "Find Package"}
            </button>

          </div>

          <p className="mt-3 text-sm text-slate-400">
            Scan a SkyShip QR label or manually enter
            the SKY-PKG code.
          </p>

        </form>

        {searching && (
          <div className="mt-6 rounded-2xl border border-sky-500/30 bg-sky-500/10 p-5 text-sky-200">
            Loading package...
          </div>
        )}

        {error && (
          <div className="mt-6 rounded-2xl border border-red-500/50 bg-red-500/10 p-5 text-red-200">

            <p className="font-bold">
              ERROR
            </p>

            <p className="mt-2 break-words">
              {error}
            </p>

          </div>
        )}

        {success && (
          <div className="mt-6 rounded-2xl border border-green-500/50 bg-green-500/10 p-5 text-green-200">

            <p className="font-bold">
              PACKAGE RECEIVED IN LEBANON
            </p>

            <p className="mt-2">
              {success}
            </p>

          </div>
        )}

        {packageData && (
          <div className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-7">

            <div className="flex flex-col justify-between gap-5 md:flex-row md:items-start">

              <div>

                <p className="text-sm font-bold uppercase tracking-wider text-sky-400">
                  SkyShip Package
                </p>

                <h3 className="mt-2 text-4xl font-black">
                  {packageData.sky_code}
                </h3>

                <p className="mt-2 text-lg font-semibold text-slate-300">
                  {packageData.customer_code ||
                    "No customer code"}
                </p>

              </div>

              {packageData.lebanon_received_at ? (
                <div className="rounded-xl border border-green-500/40 bg-green-500/10 px-5 py-3 font-bold text-green-300">
                  RECEIVED IN LEBANON
                </div>
              ) : (
                <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-5 py-3 font-bold text-amber-300">
                  NOT YET RECEIVED IN LEBANON
                </div>
              )}

            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">

              <InfoCard
                title="Customer"
                value={
                  packageData.customer_code ||
                  "—"
                }
              />

              <InfoCard
                title="Carrier"
                value={
                  packageData.carrier || "—"
                }
              />

              <InfoCard
                title="Carrier Tracking"
                value={
                  packageData.carrier_tracking_number ||
                  "—"
                }
              />

              <InfoCard
                title="Actual Weight"
                value={
                  packageData.weight_kg !== null
                    ? `${packageData.weight_kg} kg`
                    : "—"
                }
              />

              <InfoCard
                title="Dimensions"
                value={
                  packageData.length_cm !== null &&
                  packageData.width_cm !== null &&
                  packageData.height_cm !== null
                    ? `${packageData.length_cm} × ${packageData.width_cm} × ${packageData.height_cm} cm`
                    : "—"
                }
              />

              <InfoCard
                title="Current Status"
                value={
                  packageData.status || "—"
                }
              />

              <InfoCard
                title="USA Warehouse"
                value={
                  packageData.warehouse_location ||
                  "Wilmington, Delaware"
                }
              />

              <InfoCard
                title="USA Received"
                value={formatDate(
                  packageData.received_at
                )}
              />

            </div>

            {packageData.lebanon_received_at && (
              <div className="mt-5 rounded-2xl border border-green-500/30 bg-green-500/10 p-5">

                <p className="text-sm text-green-300">
                  Lebanon Received
                </p>

                <p className="mt-1 text-lg font-bold">
                  {formatDate(
                    packageData.lebanon_received_at
                  )}
                </p>

              </div>
            )}

            {!packageData.lebanon_received_at && (
              <button
                type="button"
                onClick={markReceivedInLebanon}
                disabled={receiving}
                className="mt-8 w-full rounded-xl bg-green-500 px-6 py-5 text-xl font-black text-slate-950 hover:bg-green-400 disabled:opacity-50"
              >
                {receiving
                  ? "Receiving..."
                  : "Confirm Received in Lebanon"}
              </button>
            )}

            <button
              type="button"
              onClick={receiveNextPackage}
              className="mt-4 w-full rounded-xl border border-white/20 px-6 py-4 font-semibold hover:bg-white/10"
            >
              Scan Next Package
            </button>

          </div>
        )}

      </section>

    </main>
  );
}

function LebanonReceiveLoading() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 text-white">
      <div className="mx-auto max-w-5xl px-6 py-12">
        <div className="rounded-2xl border border-sky-500/30 bg-sky-500/10 p-5 text-sky-200">
          Loading Lebanon Receiving...
        </div>
      </div>
    </main>
  );
}

function InfoCard({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-5">

      <p className="text-sm text-slate-400">
        {title}
      </p>

      <p className="mt-2 break-words text-lg font-semibold">
        {value}
      </p>

    </div>
  );
}