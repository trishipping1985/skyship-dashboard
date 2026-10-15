"use client";

import Link from "next/link";

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 text-white">
      <header className="border-b border-white/10 bg-white/5">
        <div className="mx-auto max-w-7xl px-6 py-7">
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-sky-400">
            SkyShip Operations
          </p>

          <h1 className="mt-2 text-4xl font-black">
            Warehouse Control Center
          </h1>

          <p className="mt-3 max-w-2xl text-slate-300">
            Manage package receiving between the USA warehouse and Lebanon.
          </p>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-12">
        <div className="grid gap-6 lg:grid-cols-2">
          <Link
            href="/dashboard/receive"
            className="group rounded-3xl border border-sky-400/20 bg-white/5 p-8 shadow-2xl transition hover:-translate-y-1 hover:border-sky-400/50 hover:bg-white/10"
          >
            <div className="flex h-full flex-col">
              <div>
                <div className="inline-flex rounded-xl border border-sky-400/30 bg-sky-400/10 px-4 py-2 text-sm font-bold uppercase tracking-wider text-sky-300">
                  USA Warehouse
                </div>

                <h2 className="mt-6 text-3xl font-black">
                  Receive Package
                </h2>

                <p className="mt-3 text-lg text-slate-300">
                  Receive packages in Wilmington, Delaware, match customer
                  pre-alerts, generate SKY-PKG codes, and print QR labels.
                </p>
              </div>

              <div className="mt-10 flex items-center justify-between">
                <span className="font-semibold text-sky-300">
                  Open USA Receiving
                </span>

                <span className="text-3xl transition group-hover:translate-x-2">
                  →
                </span>
              </div>
            </div>
          </Link>

          <Link
            href="/dashboard/lebanon-receive"
            className="group rounded-3xl border border-green-400/20 bg-white/5 p-8 shadow-2xl transition hover:-translate-y-1 hover:border-green-400/50 hover:bg-white/10"
          >
            <div className="flex h-full flex-col">
              <div>
                <div className="inline-flex rounded-xl border border-green-400/30 bg-green-400/10 px-4 py-2 text-sm font-bold uppercase tracking-wider text-green-300">
                  Lebanon Warehouse
                </div>

                <h2 className="mt-6 text-3xl font-black">
                  Lebanon Receiving
                </h2>

                <p className="mt-3 text-lg text-slate-300">
                  Scan SkyShip QR labels, automatically identify packages, and
                  confirm their arrival in Lebanon.
                </p>
              </div>

              <div className="mt-10 flex items-center justify-between">
                <span className="font-semibold text-green-300">
                  Open Lebanon Receiving
                </span>

                <span className="text-3xl transition group-hover:translate-x-2">
                  →
                </span>
              </div>
            </div>
          </Link>
        </div>

        <div className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-7">
          <p className="text-sm font-bold uppercase tracking-wider text-slate-400">
            Live Workflow
          </p>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <StatusCard
              number="01"
              title="USA Receives"
              description="Package receives a SKY-PKG code and live QR label."
            />

            <StatusCard
              number="02"
              title="Package Travels"
              description="QR remains attached to the package throughout transit."
            />

            <StatusCard
              number="03"
              title="Lebanon Confirms"
              description="Scan the QR and confirm receipt in the Lebanon warehouse."
            />
          </div>
        </div>
      </section>
    </main>
  );
}

function StatusCard({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-5">
      <p className="text-sm font-black text-sky-400">
        {number}
      </p>

      <h3 className="mt-2 text-xl font-bold">
        {title}
      </h3>

      <p className="mt-2 text-sm leading-6 text-slate-400">
        {description}
      </p>
    </div>
  );
}