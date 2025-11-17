// apps/web/src/app/hub/page.tsx
import React from "react";
import Image from "next/image";
import Link from "next/link";
import ClientAuthGuard from "@/components/ClientAuthGuard";

type GameCard = {
  title: string;
  href: string; // keep as plain string in your data
  blurb?: string;
  tone: string;
  cta?: string;
  badge?: string;
  icon: string;
  archiveHref?: string;
};

const CARDS: GameCard[] = [
  {
    title: "Realitease",
    href: "/realitease/cover",
    archiveHref: "/realitease/archive",
    tone: "bg-neutral-200",
    cta: "Play",
    icon: "/icons/Realitease-Icon.svg",
  },
  {
    title: "Bravodle",
    href: "/bravodle/cover",
    tone: "bg-fuchsia-200",
    cta: "Play",
    blurb: "Guess the Bravo-lebrity in six tries.",
    icon: "/icons/Bravodle-Icon.svg",
  },
];

function GameTile({ card }: { card: GameCard }) {
  const baseButtonClasses =
    "inline-flex items-center rounded-full border border-stone-300 px-5 py-2 text-sm font-semibold text-zinc-800";
  const disabledButtonClasses = "cursor-not-allowed bg-zinc-100 text-zinc-400";
  const secondaryLabel = () => "Archive";

  return (
    <div className="group overflow-hidden rounded-3xl bg-white border-2 border-zinc-300 transition hover:-translate-y-0.5 hover:border-zinc-400">
      {/* Header */}
      <div className={`${card.tone} relative grid place-items-center p-6`}>
        <div className="flex flex-col items-center gap-4">
          <span className="rounded-2xl bg-white/90 p-4 shadow-inner">
            <Image src={card.icon} alt={`${card.title} icon`} width={64} height={64} />
          </span>
          <h3
            className="text-center text-2xl font-bold text-zinc-900"
            style={{ fontFamily: "var(--font-rude-slab)", fontWeight: 900 }}
          >
            {card.title}
          </h3>
        </div>
        {card.badge && (
          <span className="absolute right-3 top-3 rounded-md bg-neutral-700 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
            {card.badge}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="space-y-4 p-5">
        {card.blurb && <p className="text-center text-sm text-neutral-500 leading-tight">{card.blurb}</p>}
        <div className="flex justify-center gap-3">
          {["Realitease", "Bravodle"].includes(card.title) ? (
            <>
              <Link href={{ pathname: card.href }} className={baseButtonClasses + " hover:bg-zinc-50"}>
                {card.cta ?? "Play"}
              </Link>
              {card.archiveHref && (
                <Link href={{ pathname: card.archiveHref }} className={baseButtonClasses + " hover:bg-zinc-50"}>
                  {secondaryLabel()}
                </Link>
              )}
            </>
          ) : (
            <>
              <span className={baseButtonClasses + " " + disabledButtonClasses}>{card.cta ?? "Play"}</span>
              {card.archiveHref && (
                <button disabled className={baseButtonClasses + " " + disabledButtonClasses}>
                  {secondaryLabel()}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default async function Page() {
  return (
    <ClientAuthGuard requireComplete={true}>
      <main
        className="min-h-screen bg-white px-6 py-16 text-black"
        style={{ fontFamily: "var(--font-plymouth-serial)", fontWeight: 800 }}
      >
        <section className="mx-auto max-w-6xl">
          <header className="mb-10 text-center">
            <h1 className="font-serif text-4xl tracking-tight text-zinc-900 dark:text-zinc-100">Pick a game</h1>
            <p className="mt-2 text-zinc-600 dark:text-zinc-400">
              Daily puzzles and prototypes. Surveys now live on the Surveys tab. More coming soon.
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
    </ClientAuthGuard>
  );
}
