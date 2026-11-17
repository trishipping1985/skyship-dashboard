"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

type Notification = {
  id: string;
  title: string;
  body: string;
  read_at: string | null;
  created_at: string;
  data: {
    package_code?: string;
    status?: string;
  } | null;
};

export default function CustomerNotificationsPage() {
  const router = useRouter();

  const [notifications, setNotifications] = useState<
    Notification[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  const loadNotifications = useCallback(
    async (initial = false) => {
      if (initial) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

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

        const { data: profile, error: profileError } =
          await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single();

        if (profileError || !profile) {
          setError("Unable to verify your account.");
          return;
        }

        if (profile.role !== "client") {
          router.replace("/dashboard");
          return;
        }

        const { data, error: fetchError } = await supabase
          .from("notifications")
          .select("id, title, body, data, read_at, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(100);

        if (fetchError) {
          throw fetchError;
        }

        setNotifications((data || []) as Notification[]);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load notifications."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [router]
  );

  useEffect(() => {
    void loadNotifications(true);
  }, [loadNotifications]);

  const unreadCount = notifications.filter(
    (item) => !item.read_at
  ).length;

  async function markAsRead(id: string) {
    if (busyId || markingAll) return;

    setBusyId(id);
    setError("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const { error: updateError } = await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("id", id)
        .eq("user_id", user.id)
        .is("read_at", null);

      if (updateError) throw updateError;

      await loadNotifications();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to mark notification as read."
      );
    } finally {
      setBusyId(null);
    }
  }

  async function markAllAsRead() {
    if (markingAll || busyId || unreadCount === 0) return;

    setMarkingAll(true);
    setError("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const { error: updateError } = await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .is("read_at", null);

      if (updateError) throw updateError;

      await loadNotifications();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to update notifications."
      );
    } finally {
      setMarkingAll(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#f2f9ff] via-[#e2f2ff] to-[#c8e8fa] px-4 py-8 text-[#073a68]">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6">
          <Link
            href="/customer/dashboard"
            className="inline-block rounded-xl bg-white px-5 py-3 text-sm font-bold text-sky-700 shadow-sm hover:bg-sky-50"
          >
            ← Back to Dashboard
          </Link>
        </div>

        <section className="rounded-3xl bg-gradient-to-r from-[#0879c5] to-[#065aab] p-7 text-white shadow-lg">
          <div className="flex items-center gap-4">
            <span className="text-4xl">🔔</span>

            <div>
              <h1 className="text-3xl font-black">
                Notifications
              </h1>

              <p className="mt-2 text-sm text-white/85">
                Updates about your SkyShip packages.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-sky-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black">
                Your Notifications
              </h2>

              <p className="mt-1 text-sm text-slate-600">
                {unreadCount} unread among the latest{" "}
                {notifications.length} notifications
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void loadNotifications()}
                disabled={loading || refreshing || markingAll}
                className="rounded-xl border border-sky-200 px-4 py-2 text-sm font-bold text-sky-700 disabled:opacity-50"
              >
                {refreshing ? "Refreshing..." : "Refresh"}
              </button>

              <button
                type="button"
                onClick={() => void markAllAsRead()}
                disabled={
                  loading ||
                  markingAll ||
                  Boolean(busyId) ||
                  unreadCount === 0
                }
                className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
              >
                {markingAll
                  ? "Updating..."
                  : "Mark All as Read"}
              </button>
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          {loading ? (
            <p className="py-10 text-center text-slate-600">
              Loading notifications...
            </p>
          ) : notifications.length === 0 ? (
            <p className="py-10 text-center text-slate-600">
              No notifications yet.
            </p>
          ) : (
            <div className="mt-6 space-y-3">
              {notifications.map((item) => (
                <div
                  key={item.id}
                  className={`rounded-2xl border p-5 ${
                    item.read_at
                      ? "border-slate-200 bg-white"
                      : "border-sky-300 bg-sky-50"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-black">
                          {item.title}
                        </h3>

                        {!item.read_at && (
                          <span className="rounded-full bg-sky-600 px-2 py-1 text-xs font-bold text-white">
                            NEW
                          </span>
                        )}
                      </div>

                      <p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-700">
                        {item.body}
                      </p>

                      {item.data?.package_code && (
                        <p className="mt-3 text-xs font-bold text-sky-700">
                          Package: {item.data.package_code}
                        </p>
                      )}

                      <p className="mt-3 text-xs text-slate-500">
                        {new Date(item.created_at).toLocaleString()}
                      </p>
                    </div>

                    {!item.read_at && (
                      <button
                        type="button"
                        onClick={() => void markAsRead(item.id)}
                        disabled={Boolean(busyId) || markingAll}
                        className="rounded-xl border border-sky-300 bg-white px-4 py-2 text-xs font-bold text-sky-700 disabled:opacity-50"
                      >
                        {busyId === item.id
                          ? "Saving..."
                          : "Mark as Read"}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <footer className="mt-8 text-center text-xs text-slate-500">
          SkyShip LLC • Beyond Limits. Delivered.
        </footer>
      </div>
    </main>
  );
}