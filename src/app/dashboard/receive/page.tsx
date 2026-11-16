"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import { supabase } from "@/lib/supabase/client";

type Customer = {
  id: string;
  customer_code: string | null;
  full_name: string | null;
  email: string | null;
};

type PreAlert = {
  id: string;
  tracking_number: string;
  customer_id: string | null;
  carrier: string | null;
};

type ExistingPackage = {
  id: string;
  sky_code: string | null;
  customer_id: string | null;
  customer_code: string | null;
  carrier: string | null;
  status: string | null;
  received_at: string | null;
  lebanon_received_at: string | null;
};

const LIVE_DASHBOARD_URL =
  "https://skyship-dashboard.vercel.app";

const inputStyle =
  "w-full rounded-xl border border-sky-200 bg-white px-4 py-4 text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100";

export default function ReceivePackagePage() {
  const [trackingNumber, setTrackingNumber] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [preAlert, setPreAlert] = useState<PreAlert | null>(null);
  const [existingPackage, setExistingPackage] =
    useState<ExistingPackage | null>(null);
  const [carrier, setCarrier] = useState("");

  const [searched, setSearched] = useState(false);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [saveError, setSaveError] = useState("");

  const [successCode, setSuccessCode] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [savedCustomerCode, setSavedCustomerCode] =
    useState("");
  const [savedCustomerName, setSavedCustomerName] =
    useState("");
  const [savedTrackingNumber, setSavedTrackingNumber] =
    useState("");
  const [qrLink, setQrLink] = useState("");

  useEffect(() => {
    void loadCustomers();
  }, []);

  async function loadCustomers() {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, customer_code, full_name, email, role")
      .eq("role", "client")
      .order("full_name", { ascending: true });

    if (error) {
      console.error("CUSTOMER LOAD ERROR:", error);
      setMessage(`CUSTOMER LOAD ERROR: ${error.message}`);
      return;
    }

    setCustomers((data as Customer[]) || []);
  }

  async function searchTracking(
    e: FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    const tracking = trackingNumber.trim();

    if (!tracking) {
      setMessage("Enter a tracking number.");
      return;
    }

    setSearching(true);
    setMessage("");
    setSaveError("");
    setSuccessCode("");
    setQrCode("");
    setQrLink("");
    setSavedCustomerCode("");
    setSavedCustomerName("");
    setSavedTrackingNumber("");
    setPreAlert(null);
    setExistingPackage(null);
    setSelectedCustomer("");
    setCarrier("");
    setSearched(false);

    try {
      const { data: packages, error: packageError } =
        await supabase
          .from("packages")
          .select(
            "id, sky_code, customer_id, customer_code, carrier, status, received_at, lebanon_received_at"
          )
          .eq("carrier_tracking_number", tracking)
          .limit(2);

      if (packageError) {
        setMessage(
          `PACKAGE SEARCH ERROR: ${packageError.message}`
        );
        return;
      }

      if (packages && packages.length > 1) {
        setMessage(
          "Multiple package records use this tracking number. Resolve the duplicates before receiving."
        );
        return;
      }

      const foundPackage =
        (packages?.[0] as ExistingPackage | undefined) ||
        null;

      if (foundPackage) {
        setExistingPackage(foundPackage);

        if (
          foundPackage.received_at ||
          foundPackage.lebanon_received_at
        ) {
          setMessage(
            `Package ${foundPackage.sky_code || ""} is already received. Do not receive it again.`
          );
          return;
        }

        if (
          foundPackage.status &&
          foundPackage.status.toLowerCase() !== "expected"
        ) {
          setMessage(
            `Package status is ${foundPackage.status}. Manual review is required before receiving.`
          );
          return;
        }

        if (foundPackage.customer_id) {
          setSelectedCustomer(foundPackage.customer_id);
        }

        if (foundPackage.carrier) {
          setCarrier(foundPackage.carrier);
        }
      }

      const { data: alertData, error: alertError } =
        await supabase
          .from("package_prealerts")
          .select(
            "id, tracking_number, customer_id, carrier"
          )
          .eq("tracking_number", tracking)
          .maybeSingle();

      if (alertError) {
        setMessage(
          `PRE-ALERT SEARCH ERROR: ${alertError.message}`
        );
        return;
      }

      if (alertData) {
        const foundAlert = alertData as PreAlert;
        setPreAlert(foundAlert);

        if (
          foundPackage?.customer_id &&
          foundAlert.customer_id &&
          foundPackage.customer_id !==
            foundAlert.customer_id
        ) {
          setMessage(
            "Customer mismatch between package and pre-alert. Manual review required."
          );
          return;
        }

        if (
          !foundPackage?.customer_id &&
          foundAlert.customer_id
        ) {
          setSelectedCustomer(foundAlert.customer_id);
        }

        if (!foundPackage?.carrier && foundAlert.carrier) {
          setCarrier(foundAlert.carrier);
        }
      }

      setMessage(
        foundPackage
          ? "Existing expected package found. Receiving will update this record and preserve its SKY-PKG code."
          : alertData
            ? "Customer pre-alert found."
            : "No pre-alert found. Select the package owner."
      );

      setSearched(true);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to search tracking number."
      );
    } finally {
      setSearching(false);
    }
  }

  async function receivePackage() {
    if (saving) return;

    setSaveError("");
    setSuccessCode("");
    setQrCode("");
    setQrLink("");

    const tracking = trackingNumber.trim();

    if (!searched || !tracking) {
      setSaveError("Search the tracking number first.");
      return;
    }

    if (!selectedCustomer) {
      setSaveError("Please select a customer.");
      return;
    }

    if (!carrier) {
      setSaveError("Please select a carrier.");
      return;
    }

    if (
      existingPackage?.customer_id &&
      existingPackage.customer_id !== selectedCustomer
    ) {
      setSaveError(
        "This package belongs to another customer. Customer reassignment requires manual review."
      );
      return;
    }

    setSaving(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setSaveError(
          "Your login session has expired. Please sign in again."
        );
        return;
      }

      const { data: operator, error: operatorError } =
        await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

      if (operatorError) {
        setSaveError(
          `Unable to verify warehouse permissions: ${operatorError.message}`
        );
        return;
      }

      if (
        !operator ||
        !["admin", "staff", "staff2", "staff4"].includes(
          String(operator.role)
        )
      ) {
        setSaveError(
          "This account is not authorized for warehouse receiving. Please sign in with an administrator or authorized staff account."
        );
        return;
      }

      const customer = customers.find(
        (item) => item.id === selectedCustomer
      );

      if (!customer) {
        setSaveError("Selected customer was not found.");
        return;
      }

      const customerCode = customer.customer_code || "";
      const customerName =
        customer.full_name?.trim() || "Name not provided";

      const receivedTime = new Date().toISOString();

      let generatedSkyCode = "";

      if (existingPackage) {
        const { data, error } = await supabase
          .from("packages")
          .update({
            customer_id: selectedCustomer,
            customer_code: customerCode || null,
            carrier,
            status: "received",
            received_at: receivedTime,
            received_by: user.id,
            warehouse_location: "Wilmington, Delaware",
          })
          .eq("id", existingPackage.id)
          .is("received_at", null)
          .is("lebanon_received_at", null)
          .eq("status", "expected")
          .select("sky_code")
          .maybeSingle();

        if (error) {
          setSaveError(`UPDATE ERROR: ${error.message}`);
          return;
        }

        if (!data) {
          setSaveError(
            "Package was not updated. It may already have been received or changed. Search again before retrying."
          );
          return;
        }

        generatedSkyCode = data.sky_code || "";
      } else {
        const { data: check, error: checkError } =
          await supabase
            .from("packages")
            .select("id")
            .eq("carrier_tracking_number", tracking)
            .limit(1);

        if (checkError) {
          setSaveError(
            `DUPLICATE CHECK ERROR: ${checkError.message}`
          );
          return;
        }

        if (check && check.length > 0) {
          setSaveError(
            "A package now exists with this tracking number. Search again to update it."
          );
          return;
        }

        const { data, error } = await supabase
          .from("packages")
          .insert({
            carrier_tracking_number: tracking,
            customer_id: selectedCustomer,
            customer_code: customerCode || null,
            carrier,
            status: "received",
            received_at: receivedTime,
            received_by: user.id,
            warehouse_location: "Wilmington, Delaware",
            source: preAlert
              ? "customer_prealert"
              : "warehouse",
          })
          .select("sky_code")
          .single();

        if (error) {
          setSaveError(`SAVE ERROR: ${error.message}`);
          return;
        }

        generatedSkyCode = data?.sky_code || "";
      }

      if (!generatedSkyCode) {
        setSaveError(
          "Package was saved, but its SKY-PKG code was not returned. Check the database before retrying."
        );
        return;
      }

      setSuccessCode(generatedSkyCode);
      setSavedCustomerCode(customerCode);
      setSavedCustomerName(customerName);
      setSavedTrackingNumber(tracking);

      if (preAlert?.id) {
        const { error: alertUpdateError } =
          await supabase
            .from("package_prealerts")
            .update({ status: "received" })
            .eq("id", preAlert.id);

        if (alertUpdateError) {
          console.error(
            "PRE-ALERT UPDATE ERROR:",
            alertUpdateError
          );
        }
      }

      const packageUrl =
        `${LIVE_DASHBOARD_URL}/dashboard/lebanon-receive` +
        `?code=${encodeURIComponent(generatedSkyCode)}`;

      setQrLink(packageUrl);

      try {
        const generatedQr = await QRCode.toDataURL(
          packageUrl,
          {
            width: 500,
            margin: 2,
            errorCorrectionLevel: "H",
          }
        );

        setQrCode(generatedQr);
      } catch (qrError) {
        console.error("QR ERROR:", qrError);
        setSaveError(
          "Package received successfully, but QR generation failed. Do not receive it again."
        );
      }

      setMessage("");
      setSearched(false);
      setTrackingNumber("");
      setSelectedCustomer("");
      setPreAlert(null);
      setExistingPackage(null);
      setCarrier("");
    } catch (error) {
      console.error("RECEIVE ERROR:", error);
      setSaveError(
        error instanceof Error
          ? error.message
          : "Unexpected error. Check the database before retrying."
      );
    } finally {
      setSaving(false);
    }
  }

  function resetForm() {
    setTrackingNumber("");
    setSelectedCustomer("");
    setPreAlert(null);
    setExistingPackage(null);
    setCarrier("");
    setMessage("");
    setSaveError("");
    setSuccessCode("");
    setQrCode("");
    setQrLink("");
    setSavedCustomerCode("");
    setSavedCustomerName("");
    setSavedTrackingNumber("");
    setSearched(false);
  }

  function printLabel() {
    if (!qrCode || !successCode) return;

    const printWindow = window.open("", "_blank");

    if (!printWindow) {
      alert("Please allow pop-ups to print the QR label.");
      return;
    }

    const escapeHtml = (value: string) =>
      value.replace(/[&<>"']/g, (char) => {
        const entities: Record<string, string> = {
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        };
        return entities[char] || char;
      });

    const safeCode = escapeHtml(successCode);
    const safeCustomerCode = escapeHtml(savedCustomerCode);
    const safeCustomerName = escapeHtml(savedCustomerName);
    const safeTracking = escapeHtml(savedTrackingNumber);

    const printHtml = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<title>${safeCode}</title>
<style>
@page { margin: 8mm; }
* { box-sizing: border-box; }
body {
  margin: 0;
  padding: 20px;
  background: white;
  color: black;
  font-family: Arial, Helvetica, sans-serif;
}
.label {
  width: 380px;
  padding: 24px;
  border: 3px solid black;
  border-radius: 16px;
  text-align: center;
}
.brand { font-size: 32px; font-weight: 900; }
.warehouse {
  margin-top: 5px;
  margin-bottom: 20px;
  font-size: 14px;
}
.qr {
  display: block;
  width: 230px;
  height: 230px;
  margin: 0 auto;
}
.package-code {
  margin-top: 18px;
  font-size: 25px;
  font-weight: 900;
}
.customer-name {
  margin-top: 12px;
  font-size: 20px;
  font-weight: 800;
}
.customer-code {
  margin-top: 6px;
  font-size: 14px;
  font-weight: 600;
}
.tracking {
  margin-top: 14px;
  font-size: 12px;
  word-break: break-all;
}
.instruction {
  margin-top: 18px;
  padding-top: 14px;
  border-top: 1px solid #999;
  font-size: 12px;
}
@media print { body { padding: 0; } }
</style>
</head>
<body>
<div class="label">
  <div class="brand">SkyShip</div>
  <div class="warehouse">Wilmington, Delaware</div>
  <img class="qr" src="${qrCode}" alt="SkyShip QR" />
  <div class="package-code">${safeCode}</div>
  <div class="customer-name">${safeCustomerName}</div>
  <div class="customer-code">${safeCustomerCode}</div>
  <div class="tracking">Tracking: ${safeTracking}</div>
  <div class="instruction">
    Scan QR to open this package in SkyShip
  </div>
</div>
<script>
window.onload = function () {
  setTimeout(function () { window.print(); }, 300);
};
</script>
</body>
</html>
`;

    printWindow.document.open();
    printWindow.document.write(printHtml);
    printWindow.document.close();
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-blue-100 text-slate-900">
      <header className="border-b border-sky-100 bg-white/90 shadow-sm">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-6">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-sky-700">
              SkyShip
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              USA Warehouse - Wilmington, Delaware
            </p>
          </div>

          <Link
            href="/dashboard"
            className="rounded-xl border border-sky-200 bg-white px-5 py-3 font-semibold text-sky-700 transition hover:bg-sky-50"
          >
            Back to Dashboard
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-6 py-12">
        <div className="mb-8">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-sky-600">
            SkyShip Warehouse Operations
          </p>
          <h2 className="mt-3 text-4xl font-black tracking-tight text-slate-900">
            Receive Package
          </h2>
          <p className="mt-3 text-lg text-slate-600">
            Search the tracking number first. SkyShip will
            check existing packages and customer pre-alerts.
          </p>
        </div>

        <form
          onSubmit={searchTracking}
          className="rounded-3xl border border-sky-100 bg-white p-7 shadow-lg shadow-sky-100/60"
        >
          <label className="mb-3 block text-lg font-bold text-slate-800">
            Carrier Tracking Number
          </label>

          <div className="flex flex-col gap-4 md:flex-row">
            <input
              type="text"
              value={trackingNumber}
              onChange={(e) => {
                setTrackingNumber(e.target.value);
                setSearched(false);
                setExistingPackage(null);
                setPreAlert(null);
                setSaveError("");
                setMessage("");
              }}
              placeholder="Enter or scan tracking number"
              className={`${inputStyle} flex-1 text-lg`}
            />

            <button
              type="submit"
              disabled={searching || saving}
              className="rounded-xl bg-sky-500 px-8 py-4 text-lg font-bold text-white transition hover:bg-sky-600 disabled:opacity-50"
            >
              {searching ? "Searching..." : "Search"}
            </button>
          </div>
        </form>

        {message && (
          <div className="mt-6 rounded-2xl border border-sky-200 bg-sky-50 p-5 font-medium text-sky-900">
            {message}
          </div>
        )}

        {searched && (
          <div className="mt-6 rounded-3xl border border-sky-100 bg-white p-7 shadow-lg shadow-sky-100/60">
            <div className="rounded-xl border border-sky-200 bg-sky-50 p-5 font-semibold text-sky-800">
              {existingPackage
                ? `Existing package: ${
                    existingPackage.sky_code || "No code"
                  }`
                : preAlert
                  ? "CUSTOMER PRE-ALERT FOUND"
                  : "NO PRE-ALERT"}
            </div>

            <div className="mt-6">
              <label className="mb-2 block font-bold text-slate-800">
                Customer Name
              </label>

              <select
                value={selectedCustomer}
                onChange={(e) =>
                  setSelectedCustomer(e.target.value)
                }
                className={inputStyle}
              >
                <option value="">Select customer</option>

                {customers.map((customer) => (
                  <option
                    key={customer.id}
                    value={customer.id}
                  >
                    {customer.full_name?.trim() ||
                      "Name not provided"}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-6">
              <label className="mb-2 block font-bold text-slate-800">
                Carrier
              </label>

              <select
                value={carrier}
                onChange={(e) =>
                  setCarrier(e.target.value)
                }
                className={inputStyle}
              >
                <option value="">Select carrier</option>
                <option value="FedEx">FedEx</option>
                <option value="UPS">UPS</option>
                <option value="USPS">USPS</option>
                <option value="DHL">DHL</option>
                <option value="Amazon">Amazon</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {saveError && (
              <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-5 text-red-800">
                <p className="font-bold">
                  PACKAGE SAVE ERROR
                </p>
                <p className="mt-2 break-words">
                  {saveError}
                </p>
              </div>
            )}

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => void receivePackage()}
                disabled={saving}
                className="flex-1 rounded-xl bg-sky-600 px-6 py-4 text-lg font-bold text-white transition hover:bg-sky-700 disabled:opacity-50"
              >
                {saving
                  ? "Receiving Package..."
                  : "Receive Package"}
              </button>

              <button
                type="button"
                onClick={resetForm}
                disabled={saving}
                className="rounded-xl border border-sky-200 bg-white px-6 py-4 font-semibold text-sky-700 transition hover:bg-sky-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {successCode && (
          <div className="mt-8 rounded-3xl border border-emerald-200 bg-white p-8 text-center shadow-lg shadow-emerald-100/60">
            <p className="text-lg font-bold text-emerald-700">
              PACKAGE RECEIVED SUCCESSFULLY
            </p>

            <p className="mt-4 text-sm text-slate-500">
              SkyShip Package Code
            </p>

            <p className="mt-2 break-all text-4xl font-black tracking-wider text-slate-900">
              {successCode}
            </p>

            {savedCustomerName && (
              <p className="mt-3 text-xl font-bold text-sky-700">
                {savedCustomerName}
              </p>
            )}

            {qrCode && (
              <div className="mt-6">
                <div className="mx-auto w-fit rounded-2xl border border-sky-100 bg-white p-5">
                  <img
                    src={qrCode}
                    alt={`QR code for ${successCode}`}
                    width={224}
                    height={224}
                  />
                </div>

                <p className="mt-4 text-sm text-slate-500">
                  Scan QR to open this package in SkyShip.
                </p>

                {qrLink && (
                  <p className="mx-auto mt-2 max-w-2xl break-all text-xs text-slate-400">
                    {qrLink}
                  </p>
                )}

                <button
                  type="button"
                  onClick={printLabel}
                  className="mt-6 rounded-xl bg-sky-500 px-8 py-4 text-lg font-bold text-white transition hover:bg-sky-600"
                >
                  Print QR Label
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={resetForm}
              className="mt-4 rounded-xl border border-sky-200 bg-white px-8 py-4 font-semibold text-sky-700 transition hover:bg-sky-50 sm:ml-3"
            >
              Receive Next Package
            </button>
          </div>
        )}
      </section>
    </main>
  );
}