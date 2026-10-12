"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(
    e: FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    setError("");

    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }

    setLoading(true);

    try {
      const { error: signInError } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      if (signInError) {
        setError(signInError.message);
        return;
      }

      router.replace("/dashboard");
      router.refresh();
    } catch (err) {
      console.error(err);

      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unexpected login error occurred.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 text-white">
      <div className="mx-auto flex min-h-screen max-w-xl items-center px-6 py-12">
        <div className="w-full rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl">
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-sky-400">
              SkyShip
            </p>

            <h1 className="mt-2 text-4xl font-black">
              Staff Login
            </h1>

            <p className="mt-3 text-slate-300">
              Sign in to access SkyShip warehouse receiving tools.
            </p>
          </div>

          <form
            onSubmit={handleLogin}
            className="mt-8 space-y-5"
          >
            <div>
              <label className="mb-2 block font-semibold">
                Email
              </label>

              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                placeholder="staff@example.com"
                className="w-full rounded-xl border border-white/20 bg-slate-950/60 px-5 py-4 outline-none focus:border-sky-400"
              />
            </div>

            <div>
              <label className="mb-2 block font-semibold">
                Password
              </label>

              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="Enter password"
                className="w-full rounded-xl border border-white/20 bg-slate-950/60 px-5 py-4 outline-none focus:border-sky-400"
              />
            </div>

            {error && (
              <div className="rounded-2xl border border-red-500/50 bg-red-500/10 p-4 text-red-200">
                <p className="font-bold">
                  LOGIN ERROR
                </p>

                <p className="mt-1 break-words">
                  {error}
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-sky-500 px-6 py-4 text-lg font-bold text-white hover:bg-sky-400 disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
