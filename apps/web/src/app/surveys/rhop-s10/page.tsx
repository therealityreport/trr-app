import Link from "next/link";

export default function RHOPS10CoverPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-[#5C0F4F] to-[#12000E] px-4 py-12 text-white">
      <div className="mx-auto max-w-4xl space-y-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-white/70">RHOP · Season 10</p>
          <h1 className="text-4xl font-semibold" style={{ fontFamily: "var(--font-rude-slab)" }}>
            Weekly Cast Heat Check
          </h1>
          <p className="text-sm text-white/80">
            Rank the Potomac women from who’s carrying Season 10 to who’s coasting. Drag each portrait into place —
            tap once on mobile to reorder.
          </p>
        </div>

        <div className="rounded-3xl bg-white/5 p-6 shadow-xl backdrop-blur">
          <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-white/90">This week’s prompt</h2>
          <p className="mt-3 text-lg text-white">
            “Who owns Season 10 right now? Rank the full-time cast from unstoppable to forgettable.”
          </p>
          <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-white/80">
            <li>1 = been carrying confessionals, headlines, and conflict.</li>
            <li>Drag every cast member to lock your order.</li>
            <li>We’ll publish the fan power ranking each Monday.</li>
          </ul>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/surveys/rhop-s10/play"
            className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#5C0F4F] shadow-lg transition hover:bg-white/90"
          >
            Start Ranking
          </Link>
          <Link
            href="/surveys/rhop-s10/results"
            className="inline-flex items-center justify-center rounded-full border border-white/40 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            See Results
          </Link>
        </div>
      </div>
    </main>
  );
}
