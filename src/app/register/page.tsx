"use client";

import { FormEvent, useState } from "react";
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

  async function handleRegister(e: FormEvent<HTMLFormElement>) {
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
        setError("Registration could not be completed.");
        return;
      }

      // Profile creation and the client role must be
      // handled securely by the existing database setup.
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
    "w-full rounded-xl border border-white/20 " +
    "bg-slate-950/60 px-5 py-4 outline-none " +
    "focus:border-sky-400";

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 px-6 py-12 text-white">
      <div className="mx-auto max-w-xl rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl">
        <p className="text-sm font-bold uppercase tracking-widest text-sky-400">
          SKYSHIP LLC
        </p>

        <h1 className="mt-2 text-4xl font-black">
          {success
            ? "Welcome to SkyShip!"
            : "Create Your Account"}
        </h1>

        <p className="mt-3 text-slate-300">
          {success
            ? "Your registration has been submitted."
            : "Register to manage your SkyShip packages."}
        </p>

        <p className="mt-2 text-sm text-sky-400">
          Beyond Limits. Delivered.
        </p>

        {success ? (
          <div
            role="status"
            className="mt-8 rounded-2xl border border-green-500/40 bg-green-500/10 p-6"
          >
            <h2 className="text-xl font-bold text-green-300">
              Account Created Successfully
            </h2>

            <p className="mt-3 text-slate-200">
              Your SkyShip account has been created.
              You can now sign in using your email
              address and password.
            </p>

            <Link
              href="/login"
              className="mt-6 inline-block rounded-xl bg-sky-500 px-6 py-3 font-bold text-white hover:bg-sky-400"
            >
              Sign In to SkyShip
            </Link>
          </div>
        ) : (
          <form
            onSubmit={handleRegister}
            className="mt-8 space-y-5"
          >
            <div>
              <label
                htmlFor="fullName"
                className="mb-2 block font-semibold"
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
                onChange={(e) => setFullName(e.target.value)}
                className={fieldClass}
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="mb-2 block font-semibold"
              >
                Email Address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={fieldClass}
              />
            </div>

            <div>
              <label
                htmlFor="phone"
                className="mb-2 block font-semibold"
              >
                Phone Number
              </label>
              <input
                id="phone"
                type="tel"
                autoComplete="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={fieldClass}
              />
            </div>

            <div>
              <label
                htmlFor="address"
                className="mb-2 block font-semibold"
              >
                Delivery Address
              </label>
              <textarea
                id="address"
                autoComplete="street-address"
                required
                rows={3}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className={fieldClass}
              />
            </div>

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
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={fieldClass}
              />
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="mb-2 block font-semibold"
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
                className={fieldClass}
              />
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-xl border border-red-500/50 bg-red-500/10 p-4 text-red-200"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-sky-500 px-6 py-4 text-lg font-bold hover:bg-sky-400 disabled:opacity-50"
            >
              {loading
                ? "Creating Account..."
                : "Create Customer Account"}
            </button>
          </form>
        )}

        <p className="mt-8 text-center text-slate-300">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-bold text-sky-400 hover:underline"
          >
            Sign In
          </Link>
        </p>
      </div>
    </main>
  );
}