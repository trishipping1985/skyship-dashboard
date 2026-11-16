"use client";

import { FormEvent, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [forgotPassword, setForgotPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function switchMode(showForgot: boolean) {
    setForgotPassword(showForgot);
    setError("");
    setSuccess("");
    setPassword("");
  }

  async function handleLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }

    setLoading(true);

    try {
      const { data, error: signInError } =
        await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });

      if (signInError) {
        setError(signInError.message);
        return;
      }

      if (!data.user) {
        setError("Unable to verify your account.");
        return;
      }

      const { data: profile, error: profileError } =
        await supabase
          .from("profiles")
          .select("role")
          .eq("id", data.user.id)
          .single();

      if (profileError || !profile) {
        await supabase.auth.signOut();
        setError(
          "Your account profile could not be found. Please contact SkyShip support."
        );
        return;
      }

      const role = String(profile.role || "").toLowerCase();

      if (role === "admin" || role === "staff") {
        router.replace("/dashboard");
      } else if (role === "client") {
        router.replace("/customer/dashboard");
      } else {
        await supabase.auth.signOut();
        setError(
          "Your account does not have an assigned access role. Please contact SkyShip support."
        );
        return;
      }

      router.refresh();
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "An unexpected login error occurred."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword(
    e: FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    setLoading(true);

    try {
      const redirectUrl =
        `${window.location.origin}/reset-password`;

      const { error: resetError } =
        await supabase.auth.resetPasswordForEmail(
          email.trim().toLowerCase(),
          { redirectTo: redirectUrl }
        );

      if (resetError) {
        setError(resetError.message);
        return;
      }

      setSuccess(
        "If this email is registered with SkyShip, " +
        "a password reset link will be sent. " +
        "Please check your inbox and spam folder."
      );
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to request password recovery."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-[#8dc9fa] via-[#d5eaff] to-[#73bdf5] px-5 py-12 text-[#102c59]">

      {/* Richer sky-blue background */}
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

      <div className="relative z-10 w-full max-w-md">

        {/* Official SkyShip logo */}
        <div className="mb-7 text-center">
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
            {forgotPassword
              ? "Reset Your Password"
              : "Welcome to SkyShip"}
          </h1>

          <p className="mt-3 text-sm font-semibold text-[#345a80]">
            Beyond Limits. Delivered.
          </p>
        </div>

        {/* Login card */}
        <div className="rounded-[28px] border border-white/80 bg-gradient-to-br from-[#f0f7ff] via-[#e2f0ff] to-[#cfe6ff] p-7 shadow-[0_25px_80px_rgba(15,72,140,0.28)] ring-1 ring-sky-300/60 sm:p-9">

          <div className="mb-7">
            <h2 className="text-xl font-extrabold text-[#102c59]">
              {forgotPassword
                ? "Password Recovery"
                : "Sign In"}
            </h2>

            <p className="mt-2 text-sm leading-relaxed text-[#456482]">
              {forgotPassword
                ? "Enter your registered email address to receive a password reset link."
                : "Access your SkyShip account and manage your shipments with confidence."}
            </p>
          </div>

          <form
            onSubmit={
              forgotPassword
                ? handleForgotPassword
                : handleLogin
            }
            className="space-y-5"
          >
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
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                placeholder="Enter your email address"
                required
                disabled={loading}
                className="w-full rounded-xl border border-sky-300 bg-white/95 px-4 py-3.5 text-[#172b4d] shadow-sm outline-none transition placeholder:text-slate-400 focus:border-sky-600 focus:ring-4 focus:ring-sky-300/50 disabled:opacity-60"
              />
            </div>

            {!forgotPassword && (
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
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  required
                  disabled={loading}
                  className="w-full rounded-xl border border-sky-300 bg-white/95 px-4 py-3.5 text-[#172b4d] shadow-sm outline-none transition placeholder:text-slate-400 focus:border-sky-600 focus:ring-4 focus:ring-sky-300/50 disabled:opacity-60"
                />

                <div className="mt-3 text-right">
                  <button
                    type="button"
                    onClick={() => switchMode(true)}
                    disabled={loading}
                    className="text-sm font-bold text-sky-700 transition hover:text-sky-900 hover:underline disabled:opacity-50"
                  >
                    Forgot Password?
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
              >
                <p className="font-extrabold">
                  {forgotPassword
                    ? "RECOVERY ERROR"
                    : "LOGIN ERROR"}
                </p>
                <p className="mt-1 break-words">
                  {error}
                </p>
              </div>
            )}

            {success && (
              <div
                role="status"
                className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700"
              >
                <p className="font-extrabold">
                  REQUEST RECEIVED
                </p>
                <p className="mt-1">
                  {success}
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-[#0369a1] via-[#0284c7] to-[#0ea5e9] px-6 py-4 text-base font-extrabold text-white shadow-lg shadow-sky-400/40 transition hover:from-[#075985] hover:via-[#0369a1] hover:to-[#0284c7] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? "Please wait..."
                : forgotPassword
                ? "Send Reset Link"
                : "Sign In"}
            </button>
          </form>

          {forgotPassword ? (
            <div className="mt-7 text-center">
              <button
                type="button"
                onClick={() => switchMode(false)}
                disabled={loading}
                className="font-bold text-sky-700 hover:underline disabled:opacity-50"
              >
                Back to Sign In
              </button>
            </div>
          ) : (
            <div className="mt-8 border-t border-sky-300/60 pt-7 text-center">
              <p className="text-sm text-[#456482]">
                New to SkyShip?
              </p>

              <Link
                href="/register"
                className="mt-4 inline-flex items-center justify-center rounded-xl border-2 border-sky-500 bg-white/70 px-6 py-3 font-bold text-sky-800 transition hover:bg-sky-100"
              >
                Create Customer Account
              </Link>
            </div>
          )}
        </div>

        <p className="mt-7 text-center text-xs font-medium text-[#345a80]">
          © {new Date().getFullYear()} SkyShip LLC.
          All rights reserved.
        </p>
      </div>
    </main>
  );
}