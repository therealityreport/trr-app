"use client";

import Link from "next/link";

export default function HubPage() {
  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-16 dark:bg-black">
      <section className="mx-auto max-w-6xl">
        <header className="mb-10 text-center">
          <h1 className="font-serif text-4xl tracking-tight text-zinc-900 dark:text-zinc-100">
            Hub Page - No Auth Checks
          </h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            This should work without any redirects
          </p>
        </header>

        <div className="text-center">
          <p className="text-lg mb-4">If you can see this, the hub page is working!</p>
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
