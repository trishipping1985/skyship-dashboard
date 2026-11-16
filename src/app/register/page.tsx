"use client";

import { FormEvent, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";

export default function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleRegister(
    e: FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();
    setError("");

    if (
      !fullName.trim() ||
      !email.trim() ||
      !phone.trim() ||
      !address.trim() ||
      !password ||
      !confirmPassword
    ) {
      setError("Please complete all fields.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const { data, error: signUpError } =
        await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: {
            data: {
              full_name: fullName.trim(),
              phone: phone.trim(),
              address: address.trim(),
            },
          },
        });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      if (!data.user) {
        setError(
          "Registration could not be completed."
        );
        return;
      }

      // Existing database setup handles
      // profile creation and customer roles.
      setSuccess(true);
      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "An unexpected registration error occurred."
      );
    } finally {
      setLoading(false);
    }
  }

  const fieldClass =
    "w-full rounded-xl border border-sky-300 " +
    "bg-white/95 px-4 py-3.5 text-[#172b4d] " +
    "shadow-sm outline-none transition " +
    "placeholder:text-slate-400 " +
    "focus:border-sky-600 " +
    "focus:ring-4 focus:ring-sky-300/50 " +
    "disabled:opacity-60";

  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-gradient-to-br from-[#8dc9fa] via-[#d5eaff] to-[#73bdf5] px-5 py-12 text-[#102c59]">

      {/* SkyShip blue background accents */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-32 -top-32 h-[550px] w-[550px] rounded-full bg-[#38bdf8]/40 blur-3xl"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-40 -right-32 h-[600px] w-[600px] rounded-full bg-[#0284c7]/25 blur-3xl"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/25 blur-3xl"
      />

      <div className="relative z-10 mx-auto w-full max-w-xl">

        {/* Official SkyShip branding */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex justify-center">
            <Image
              src="/images/skyship/skyship-logo.png"
              alt="SkyShip LLC Official Logo"
              width={180}
              height={180}
              priority
              className="h-40 w-40 rounded-full object-contain drop-shadow-2xl sm:h-44 sm:w-44"
            />
          </div>

          <p className="text-sm font-black uppercase tracking-[0.25em] text-[#0369a1]">
            SKYSHIP LLC
          </p>

          <h1 className="mt-3 text-3xl font-black tracking-tight text-[#102c59] sm:text-4xl">
            {success
              ? "Welcome to SkyShip!"
              : "Create Your Account"}
          </h1>

          <p className="mt-3 text-sm font-semibold text-[#345a80]">
            Beyond Limits. Delivered.
          </p>
        </div>

        {/* Registration card */}
        <div className="rounded-[28px] border border-white/80 bg-gradient-to-br from-[#f0f7ff] via-[#e2f0ff] to-[#cfe6ff] p-7 shadow-[0_25px_80px_rgba(15,72,140,0.28)] ring-1 ring-sky-300/60 sm:p-9">

          {success ? (
            <div
              role="status"
              className="text-center"
            >
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl text-green-700">
                ✓
              </div>

              <h2 className="text-2xl font-extrabold text-[#102c59]">
                Account Created Successfully
              </h2>

              <p className="mt-4 leading-relaxed text-[#456482]">
                Your SkyShip account has been created.
                You can now sign in using your email
                address and password.
              </p>

              <p className="mt-3 text-sm text-[#456482]">
                If email verification is enabled,
                please confirm your email before
                signing in.
              </p>

              <Link
                href="/login"
                className="mt-7 inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-[#0369a1] via-[#0284c7] to-[#0ea5e9] px-6 py-4 font-extrabold text-white shadow-lg shadow-sky-400/40 transition hover:from-[#075985] hover:via-[#0369a1] hover:to-[#0284c7]"
              >
                Sign In to SkyShip
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-7">
                <h2 className="text-xl font-extrabold text-[#102c59]">
                  Customer Registration
                </h2>

                <p className="mt-2 text-sm leading-relaxed text-[#456482]">
                  Create your SkyShip account to
                  register expected packages, track
                  shipments, and manage deliveries.
                </p>
              </div>

              <form
                onSubmit={handleRegister}
                className="space-y-5"
              >
                <div>
                  <label
                    htmlFor="fullName"
                    className="mb-2 block text-sm font-bold text-[#172b4d]"
                  >
                    Full Name
                  </label>

                  <input
                    id="fullName"
                    type="text"
                    autoComplete="name"
                    required
                    maxLength={150}
                    value={fullName}
                    onChange={(e) =>
                      setFullName(e.target.value)
                    }
                    disabled={loading}
                    placeholder="Enter your full name"
                    className={fieldClass}
                  />
                </div>

                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block text-sm font-bold text-[#172b4d]"
                  >
                    Email Address
                  </label>

                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) =>
                      setEmail(e.target.value)
                    }
                    disabled={loading}
                    placeholder="Enter your email address"
                    className={fieldClass}
                  />
                </div>

                <div>
                  <label
                    htmlFor="phone"
                    className="mb-2 block text-sm font-bold text-[#172b4d]"
                  >
                    Phone Number
                  </label>

                  <input
                    id="phone"
                    type="tel"
                    autoComplete="tel"
                    required
                    value={phone}
                    onChange={(e) =>
                      setPhone(e.target.value)
                    }
                    disabled={loading}
                    placeholder="Enter your phone number"
                    className={fieldClass}
                  />
                </div>

                <div>
                  <label
                    htmlFor="address"
                    className="mb-2 block text-sm font-bold text-[#172b4d]"
                  >
                    Delivery Address
                  </label>

                  <textarea
                    id="address"
                    autoComplete="street-address"
                    required
                    rows={3}
                    value={address}
                    onChange={(e) =>
                      setAddress(e.target.value)
                    }
                    disabled={loading}
                    placeholder="Enter your delivery address"
                    className={fieldClass}
                  />
                </div>

                <div>
                  <label
                    htmlFor="password"
                    className="mb-2 block text-sm font-bold text-[#172b4d]"
                  >
                    Password
                  </label>

                  <input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) =>
                      setPassword(e.target.value)
                    }
                    disabled={loading}
                    placeholder="Create a password"
                    className={fieldClass}
                  />

                  <p className="mt-2 text-xs text-[#456482]">
                    Minimum 8 characters.
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="mb-2 block text-sm font-bold text-[#172b4d]"
                  >
                    Confirm Password
                  </label>

                  <input
                    id="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) =>
                      setConfirmPassword(e.target.value)
                    }
                    disabled={loading}
                    placeholder="Confirm your password"
                    className={fieldClass}
                  />
                </div>

                {error && (
                  <div
                    role="alert"
                    className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
                  >
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-gradient-to-r from-[#0369a1] via-[#0284c7] to-[#0ea5e9] px-6 py-4 text-lg font-extrabold text-white shadow-lg shadow-sky-400/40 transition hover:from-[#075985] hover:via-[#0369a1] hover:to-[#0284c7] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading
                    ? "Creating Account..."
                    : "Create Customer Account"}
                </button>
              </form>
            </>
          )}

          <div className="mt-8 border-t border-sky-300/60 pt-7 text-center">
            <p className="text-sm text-[#456482]">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-bold text-sky-700 hover:text-sky-900 hover:underline"
              >
                Sign In
              </Link>
            </p>
          </div>
        </div>

        <p className="mt-7 text-center text-xs font-medium text-[#345a80]">
          © {new Date().getFullYear()} SkyShip LLC.
          All rights reserved.
        </p>
      </div>
    </main>
  );
}