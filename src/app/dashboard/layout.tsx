"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function checkUser() {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (!mounted) {
        return;
      }

      if (error || !user) {
        setAuthorized(false);
        setCheckingAuth(false);
        router.replace("/login");
        return;
      }

      setAuthorized(true);
      setCheckingAuth(false);
    }

    void checkUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) {
        return;
      }

      if (!session?.user) {
        setAuthorized(false);
        router.replace("/login");
        return;
      }

      setAuthorized(true);
      setCheckingAuth(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [router]);

  if (checkingAuth) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 text-white">
        <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-5 text-slate-200">
          Checking SkyShip session...
        </div>
      </main>
    );
  }

  if (!authorized) {
    return null;
  }

  return <>{children}</>;
}
