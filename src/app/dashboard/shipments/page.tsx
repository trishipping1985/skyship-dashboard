"use client";

import { FormEvent, useRef, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";

type ShipmentStatus =
  | "received"
  | "shipped"
  | "in_transit"
  | "received_in_lebanon"
  | "out_for_delivery"
  | "delivered";

type Shipment = {
  id: string;
  sky_code: string | null;
  package_code: string | null;
  carrier_tracking_number: string | null;
  tracking_number: string | null;
  customer_id: string | null;
  customer_code: string | null;
  carrier: string | null;
  status: string | null;
  received_at: string | null;
  shipped_at: string | null;
  lebanon_received_at: string | null;
};

type PackageEvent = {
  id: string;
  status: string;
  created_at: string | null;
};

const PACKAGE_FIELDS =
  "id, sky_code, package_code, carrier_tracking_number, tracking_number, customer_id, customer_code, carrier, status, received_at, shipped_at, lebanon_received_at";

const EVENT_FIELDS = "id, status, created_at";

const STATUSES: {
  value: ShipmentStatus;
  label: string;
}[] = [
  {
    value: "received",
    label: "Received in USA Warehouse",
  },
  {
    value: "shipped",
    label: "Shipped from USA Warehouse",
  },
  {
    value: "in_transit",
    label: "In Transit",
  },
  {
    value: "received_in_lebanon",
    label: "Received in Lebanon Warehouse",
  },
  {
    value: "out_for_delivery",
    label: "Out for Delivery (Lebanon)",
  },
  {
    value: "delivered",
    label: "Delivered",
  },
];

const STATUS_ORDER = STATUSES.map(
  (item) => item.value
);

function formatDate(value: string | null) {
  if (!value) return "Not recorded";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "Not available"
    : date.toLocaleString();
}

function statusLabel(value: string | null) {
  if (value === "expected") {
    return "Expected Package";
  }

  return (
    STATUSES.find((item) => item.value === value)
      ?.label ||
    (value || "Unknown")
      .replace(/_/g, " ")
      .toUpperCase()
  );
}

function displayStatus(
  shipment: Shipment
): ShipmentStatus | null {
  const status =
    shipment.status as ShipmentStatus;

  // Compatibility with older Lebanon receiving
  // records that retained the in_transit status.
  if (
    status === "in_transit" &&
    shipment.lebanon_received_at
  ) {
    return "received_in_lebanon";
  }

  if (STATUS_ORDER.includes(status)) {
    return status;
  }

  return null;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "An unexpected error occurred.";
}

function getSkippedStages(
  current: ShipmentStatus,
  target: ShipmentStatus
) {
  const currentIndex =
    STATUS_ORDER.indexOf(current);

  const targetIndex =
    STATUS_ORDER.indexOf(target);

  if (targetIndex <= currentIndex + 1) {
    return [];
  }

  return STATUSES.slice(
    currentIndex + 1,
    targetIndex
  );
}

function validateProgression(
  shipment: Shipment,
  target: ShipmentStatus
): string | null {
  const current = displayStatus(shipment);

  if (!current) {
    return "This package has an unsupported current status.";
  }

  const currentIndex =
    STATUS_ORDER.indexOf(current);

  const nextIndex =
    STATUS_ORDER.indexOf(target);

  if (nextIndex === currentIndex) {
    return "The package already has this status.";
  }

  if (nextIndex < currentIndex) {
    return "Shipment statuses cannot move backward.";
  }

  // Lebanon receipt is an actual warehouse
  // confirmation, never an inferred stage.
  if (target === "received_in_lebanon") {
    if (
      shipment.status !== "in_transit" ||
      shipment.lebanon_received_at
    ) {
      return (
        "The shipment must be In Transit " +
        "and not yet received in Lebanon " +
        "before Lebanon receipt can be confirmed."
      );
    }
  }

  if (
    target === "out_for_delivery" ||
    target === "delivered"
  ) {
    if (!shipment.lebanon_received_at) {
      return (
        "Confirm Lebanon warehouse receipt " +
        "before updating to a delivery stage."
      );
    }
  }

  return null;
}

function ShipmentProgress({
  shipment,
}: {
  shipment: Shipment;
}) {
  const current = displayStatus(shipment);

  const currentIndex = current
    ? STATUS_ORDER.indexOf(current)
    : -1;

  return (
    <div className="mt-7 rounded-2xl border border-sky-200 bg-[#f8fcff] p-5 sm:p-6">
      <h3 className="text-xl font-black text-[#0879c5]">
        Shipment Progress
      </h3>

      <p className="mt-2 text-sm text-slate-600">
        Six-stage shipping journey from USA to Lebanon.
      </p>

      {currentIndex === -1 && (
        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          The current shipment status is not recognized.
          Progress cannot be determined.
        </p>
      )}

      <div className="mt-6 space-y-0">
        {STATUSES.map((stage, index) => {
          const completed =
            currentIndex >= 0 &&
            index < currentIndex;

          const active =
            currentIndex >= 0 &&
            index === currentIndex;

          const reached = completed || active;

          const isLast =
            index === STATUSES.length - 1;

          return (
            <div
              key={stage.value}
              className="flex items-stretch gap-4"
            >
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 text-sm font-black ${
                    active
                      ? "border-[#0879c5] bg-[#0879c5] text-white shadow-md"
                      : completed
                      ? "border-green-600 bg-green-600 text-white"
                      : "border-slate-300 bg-white text-slate-400"
                  }`}
                >
                  {completed
                    ? "✓"
                    : index + 1}
                </div>

                {!isLast && (
                  <div
                    className={`my-1 min-h-7 w-1 flex-1 rounded-full ${
                      completed
                        ? "bg-green-500"
                        : "bg-slate-200"
                    }`}
                  />
                )}
              </div>

              <div
                className={`mb-3 min-w-0 flex-1 rounded-xl border p-4 ${
                  active
                    ? "border-sky-400 bg-sky-100"
                    : completed
                    ? "border-green-200 bg-green-50"
                    : "border-slate-200 bg-white"
                }`}
              >
                <p
                  className={`font-bold ${
                    active
                      ? "text-[#0879c5]"
                      : completed
                      ? "text-green-800"
                      : "text-slate-500"
                  }`}
                >
                  {stage.label}
                </p>

                <p className="mt-1 text-xs font-semibold">
                  {active
                    ? "CURRENT STAGE"
                    : completed
                    ? "PREVIOUS STAGE"
                    : "PENDING"}
                </p>

                {reached &&
                  stage.value === "received" &&
                  shipment.received_at && (
                    <p className="mt-2 text-xs text-slate-600">
                      Recorded:{" "}
                      {formatDate(
                        shipment.received_at
                      )}
                    </p>
                  )}

                {reached &&
                  stage.value === "shipped" &&
                  shipment.shipped_at && (
                    <p className="mt-2 text-xs text-slate-600">
                      Recorded:{" "}
                      {formatDate(
                        shipment.shipped_at
                      )}
                    </p>
                  )}

                {reached &&
                  stage.value ===
                    "received_in_lebanon" &&
                  shipment.lebanon_received_at && (
                    <p className="mt-2 text-xs text-slate-600">
                      Recorded:{" "}
                      {formatDate(
                        shipment.lebanon_received_at
                      )}
                    </p>
                  )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-3 text-xs leading-5 text-slate-500">
        Progress reflects the current database status.
        Previous stages indicate workflow position,
        not independently verified history events.
        Only existing recorded timestamps are shown.
        Skipped stages do not receive invented
        timestamps or history entries.
      </p>
    </div>
  );
}

// New Stage 4 component.
// Displays actual package_events records.
// It never creates, modifies, or deletes events.
function ShipmentHistory({
  events,
  loading,
  error,
  onRefresh,
}: {
  events: PackageEvent[];
  loading: boolean;
  error: string;
  onRefresh: () => void;
}) {
  return (
    <div className="mt-7 rounded-2xl border border-sky-200 bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-xl font-black text-[#0879c5]">
            Shipment History
          </h3>

          <p className="mt-2 text-sm text-slate-600">
            Actual status events recorded in SkyShip.
          </p>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="rounded-xl border border-sky-300 bg-sky-50 px-4 py-3 text-sm font-bold text-[#0879c5] transition hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading
            ? "Loading..."
            : "Refresh History"}
        </button>
      </div>

      {loading && (
        <div
          role="status"
          className="mt-5 rounded-xl border border-sky-100 bg-[#f8fcff] p-4 text-sm font-semibold text-sky-800"
        >
          Loading shipment history...
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          <p className="font-bold">
            History could not be loaded.
          </p>

          <p className="mt-2 break-words">
            {error}
          </p>

          <p className="mt-2">
            No shipment records were changed.
          </p>
        </div>
      )}

      {!loading &&
        !error &&
        events.length === 0 && (
          <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            No history events are visible for this package.
            This may mean no events are recorded or the
            current account cannot read them.
          </div>
        )}

      {!loading &&
        !error &&
        events.length > 0 && (
          <>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-bold text-slate-700">
                {events.length} recorded{" "}
                {events.length === 1
                  ? "event"
                  : "events"}
              </p>

              <p className="text-xs text-slate-500">
                Oldest to newest
              </p>
            </div>

            <ol className="mt-5 space-y-0">
              {events.map((event, index) => {
                const isLast =
                  index === events.length - 1;

                return (
                  <li
                    key={event.id}
                    className="flex items-stretch gap-4"
                  >
                    <div className="flex flex-col items-center">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-sky-400 bg-sky-100 text-sm font-black text-[#0879c5]">
                        {index + 1}
                      </div>

                      {!isLast && (
                        <div className="my-1 min-h-6 w-0.5 flex-1 bg-sky-200" />
                      )}
                    </div>

                    <div className="mb-3 min-w-0 flex-1 rounded-xl border border-sky-100 bg-[#f8fcff] p-4">
                      <p className="font-bold text-[#073a68]">
                        {statusLabel(event.status)}
                      </p>

                      <p className="mt-2 text-sm text-slate-600">
                        {formatDate(event.created_at)}
                      </p>

                      <p className="mt-2 text-xs font-medium text-slate-500">
                        Recorded database event
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </>
        )}

      <p className="mt-4 text-xs leading-5 text-slate-500">
        This history is read directly from the
        package_events table. It does not infer
        skipped stages, generate timestamps,
        or create notifications. Event times
        are displayed in your browser's local
        time zone.
      </p>
    </div>
  );
}

export default function ShipmentsPage() {
  const [search, setSearch] = useState("");

  const [shipments, setShipments] =
    useState<Shipment[]>([]);

  const [selected, setSelected] =
    useState<Shipment | null>(null);

  const [newStatus, setNewStatus] =
    useState<ShipmentStatus>("received");

  const [searching, setSearching] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [searched, setSearched] =
    useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [diagnostic, setDiagnostic] =
    useState("");

  // Stage 4: read-only history state.
  const [history, setHistory] =
    useState<PackageEvent[]>([]);

  const [historyLoading, setHistoryLoading] =
    useState(false);

  const [historyError, setHistoryError] =
    useState("");

  // Prevent older asynchronous history requests
  // from replacing a newly selected package's data.
  const historyRequestRef = useRef(0);

  const currentDisplay = selected
    ? displayStatus(selected)
    : null;

  const skippedStages = currentDisplay
    ? getSkippedStages(
        currentDisplay,
        newStatus
      )
    : [];

  async function loadHistory(
    packageId: string,
    requestId: number
  ) {
    if (requestId !== historyRequestRef.current) {
      return;
    }

    setHistoryLoading(true);
    setHistoryError("");
    setHistory([]);

    try {
      const { data, error: readError } =
        await supabase
          .from("package_events")
          .select(EVENT_FIELDS)
          .eq("package_id", packageId)
          .order("created_at", {
            ascending: true,
          })
          .order("id", {
            ascending: true,
          });

      if (requestId !== historyRequestRef.current) {
        return;
      }

      if (readError) {
        setHistoryError(readError.message);
        return;
      }

      setHistory((data || []) as PackageEvent[]);
    } catch (err) {
      if (requestId !== historyRequestRef.current) {
        return;
      }

      setHistoryError(getErrorMessage(err));
    } finally {
      if (requestId === historyRequestRef.current) {
        setHistoryLoading(false);
      }
    }
  }

  function refreshHistory() {
    if (!selected || historyLoading || saving) {
      return;
    }

    const requestId = ++historyRequestRef.current;

    void loadHistory(selected.id, requestId);
  }

  async function handleSearch(
    e: FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    if (saving || searching) return;

    const query = search.trim();

    // Invalidate any ongoing history request.
    ++historyRequestRef.current;

    setHistory([]);
    setHistoryError("");
    setHistoryLoading(false);

    setError("");
    setSuccess("");
    setDiagnostic("");
    setSelected(null);
    setShipments([]);
    setSearched(false);

    if (!query) {
      setError(
        "Enter a package code or tracking number."
      );
      return;
    }

    if (/[(),]/.test(query)) {
      setError(
        "Invalid package code or tracking number."
      );
      return;
    }

    setSearching(true);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        setError(
          "Please sign in to your administrator account."
        );
        return;
      }

      const {
        data,
        error: queryError,
      } = await supabase
        .from("packages")
        .select(PACKAGE_FIELDS)
        .or(
          `sky_code.eq.${query},package_code.eq.${query},carrier_tracking_number.eq.${query},tracking_number.eq.${query}`
        )
        .limit(50);

      if (queryError) {
        setError(queryError.message);
        return;
      }

      setShipments(
        (data || []) as Shipment[]
      );

      setSearched(true);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSearching(false);
    }
  }

  function selectShipment(
    shipment: Shipment
  ) {
    if (saving || searching) return;

    setSelected(shipment);

    setNewStatus(
      displayStatus(shipment) ||
        "received"
    );

    setError("");
    setSuccess("");
    setDiagnostic("");

    // Load history for the newly selected package.
    const requestId = ++historyRequestRef.current;

    void loadHistory(shipment.id, requestId);
  }

  async function diagnoseNoUpdate(
    packageId: string,
    expected: Shipment
  ) {
    const {
      data,
      error: readError,
    } = await supabase
      .from("packages")
      .select(PACKAGE_FIELDS)
      .eq("id", packageId)
      .maybeSingle();

    if (readError) {
      setDiagnostic(
        `Verification read failed: ${readError.message}`
      );
      return;
    }

    if (!data) {
      setDiagnostic(
        "The package is not visible to the current session. " +
          "This may indicate a SELECT/RLS restriction."
      );
      return;
    }

    const actual = data as Shipment;

    if (
      actual.status !== expected.status ||
      actual.shipped_at !==
        expected.shipped_at ||
      actual.lebanon_received_at !==
        expected.lebanon_received_at
    ) {
      setDiagnostic(
        "The package changed during the update. " +
          `Current database status: ${
            actual.status || "unknown"
          }. Search again to load the latest values.`
      );
      return;
    }

    setDiagnostic(
      "The package is still visible and its tracked fields " +
        "have not changed. The UPDATE returned no row. " +
        "Possible causes include an UPDATE RLS restriction " +
        "or a database rule preventing a matching update."
    );
  }

  async function updateStatus() {
    if (!selected || saving) return;

    setError("");
    setSuccess("");
    setDiagnostic("");

    const progressionError =
      validateProgression(
        selected,
        newStatus
      );

    if (progressionError) {
      setError(progressionError);
      return;
    }

    setSaving(true);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        setError(
          "Your session has expired. Sign in again."
        );
        return;
      }

      const {
        data: profile,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        setError(
          `Unable to verify role: ${profileError.message}`
        );
        return;
      }

      if (profile?.role !== "admin") {
        setError(
          "This account is not assigned the admin role. " +
            "The current shipment update policy requires admin access."
        );
        return;
      }

      // Re-read the actual database record
      // immediately before updating.
      const {
        data: current,
        error: readError,
      } = await supabase
        .from("packages")
        .select(PACKAGE_FIELDS)
        .eq("id", selected.id)
        .maybeSingle();

      if (readError || !current) {
        setError(
          readError?.message ||
            "Package is no longer accessible."
        );
        return;
      }

      const live = current as Shipment;

      if (
        live.status !== selected.status ||
        live.shipped_at !==
          selected.shipped_at ||
        live.lebanon_received_at !==
          selected.lebanon_received_at
      ) {
        setError(
          "The package changed since your search. " +
            "Search again before updating."
        );
        return;
      }

      const liveProgressionError =
        validateProgression(
          live,
          newStatus
        );

      if (liveProgressionError) {
        setError(liveProgressionError);
        return;
      }

      let updated: Shipment | null = null;

      if (
        newStatus ===
        "received_in_lebanon"
      ) {
        // Lebanon receipt must be confirmed.
        // It is never a synthetic skipped stage.
        const {
          data,
          error: updateError,
        } = await supabase
          .from("packages")
          .update({
            status:
              "received_in_lebanon",
            lebanon_received_at:
              new Date().toISOString(),
            lebanon_received_by:
              user.id,
          })
          .eq("id", live.id)
          .eq(
            "status",
            "in_transit"
          )
          .is(
            "lebanon_received_at",
            null
          )
          .select(PACKAGE_FIELDS)
          .maybeSingle();

        if (updateError) {
          setError(
            `Database rejected Lebanon receipt: ${updateError.message}`
          );

          setDiagnostic(
            `Error code: ${
              updateError.code ||
              "not provided"
            }`
          );
          return;
        }

        updated =
          data as Shipment | null;
      } else {
        // Exactly one status UPDATE.
        // Never loop through skipped stages.

        const updates: {
          status: ShipmentStatus;
          shipped_at?: string;
        } = {
          status: newStatus,
        };

        if (
          newStatus === "shipped" &&
          !live.shipped_at
        ) {
          updates.shipped_at =
            new Date().toISOString();
        }

        let updateQuery = supabase
          .from("packages")
          .update(updates)
          .eq("id", live.id)
          .eq(
            "status",
            live.status
          );

        if (
          live.lebanon_received_at
        ) {
          updateQuery =
            updateQuery.eq(
              "lebanon_received_at",
              live.lebanon_received_at
            );
        } else {
          updateQuery =
            updateQuery.is(
              "lebanon_received_at",
              null
            );
        }

        if (live.shipped_at) {
          updateQuery =
            updateQuery.eq(
              "shipped_at",
              live.shipped_at
            );
        } else {
          updateQuery =
            updateQuery.is(
              "shipped_at",
              null
            );
        }

        const {
          data,
          error: updateError,
        } = await updateQuery
          .select(PACKAGE_FIELDS)
          .maybeSingle();

        if (updateError) {
          setError(
            `Database rejected status update: ${updateError.message}`
          );

          setDiagnostic(
            `Error code: ${
              updateError.code ||
              "not provided"
            }. Details: ${
              updateError.details ||
              "none"
            }. Hint: ${
              updateError.hint ||
              "none"
            }.`
          );
          return;
        }

        updated =
          data as Shipment | null;
      }

      if (!updated) {
        setError(
          "The status update was not confirmed."
        );

        await diagnoseNoUpdate(
          live.id,
          live
        );
        return;
      }

      // Verify the actual saved database record.
      const {
        data: verifiedData,
        error: verificationError,
      } = await supabase
        .from("packages")
        .select(PACKAGE_FIELDS)
        .eq("id", updated.id)
        .maybeSingle();

      if (
        verificationError ||
        !verifiedData
      ) {
        setError(
          "The update returned a result, but the saved record could not be independently verified. Search again before making further changes."
        );
        return;
      }

      const verified =
        verifiedData as Shipment;

      const verifiedDisplay =
        displayStatus(verified);

      setSelected(verified);

      setShipments((previous) =>
        previous.map((item) =>
          item.id === verified.id
            ? verified
            : item
        )
      );

      setNewStatus(
        verifiedDisplay ||
          "received"
      );

      if (
        verifiedDisplay !==
        newStatus
      ) {
        setError(
          "The saved package status differs from the requested stage. Please review the current status before proceeding."
        );
        return;
      }

      setSuccess(
        `${
          verified.sky_code ||
          verified.package_code ||
          "Package"
        } updated to ${statusLabel(
          verifiedDisplay
        )}. Only the selected status was written.`
      );

      // Stage 4: refresh actual history after
      // successful status verification.
      // This reads existing trigger-created events.
      // No event is inserted by the page.
      const requestId = ++historyRequestRef.current;

      await loadHistory(verified.id, requestId);
    } catch (err) {
      setError(
        getErrorMessage(err)
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#f2f9ff] via-[#e2f2ff] to-[#c8e8fa] px-4 py-8 text-[#073a68] sm:px-6">
      <div className="mx-auto max-w-5xl">
        <header className="mb-7 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-extrabold uppercase tracking-widest text-[#0879c5]">
              SkyShip Operations
            </p>

            <h1 className="mt-2 text-3xl font-black">
              Shipment Management
            </h1>

            <p className="mt-2 text-slate-600">
              Track and update packages from the USA to Lebanon.
            </p>
          </div>

          <Link
            href="/dashboard"
            className="rounded-xl border border-sky-200 bg-white px-5 py-3 font-bold text-[#0879c5] shadow-sm hover:bg-sky-50"
          >
            Back to Dashboard
          </Link>
        </header>

        <form
          onSubmit={handleSearch}
          className="rounded-3xl border border-sky-100 bg-white p-6 shadow-sm"
        >
          <label className="mb-3 block font-bold">
            SkyShip Code or Carrier Tracking Number
          </label>

          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              placeholder="SKY-PKG-000010 or carrier tracking"
              className="min-w-0 flex-1 rounded-xl border border-sky-200 bg-[#f8fcff] px-4 py-4 outline-none focus:border-sky-500"
            />

            <button
              type="submit"
              disabled={
                searching || saving
              }
              className="rounded-xl bg-[#0879c5] px-7 py-4 font-bold text-white hover:bg-[#0669ad] disabled:opacity-50"
            >
              {searching
                ? "Searching..."
                : "Search Package"}
            </button>
          </div>
        </form>

        {error && (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-5 text-red-800">
            <p className="font-bold">
              {error}
            </p>

            {diagnostic && (
              <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6">
                {diagnostic}
              </p>
            )}
          </div>
        )}

        {success && (
          <div className="mt-5 rounded-2xl border border-green-200 bg-green-50 p-5 font-semibold text-green-800">
            {success}
          </div>
        )}

        {searched &&
          shipments.length === 0 && (
            <div className="mt-6 rounded-2xl border border-sky-100 bg-white p-6">
              No matching packages found.
            </div>
          )}

        {shipments.length > 0 && (
          <section className="mt-6 rounded-3xl border border-sky-100 bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-xl font-black">
              Matching Packages (
              {shipments.length})
            </h2>

            <div className="space-y-3">
              {shipments.map(
                (shipment) => (
                  <button
                    key={shipment.id}
                    type="button"
                    disabled={
                      saving || searching
                    }
                    onClick={() =>
                      selectShipment(
                        shipment
                      )
                    }
                    className={`w-full rounded-xl border p-4 text-left transition ${
                      selected?.id ===
                      shipment.id
                        ? "border-sky-400 bg-sky-50"
                        : "border-sky-100 bg-[#f8fcff] hover:bg-sky-50"
                    }`}
                  >
                    <p className="font-black text-[#0879c5]">
                      {shipment.sky_code ||
                        shipment.package_code ||
                        "Package"}
                    </p>

                    <p className="mt-1 break-all text-sm text-slate-600">
                      {shipment.carrier_tracking_number ||
                        shipment.tracking_number ||
                        "No carrier tracking"}
                    </p>

                    <p className="mt-2 text-sm font-semibold">
                      {statusLabel(
                        displayStatus(
                          shipment
                        )
                      )}
                    </p>
                  </button>
                )
              )}
            </div>
          </section>
        )}

        {selected && (
          <section className="mt-6 rounded-3xl border border-sky-100 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-black text-[#0879c5]">
              {selected.sky_code ||
                selected.package_code ||
                "Selected Package"}
            </h2>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Info
                label="Customer Code"
                value={
                  selected.customer_code ||
                  "—"
                }
              />

              <Info
                label="Carrier"
                value={
                  selected.carrier ||
                  "—"
                }
              />

              <Info
                label="Carrier Tracking"
                value={
                  selected.carrier_tracking_number ||
                  selected.tracking_number ||
                  "—"
                }
              />

              <Info
                label="Current Status"
                value={statusLabel(
                  displayStatus(
                    selected
                  )
                )}
              />

              <Info
                label="USA Received"
                value={formatDate(
                  selected.received_at
                )}
              />

              <Info
                label="Shipped from USA"
                value={formatDate(
                  selected.shipped_at
                )}
              />

              <Info
                label="Lebanon Received"
                value={formatDate(
                  selected.lebanon_received_at
                )}
              />
            </div>

            <ShipmentProgress
              shipment={selected}
            />

            {/* Stage 4: Actual database history */}
            <ShipmentHistory
              events={history}
              loading={historyLoading}
              error={historyError}
              onRefresh={refreshHistory}
            />

            <div className="mt-7 border-t border-sky-100 pt-6">
              <label className="mb-3 block font-bold">
                Update Shipment Status
              </label>

              <select
                value={newStatus}
                onChange={(e) =>
                  setNewStatus(
                    e.target.value as ShipmentStatus
                  )
                }
                disabled={saving}
                className="w-full rounded-xl border border-sky-200 bg-[#f8fcff] px-4 py-4 text-[#073a68] outline-none focus:border-sky-500"
              >
                {STATUSES.map(
                  (status) => (
                    <option
                      key={
                        status.value
                      }
                      value={
                        status.value
                      }
                    >
                      {status.label}
                    </option>
                  )
                )}
              </select>

              {skippedStages.length > 0 && (
                <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
                  <p className="font-black">
                    Skipped-stage update
                  </p>

                  <p className="mt-2">
                    The following intermediate
                    stages will not receive
                    separate history events
                    or timestamps:
                  </p>

                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    {skippedStages.map(
                      (stage) => (
                        <li
                          key={
                            stage.value
                          }
                        >
                          {stage.label}
                        </li>
                      )
                    )}
                  </ul>

                  <p className="mt-3">
                    Only the selected final
                    status will be saved.
                    Lebanon warehouse
                    confirmation remains
                    mandatory.
                  </p>
                </div>
              )}

              <button
                type="button"
                onClick={updateStatus}
                disabled={saving}
                className="mt-5 w-full rounded-xl bg-gradient-to-r from-[#0879c5] to-[#079cdd] px-6 py-4 text-lg font-black text-white hover:opacity-95 disabled:opacity-50"
              >
                {saving
                  ? "Updating..."
                  : "Confirm Status Update"}
              </button>

              <p className="mt-4 text-sm leading-6 text-slate-500">
                Updates move forward only.
                Safe forward jumps are
                supported without generating
                intermediate status changes.
                Shipping timestamps are
                recorded only when explicitly
                confirming the Shipped stage.
                Lebanon receipt must be
                confirmed separately before
                delivery stages are allowed.
              </p>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-sky-100 bg-[#f8fcff] p-4">
      <p className="text-sm text-slate-500">
        {label}
      </p>

      <p className="mt-2 break-words font-semibold text-[#073a68]">
        {value}
      </p>
    </div>
  );
}