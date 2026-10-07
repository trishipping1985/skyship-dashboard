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

export default function ReceivePackagePage() {
  const [trackingNumber, setTrackingNumber] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [preAlert, setPreAlert] = useState<PreAlert | null>(null);

  const [carrier, setCarrier] = useState("");
  const [weight, setWeight] = useState("");
  const [length, setLength] = useState("");
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [notes, setNotes] = useState("");

  const [searched, setSearched] = useState(false);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [saveError, setSaveError] = useState("");

  const [successCode, setSuccessCode] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [savedCustomerCode, setSavedCustomerCode] = useState("");
  const [savedTrackingNumber, setSavedTrackingNumber] = useState("");
  const [qrLink, setQrLink] = useState("");

  useEffect(() => {
    loadCustomers();
  }, []);

  async function loadCustomers() {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, customer_code, full_name, email")
      .order("customer_code", { ascending: true });

    if (error) {
      console.error("CUSTOMER LOAD ERROR:", error);
      return;
    }

    setCustomers((data as Customer[]) || []);
  }

  async function searchTracking(e: FormEvent<HTMLFormElement>) {
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
    setSavedTrackingNumber("");
    setPreAlert(null);
    setSelectedCustomer("");
    setSearched(false);

    const { data, error } = await supabase
      .from("package_prealerts")
      .select("id, tracking_number, customer_id, carrier")
      .eq("tracking_number", tracking)
      .maybeSingle();

    if (error) {
      console.error("PRE-ALERT SEARCH ERROR:", error);
      setMessage(`SEARCH ERROR: ${error.message}`);
      setSearching(false);
      return;
    }

    if (data) {
      const foundPreAlert = data as PreAlert;

      setPreAlert(foundPreAlert);

      if (foundPreAlert.customer_id) {
        setSelectedCustomer(foundPreAlert.customer_id);
      }

      if (foundPreAlert.carrier) {
        setCarrier(foundPreAlert.carrier);
      }

      setMessage("Customer pre-alert found.");
    } else {
      setMessage("No customer pre-alert found.");
    }

    setSearched(true);
    setSearching(false);
  }

  async function receivePackage() {
    setSaveError("");
    setSuccessCode("");
    setQrCode("");
    setQrLink("");

    const cleanTrackingNumber = trackingNumber.trim();

    if (!cleanTrackingNumber) {
      setSaveError("Tracking number is required.");
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

    if (!weight || Number(weight) <= 0) {
      setSaveError("Please enter the actual package weight.");
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

      const customer = customers.find(
        (item) => item.id === selectedCustomer
      );

      if (!customer) {
        setSaveError("The selected customer could not be found.");
        return;
      }

      const customerCode = customer.customer_code || "";

      const { data, error } = await supabase
        .from("packages")
        .insert({
          carrier_tracking_number: cleanTrackingNumber,
          customer_id: selectedCustomer,
          customer_code: customerCode || null,
          carrier,
          weight_kg: Number(weight),
          length_cm: length ? Number(length) : null,
          width_cm: width ? Number(width) : null,
          height_cm: height ? Number(height) : null,
          received_at: new Date().toISOString(),
          received_by: user.id,
          warehouse_location: "Wilmington, Delaware",
          notes: notes.trim() || null,
          status: "received",
          source: preAlert ? "customer_prealert" : "warehouse",
        })
        .select("sky_code")
        .single();

      if (error) {
        console.error("PACKAGE INSERT ERROR:", error);

        let errorText = `SAVE ERROR: ${error.message}`;

        if (error.details) {
          errorText += ` | ${error.details}`;
        }

        if (error.hint) {
          errorText += ` | ${error.hint}`;
        }

        if (error.code) {
          errorText += ` | Code: ${error.code}`;
        }

        setSaveError(errorText);
        return;
      }

      if (!data?.sky_code) {
        setSaveError(
          "Package saved, but SkyShip package code was not generated."
        );
        return;
      }

      const generatedSkyCode = String(data.sky_code);

      if (preAlert?.id) {
        const { error: preAlertUpdateError } = await supabase
          .from("package_prealerts")
          .update({
            status: "received",
          })
          .eq("id", preAlert.id);

        if (preAlertUpdateError) {
          console.error(
            "PRE-ALERT UPDATE ERROR:",
            preAlertUpdateError
          );
        }
      }

      /*
        IMPORTANT:
        On localhost the QR will contain localhost.
        After SkyShip is deployed, window.location.origin will
        automatically become the live SkyShip website domain.
      */
      const packageUrl =
        `${window.location.origin}/dashboard/lebanon-receive` +
        `?code=${encodeURIComponent(generatedSkyCode)}`;

      const generatedQr = await QRCode.toDataURL(packageUrl, {
        width: 500,
        margin: 2,
        errorCorrectionLevel: "H",
      });

      setSuccessCode(generatedSkyCode);
      setQrCode(generatedQr);
      setQrLink(packageUrl);
      setSavedCustomerCode(customerCode);
      setSavedTrackingNumber(cleanTrackingNumber);

      setMessage("");
      setSearched(false);

      setTrackingNumber("");
      setSelectedCustomer("");
      setPreAlert(null);
      setCarrier("");
      setWeight("");
      setLength("");
      setWidth("");
      setHeight("");
      setNotes("");
    } catch (error) {
      console.error("RECEIVE PACKAGE ERROR:", error);

      if (error instanceof Error) {
        setSaveError(error.message);
      } else {
        setSaveError("An unexpected error occurred.");
      }
    } finally {
      setSaving(false);
    }
  }

  function resetForm() {
    setTrackingNumber("");
    setSelectedCustomer("");
    setPreAlert(null);
    setCarrier("");
    setWeight("");
    setLength("");
    setWidth("");
    setHeight("");
    setNotes("");
    setMessage("");
    setSaveError("");
    setSuccessCode("");
    setQrCode("");
    setQrLink("");
    setSavedCustomerCode("");
    setSavedTrackingNumber("");
    setSearched(false);
  }

  function printLabel() {
    if (!qrCode || !successCode) {
      return;
    }

    const printWindow = window.open("", "_blank");

    if (!printWindow) {
      alert("Please allow pop-ups to print the QR label.");
      return;
    }

    const safeCode = successCode.replace(/[<>&"'`]/g, "");
    const safeCustomerCode = savedCustomerCode.replace(
      /[<>&"'`]/g,
      ""
    );
    const safeTrackingNumber = savedTrackingNumber.replace(
      /[<>&"'`]/g,
      ""
    );

    const printHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />

  <title>${safeCode}</title>

  <style>
    @page {
      margin: 8mm;
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      padding: 20px;
      background: #ffffff;
      color: #000000;
      font-family: Arial, Helvetica, sans-serif;
    }

    .label {
      width: 380px;
      padding: 24px;
      border: 3px solid #000000;
      border-radius: 16px;
      text-align: center;
    }

    .brand {
      font-size: 32px;
      font-weight: 900;
    }

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

    .customer-code {
      margin-top: 10px;
      font-size: 18px;
      font-weight: 700;
    }

    .tracking {
      margin-top: 14px;
      font-size: 12px;
      word-break: break-all;
    }

    .instruction {
      margin-top: 18px;
      padding-top: 14px;
      border-top: 1px solid #999999;
      font-size: 12px;
    }

    @media print {
      body {
        padding: 0;
      }
    }
  </style>
</head>

<body>

  <div class="label">

    <div class="brand">
      SkyShip
    </div>

    <div class="warehouse">
      Wilmington, Delaware
    </div>

    <img
      class="qr"
      src="${qrCode}"
      alt="SkyShip QR Code"
    />

    <div class="package-code">
      ${safeCode}
    </div>

    <div class="customer-code">
      ${safeCustomerCode}
    </div>

    <div class="tracking">
      Tracking: ${safeTrackingNumber}
    </div>

    <div class="instruction">
      Scan QR to open this package in SkyShip
    </div>

  </div>

  <script>
    window.onload = function () {
      setTimeout(function () {
        window.print();
      }, 300);
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
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 text-white">

      <header className="border-b border-white/10 bg-white/5">

        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">

          <div>

            <h1 className="text-3xl font-bold">
              SkyShip
            </h1>

            <p className="mt-1 text-sm text-slate-300">
              USA Warehouse • Wilmington, Delaware
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

        <h2 className="text-4xl font-bold">
          Receive Package
        </h2>

        <p className="mt-3 text-lg text-slate-300">
          Search the tracking number first. SkyShip will automatically check
          for a customer pre-alert.
        </p>

        <form
          onSubmit={searchTracking}
          className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-7"
        >

          <label className="mb-3 block text-lg font-semibold">
            Carrier Tracking Number
          </label>

          <div className="flex flex-col gap-4 md:flex-row">

            <input
              type="text"
              value={trackingNumber}
              onChange={(e) =>
                setTrackingNumber(e.target.value)
              }
              placeholder="Enter or scan tracking number"
              className="flex-1 rounded-xl border border-white/20 bg-slate-950/60 px-5 py-4 text-lg outline-none focus:border-sky-400"
            />

            <button
              type="submit"
              disabled={searching}
              className="rounded-xl bg-sky-500 px-8 py-4 text-lg font-bold hover:bg-sky-400 disabled:opacity-50"
            >
              {searching ? "Searching..." : "Search"}
            </button>

          </div>

        </form>

        {message && (
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5">
            {message}
          </div>
        )}

        {searched && (
          <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-7">

            <div
              className={`rounded-xl border p-5 ${
                preAlert
                  ? "border-green-500/40 bg-green-500/10"
                  : "border-amber-500/40 bg-amber-500/10"
              }`}
            >

              <p
                className={`font-bold ${
                  preAlert
                    ? "text-green-300"
                    : "text-amber-300"
                }`}
              >
                {preAlert
                  ? "PRE-ALERT FOUND"
                  : "NO PRE-ALERT"}
              </p>

              <p className="mt-2">
                {preAlert
                  ? "The customer has already registered this package."
                  : "Select the package owner below."}
              </p>

            </div>

            <div className="mt-6">

              <label className="mb-2 block font-semibold">
                Customer
              </label>

              <select
                value={selectedCustomer}
                onChange={(e) =>
                  setSelectedCustomer(e.target.value)
                }
                className="w-full rounded-xl border border-white/20 bg-slate-950 px-4 py-4 text-white outline-none focus:border-sky-400"
              >

                <option value="">
                  Select customer
                </option>

                {customers.map((customer) => (
                  <option
                    key={customer.id}
                    value={customer.id}
                  >
                    {customer.customer_code || "NO CODE"} —{" "}
                    {customer.full_name ||
                      customer.email ||
                      "Unnamed Customer"}
                  </option>
                ))}

              </select>

            </div>

            <div className="mt-6">

              <label className="mb-2 block font-semibold">
                Carrier
              </label>

              <select
                value={carrier}
                onChange={(e) =>
                  setCarrier(e.target.value)
                }
                className="w-full rounded-xl border border-white/20 bg-slate-950 px-4 py-4 text-white outline-none focus:border-sky-400"
              >

                <option value="">
                  Select carrier
                </option>

                <option value="FedEx">
                  FedEx
                </option>

                <option value="UPS">
                  UPS
                </option>

                <option value="USPS">
                  USPS
                </option>

                <option value="DHL">
                  DHL
                </option>

                <option value="Amazon">
                  Amazon
                </option>

                <option value="Other">
                  Other
                </option>

              </select>

            </div>

            <div className="mt-6">

              <label className="mb-2 block font-semibold">
                Actual Weight (kg)
              </label>

              <input
                type="number"
                min="0"
                step="0.01"
                value={weight}
                onChange={(e) =>
                  setWeight(e.target.value)
                }
                placeholder="0.00"
                className="w-full rounded-xl border border-white/20 bg-slate-950 px-4 py-4 outline-none focus:border-sky-400"
              />

            </div>

            <div className="mt-6">

              <label className="mb-2 block font-semibold">
                Package Dimensions (cm)
              </label>

              <div className="grid gap-4 sm:grid-cols-3">

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={length}
                  onChange={(e) =>
                    setLength(e.target.value)
                  }
                  placeholder="Length"
                  className="rounded-xl border border-white/20 bg-slate-950 px-4 py-4 outline-none focus:border-sky-400"
                />

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={width}
                  onChange={(e) =>
                    setWidth(e.target.value)
                  }
                  placeholder="Width"
                  className="rounded-xl border border-white/20 bg-slate-950 px-4 py-4 outline-none focus:border-sky-400"
                />

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={height}
                  onChange={(e) =>
                    setHeight(e.target.value)
                  }
                  placeholder="Height"
                  className="rounded-xl border border-white/20 bg-slate-950 px-4 py-4 outline-none focus:border-sky-400"
                />

              </div>

            </div>

            <div className="mt-6">

              <label className="mb-2 block font-semibold">
                Notes
              </label>

              <textarea
                value={notes}
                onChange={(e) =>
                  setNotes(e.target.value)
                }
                placeholder="Optional package notes"
                rows={4}
                className="w-full rounded-xl border border-white/20 bg-slate-950 px-4 py-4 outline-none focus:border-sky-400"
              />

            </div>

            {saveError && (
              <div className="mt-6 rounded-xl border border-red-500/50 bg-red-500/10 p-5 text-red-200">

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
                onClick={receivePackage}
                disabled={saving}
                className="flex-1 rounded-xl bg-green-500 px-6 py-4 text-lg font-bold text-slate-950 hover:bg-green-400 disabled:opacity-50"
              >
                {saving
                  ? "Receiving Package..."
                  : "Receive Package"}
              </button>

              <button
                type="button"
                onClick={resetForm}
                disabled={saving}
                className="rounded-xl border border-white/20 px-6 py-4 font-semibold hover:bg-white/10"
              >
                Cancel
              </button>

            </div>

          </div>
        )}

        {successCode && (
          <div className="mt-8 rounded-3xl border border-green-500/40 bg-green-500/10 p-8 text-center">

            <p className="text-lg font-semibold text-green-300">
              PACKAGE RECEIVED SUCCESSFULLY
            </p>

            <p className="mt-4 text-sm text-slate-300">
              SkyShip Package Code
            </p>

            <p className="mt-2 text-4xl font-black tracking-wider">
              {successCode}
            </p>

            {savedCustomerCode && (
              <p className="mt-3 text-lg font-semibold">
                {savedCustomerCode}
              </p>
            )}

            {qrCode && (
              <div className="mt-6">

                <div className="mx-auto w-fit rounded-2xl bg-white p-5">

                  <img
                    src={qrCode}
                    alt={`QR code for ${successCode}`}
                    width={224}
                    height={224}
                  />

                </div>

                <p className="mt-4 text-sm text-slate-300">
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
                  className="mt-6 rounded-xl bg-sky-500 px-8 py-4 text-lg font-bold hover:bg-sky-400"
                >
                  Print QR Label
                </button>

              </div>
            )}

            <button
              type="button"
              onClick={resetForm}
              className="ml-0 mt-4 rounded-xl border border-white/20 px-8 py-4 font-semibold hover:bg-white/10 sm:ml-3"
            >
              Receive Next Package
            </button>

          </div>
        )}

      </section>

    </main>
  );
}