"use client";

import { FormEvent, useState } from "react";
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
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 text-white">
      <div className="mx-auto flex min-h-screen max-w-xl items-center px-6 py-12">
        <div className="w-full rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl">
          <p className="text-sm font-bold uppercase tracking-widest text-sky-400">
            SkyShip LLC
          </p>

          <h1 className="mt-2 text-4xl font-black">
            {forgotPassword
              ? "Reset Your Password"
              : "Welcome to SkyShip"}
          </h1>

          <p className="mt-3 text-slate-300">
            {forgotPassword
              ? "Enter your registered email address to receive a password reset link."
              : "Sign in to access your SkyShip account."}
          </p>

          <p className="mt-2 text-sm text-sky-400">
            Beyond Limits. Delivered.
          </p>

          <form
            onSubmit={
              forgotPassword
                ? handleForgotPassword
                : handleLogin
            }
            className="mt-8 space-y-5"
          >
            <div>
              <label
                htmlFor="email"
                className="mb-2 block font-semibold"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                placeholder="Enter your email"
                required
                className="w-full rounded-xl border border-white/20 bg-slate-950/60 px-5 py-4 outline-none focus:border-sky-400"
              />
            </div>

            {!forgotPassword && (
              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block font-semibold"
                >
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  placeholder="Enter password"
                  required
                  className="w-full rounded-xl border border-white/20 bg-slate-950/60 px-5 py-4 outline-none focus:border-sky-400"
                />

                <div className="mt-3 text-right">
                  <button
                    type="button"
                    onClick={() => switchMode(true)}
                    className="text-sm font-semibold text-sky-400 hover:text-sky-300 hover:underline"
                  >
                    Forgot Password?
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div
                role="alert"
                className="rounded-2xl border border-red-500/50 bg-red-500/10 p-4 text-red-200"
              >
                <p className="font-bold">
                  {forgotPassword
                    ? "RECOVERY ERROR"
                    : "LOGIN ERROR"}
                </p>
                <p className="mt-1 break-words">{error}</p>
              </div>
            )}

            {success && (
              <div
                role="status"
                className="rounded-2xl border border-green-500/50 bg-green-500/10 p-4 text-green-200"
              >
                <p className="font-bold">REQUEST RECEIVED</p>
                <p className="mt-1">{success}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-sky-500 px-6 py-4 text-lg font-bold text-white hover:bg-sky-400 disabled:opacity-50"
            >
              {loading
                ? "Please wait..."
                : forgotPassword
                ? "Send Reset Link"
                : "Sign In"}
            </button>
          </form>

          {forgotPassword ? (
            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => switchMode(false)}
                className="font-semibold text-sky-400 hover:underline"
              >
                Back to Sign In
              </button>
            </div>
          ) : (
            <div className="mt-8 border-t border-white/10 pt-6 text-center">
              <p className="text-slate-300">
                New to SkyShip?
              </p>
              <Link
                href="/register"
                className="mt-3 inline-block rounded-xl border border-sky-400 px-6 py-3 font-bold text-sky-400 transition hover:bg-sky-400 hover:text-slate-950"
              >
                Create Customer Account
              </Link>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}