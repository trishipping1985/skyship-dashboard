"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";

type RecoveryStatus =
  | "checking"
  | "ready"
  | "invalid"
  | "success";

export default function ResetPasswordPage() {
  const [status, setStatus] =
    useState<RecoveryStatus>("checking");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!active) return;

        if (
          (event === "PASSWORD_RECOVERY" ||
            event === "INITIAL_SESSION" ||
            event === "SIGNED_IN") &&
          session
        ) {
          setStatus("ready");
        }

        if (event === "SIGNED_OUT") {
          setStatus((previous) =>
            previous === "success"
              ? "success"
              : "invalid"
          );
        }
      }
    );

    async function checkSession() {
      try {
        const {
          data: { user },
          error: sessionError,
        } = await supabase.auth.getUser();

        if (!active) return;

        if (sessionError || !user) {
          setStatus("invalid");
        } else {
          setStatus("ready");
        }
      } catch {
        if (active) setStatus("invalid");
      }
    }

    void checkSession();

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleResetPassword(
    e: FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();
    setError("");

    if (password.length < 10) {
      setError(
        "Your password must contain at least 10 characters."
      );
      return;
    }

    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setStatus("invalid");
        setError(
          "Your recovery session is invalid or expired."
        );
        return;
      }

      const { error: updateError } =
        await supabase.auth.updateUser({
          password,
        });

      if (updateError) {
        setError(updateError.message);
        return;
      }

      setStatus("success");
      setPassword("");
      setConfirmPassword("");

      const { error: signOutError } =
        await supabase.auth.signOut();

      if (signOutError) {
        console.error(signOutError);
      }
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to reset your password."
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
            Reset Password
          </h1>

          <p className="mt-3 text-slate-300">
            Beyond Limits. Delivered.
          </p>

          {status === "checking" && (
            <div className="mt-8 text-slate-300">
              Verifying your recovery link...
            </div>
          )}

          {status === "invalid" && (
            <div className="mt-8 space-y-5">
              <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-5 text-red-200">
                Your recovery link is invalid,
                expired, or could not be verified.
              </div>

              <Link
                href="/login"
                className="block rounded-xl bg-sky-500 px-6 py-4 text-center font-bold hover:bg-sky-400"
              >
                Request a New Reset Link
              </Link>
            </div>
          )}

          {status === "success" && (
            <div className="mt-8 space-y-5">
              <div className="rounded-xl border border-green-500/40 bg-green-500/10 p-5 text-green-200">
                Your password has been updated
                successfully.
              </div>

              <Link
                href="/login"
                className="block rounded-xl bg-sky-500 px-6 py-4 text-center font-bold hover:bg-sky-400"
              >
                Return to Sign In
              </Link>
            </div>
          )}

          {status === "ready" && (
            <form
              onSubmit={handleResetPassword}
              className="mt-8 space-y-5"
            >
              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block font-semibold"
                >
                  New Password
                </label>

                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) =>
                    setPassword(e.target.value)
                  }
                  autoComplete="new-password"
                  minLength={10}
                  required
                  placeholder="Enter new password"
                  className="w-full rounded-xl border border-white/20 bg-slate-950/60 px-5 py-4 outline-none focus:border-sky-400"
                />
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="mb-2 block font-semibold"
                >
                  Confirm New Password
                </label>

                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) =>
                    setConfirmPassword(e.target.value)
                  }
                  autoComplete="new-password"
                  minLength={10}
                  required
                  placeholder="Confirm new password"
                  className="w-full rounded-xl border border-white/20 bg-slate-950/60 px-5 py-4 outline-none focus:border-sky-400"
                />
              </div>

              {error && (
                <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-red-200">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-sky-500 px-6 py-4 text-lg font-bold hover:bg-sky-400 disabled:opacity-50"
              >
                {loading
                  ? "Updating Password..."
                  : "Save New Password"}
              </button>
            </form>
          )}

        </div>
      </div>
    </main>
  );
}