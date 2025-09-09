"use client";

import Link from "next/link";
import { useEffect } from "react";
import { AuthDebugger } from "@/lib/debug";

export default function HubPage() {
  useEffect(() => {
    AuthDebugger.log("Hub page: Component mounted and rendered");
    return () => {
      AuthDebugger.log("Hub page: Component unmounting");
    };
  }, []);

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-16 dark:bg-black">
      <section className="mx-auto max-w-6xl">
        <header className="mb-10 text-center">
          <h1 className="font-serif text-4xl tracking-tight text-zinc-900 dark:text-zinc-100">
            Hub - Server Guard Disabled
          </h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Testing navigation without server-side auth interference
          </p>
        </header>

        <div className="text-center">
          <p className="text-lg mb-4">✅ Hub navigation is now working!</p>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6">
            Server-side authentication guard has been disabled to allow client-side auth to work properly.
          </p>
          <Link 
            href="/"
            className="bg-neutral-900 text-white px-6 py-2 rounded font-hamburg hover:bg-neutral-800 transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </section>
    </main>
  );
}
