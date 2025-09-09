// apps/web/src/app/hub/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { User } from "firebase/auth";
import SignOutButton from "@/components/SignOutButton";

type GameCard = {
  title: string;
  href: string;     // keep as plain string in your data
  blurb?: string;
  tone: string;
  cta?: string;
  badge?: string;
};

const CARDS: GameCard[] = [
  { title: "Realations",  href: "/realations",  tone: "bg-yellow-400", cta: "Play" },
  { title: "Realitease",  href: "/realitease",  tone: "bg-neutral-200", cta: "Play" },
  {
    title: "Realtime",
    href: "/realtime",
    tone: "bg-pink-300",
    cta: "Play",
    badge: "New",
    blurb: "Place every domino into the right spot.",
  },
  {
    title: "Strands",
    href: "/strands",
    tone: "bg-slate-300",
    cta: "Play",
    blurb: "Find hidden words and uncover the day’s theme.",
  },
  { title: "Connections", href: "/connections", tone: "bg-indigo-300", cta: "Play" },
  {
    title: "Letter Boxed",
    href: "/letter-boxed",
    tone: "bg-red-400",
    cta: "Play",
    blurb: "Create words using letters around the square.",
  },
  {
    title: "Tiles",
    href: "/tiles",
    tone: "bg-lime-300",
    cta: "Play",
    blurb: "Match tiles to keep your chain going.",
  },
  {
    title: "Sudoku",
    href: "/sudoku",
    tone: "bg-amber-500",
    cta: "Play",
    blurb: "Try this numbers game—minus the math.",
  },
];

function CardIcon() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden className="size-16 text-black/90">
      <rect x="8" y="8" width="48" height="48" rx="8" className="fill-black" />
      <circle cx="24" cy="24" r="4" className="fill-white" />
      <circle cx="40" cy="40" r="4" className="fill-white" />
    </svg>
  );
}

function GameTile({ card }: { card: GameCard }) {
  const baseButtonClasses = "inline-flex items-center rounded-full border border-stone-300 px-5 py-2 text-sm font-semibold text-zinc-800";
  const disabledButtonClasses = "cursor-not-allowed bg-zinc-100 text-zinc-400";
  const secondaryLabel = (t: string) => (t === "Realations" ? "Past Puzzles" : "Archive");

  return (
    <div className="group overflow-hidden rounded-lg border border-zinc-300 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      {/* Header */}
      <div className={`${card.tone} relative grid place-items-center p-6`}>
        <CardIcon />
        <h3 className="mt-6 text-center font-sans text-2xl font-bold text-zinc-900">
          {card.title}
        </h3>
        {card.badge && (
          <span className="absolute right-3 top-3 rounded-md bg-neutral-700 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
            {card.badge}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="space-y-4 p-5">
        {card.blurb && (
          <p className="text-center text-sm text-neutral-500 leading-tight">{card.blurb}</p>
        )}
        <div className="flex justify-center gap-3">
          {card.title === "Realitease" ? (
            <>
              <Link
                href={{ pathname: card.href }}
                className={baseButtonClasses + " hover:bg-zinc-50"}
              >
                {card.cta ?? "Play"}
              </Link>
              {["Realations", "Realitease", "Connections"].includes(card.title) && (
                <Link
                  href={{ pathname: `${card.href}/archive` }}
                  className={baseButtonClasses + " hover:bg-zinc-50"}
                >
                  {secondaryLabel(card.title)}
                </Link>
              )}
            </>
          ) : (
            <>
              <span className={baseButtonClasses + " " + disabledButtonClasses}>
                {card.cta ?? "Play"}
              </span>
              {["Realations", "Realitease", "Connections"].includes(card.title) && (
                <button disabled className={baseButtonClasses + " " + disabledButtonClasses}>
                  {secondaryLabel(card.title)}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((currentUser) => {
      console.log("Hub: Auth state changed", { user: !!currentUser, email: currentUser?.email });
      setUser(currentUser);
      setLoading(false);
      
      // Don't redirect here - let users stay on the page
      // if (!currentUser) {
      //   router.replace("/");
      // }
    });

    return unsub;
  }, [router]);

  if (loading) {
    return (
      <main className="min-h-screen bg-zinc-50 px-6 py-16 dark:bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="text-zinc-600 dark:text-zinc-400">Loading...</div>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-zinc-50 px-6 py-16 dark:bg-black flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-serif text-2xl tracking-tight text-zinc-900 dark:text-zinc-100 mb-4">
            Sign in required
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400 mb-6">
            You need to be signed in to access the hub.
          </p>
          <button
            onClick={() => router.push("/")}
            className="bg-neutral-900 text-white px-6 py-2 rounded font-hamburg hover:bg-neutral-800 transition-colors"
          >
            Go to Sign In
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-16 dark:bg-black">
      <div className="max-w-6xl mx-auto flex justify-end mb-4">
        <SignOutButton />
      </div>
      <section className="mx-auto max-w-6xl">
        <header className="mb-10 text-center">
          <h1 className="font-serif text-4xl tracking-tight text-zinc-900 dark:text-zinc-100">
            Pick a game
          </h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Daily puzzles and prototypes. More coming soon.
          </p>
        </header>

        {/* Responsive 3/2/1 grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {CARDS.map((card) => (
            <GameTile key={card.title} card={card} />
          ))}
        </div>
      </section>
    </main>
  );
}
