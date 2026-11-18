"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

type CustomerProfile = {
  id: string;
  role: string;
  customer_code: string | null;
  full_name: string | null;
  phone: string | null;
  address: string | null;
};

export default function CustomerProfilePage() {
  const router = useRouter();

  const [profile, setProfile] =
    useState<CustomerProfile | null>(null);

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        router.replace("/login");
        return;
      }

      const {
        data,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select(
          "id, role, customer_code, full_name, phone, address"
        )
        .eq("id", user.id)
        .single();

      if (profileError) {
        throw profileError;
      }

      if (!data) {
        throw new Error(
          "Customer profile was not found."
        );
      }

      const customer = data as CustomerProfile;

      if (customer.role !== "client") {
        router.replace("/dashboard");
        return;
      }

      setProfile(customer);
      setEmail(user.email || "");
      setFullName(customer.full_name || "");
      setPhone(customer.phone || "");
      setAddress(customer.address || "");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load your profile."
      );
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  async function handleSave(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!profile || saving) return;

    setError("");
    setSuccess("");

    const cleanName = fullName.trim();
    const cleanPhone = phone.trim();
    const cleanAddress = address.trim();

    if (!cleanName || !cleanPhone || !cleanAddress) {
      setError("Please complete all required fields.");
      return;
    }

    if (cleanName.length > 150) {
      setError(
        "Full name cannot exceed 150 characters."
      );
      return;
    }

    setSaving(true);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error(
          "Your session has expired. Please sign in again."
        );
      }

      if (user.id !== profile.id) {
        throw new Error(
          "Account verification failed."
        );
      }

      const {
        data: updated,
        error: updateError,
      } = await supabase
        .from("profiles")
        .update({
          full_name: cleanName,
          phone: cleanPhone,
          address: cleanAddress,
        })
        .eq("id", user.id)
        .eq("role", "client")
        .select(
          "id, role, customer_code, full_name, phone, address"
        )
        .single();

      if (updateError) {
        throw updateError;
      }

      if (!updated) {
        throw new Error(
          "Profile update could not be verified."
        );
      }

      const saved = updated as CustomerProfile;

      setProfile(saved);
      setFullName(saved.full_name || "");
      setPhone(saved.phone || "");
      setAddress(saved.address || "");

      setSuccess(
        "Your profile has been updated successfully."
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to save profile changes."
      );
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-sky-200 " +
    "bg-white px-4 py-3.5 text-[#073a68] " +
    "outline-none transition " +
    "focus:border-sky-500 " +
    "focus:ring-2 focus:ring-sky-100 " +
    "disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#f2f9ff] via-[#e2f2ff] to-[#c8e8fa] px-4 py-8 text-[#073a68]">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6">
          <Link
            href="/customer/dashboard"
            className="inline-flex rounded-xl bg-white px-5 py-3 text-sm font-bold text-sky-700 shadow-sm transition hover:bg-sky-50"
          >
            ← Back to Dashboard
          </Link>
        </div>

        <section className="overflow-hidden rounded-3xl bg-gradient-to-r from-[#0879c5] via-[#079cdd] to-[#065aab] p-7 text-white shadow-xl sm:p-9">
          <div className="flex flex-wrap items-center gap-5">
            <Image
              src="/images/skyship/skyship-logo.png"
              alt="SkyShip LLC"
              width={90}
              height={90}
              className="h-20 w-20 rounded-full object-contain shadow-lg"
            />

            <div>
              <p className="text-xs font-black uppercase tracking-widest text-white/75">
                SkyShip Customer Services
              </p>

              <h1 className="mt-2 text-3xl font-black sm:text-4xl">
                My Profile
              </h1>

              <p className="mt-2 text-sm text-white/85">
                Manage your personal and delivery information.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-sky-200 bg-white/95 p-6 shadow-lg sm:p-9">
          {loading ? (
            <div className="py-16 text-center">
              <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-sky-200 border-t-sky-600" />

              <p className="mt-5 font-semibold text-slate-600">
                Loading your profile...
              </p>
            </div>
          ) : !profile ? (
            <div className="text-center">
              <h2 className="text-xl font-black">
                Profile Unavailable
              </h2>

              {error && (
                <p className="mt-4 break-words text-sm text-red-700">
                  {error}
                </p>
              )}

              <button
                type="button"
                onClick={() => void loadProfile()}
                className="mt-5 rounded-xl bg-sky-700 px-6 py-3 font-bold text-white"
              >
                Try Again
              </button>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <p className="text-xs font-black uppercase tracking-widest text-sky-600">
                  Customer Account
                </p>

                <h2 className="mt-2 text-2xl font-black">
                  {profile.full_name || "SkyShip Customer"}
                </h2>

                <p className="mt-2 text-sm text-slate-600">
                  Update your contact information below.
                </p>
              </div>

              <form
                onSubmit={handleSave}
                className="space-y-6"
              >
                <div>
                  <label
                    htmlFor="customerCode"
                    className="mb-2 block text-sm font-bold"
                  >
                    Customer Code
                  </label>

                  <input
                    id="customerCode"
                    value={profile.customer_code || "Not assigned"}
                    readOnly
                    className={`${inputClass} bg-slate-100 font-bold`}
                  />

                  <p className="mt-2 text-xs text-slate-500">
                    Your unique customer code cannot be changed.
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="fullName"
                    className="mb-2 block text-sm font-bold"
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
                    onChange={(event) =>
                      setFullName(event.target.value)
                    }
                    disabled={saving}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block text-sm font-bold"
                  >
                    Email Address
                  </label>

                  <input
                    id="email"
                    type="email"
                    value={email}
                    readOnly
                    className={`${inputClass} bg-slate-100`}
                  />

                  <p className="mt-2 text-xs text-slate-500">
                    Email changes require separate account verification.
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="phone"
                    className="mb-2 block text-sm font-bold"
                  >
                    Phone Number
                  </label>

                  <input
                    id="phone"
                    type="tel"
                    autoComplete="tel"
                    required
                    value={phone}
                    onChange={(event) =>
                      setPhone(event.target.value)
                    }
                    disabled={saving}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label
                    htmlFor="address"
                    className="mb-2 block text-sm font-bold"
                  >
                    Delivery Address
                  </label>

                  <textarea
                    id="address"
                    autoComplete="street-address"
                    required
                    rows={4}
                    value={address}
                    onChange={(event) =>
                      setAddress(event.target.value)
                    }
                    disabled={saving}
                    className={inputClass}
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

                {success && (
                  <div
                    role="status"
                    className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-800"
                  >
                    {success}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full rounded-xl bg-gradient-to-r from-[#06a9ee] to-[#087cdb] px-6 py-4 font-black text-white shadow-lg transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving
                    ? "Saving Changes..."
                    : "Save Profile Changes"}
                </button>
              </form>
            </>
          )}
        </section>

        <section className="mt-6 rounded-2xl border border-sky-200 bg-white/85 p-6 shadow-sm">
          <h3 className="font-black">
            Account Security
          </h3>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            Your account password and email address
            are managed separately from your personal
            delivery information.
          </p>

          <p className="mt-3 text-sm text-slate-600">
            Password management will be added after
            basic profile editing is tested.
          </p>
        </section>

        <footer className="mt-8 text-center text-xs font-semibold text-slate-500">
          SkyShip LLC • Beyond Limits. Delivered.
        </footer>
      </div>
    </main>
  );
}