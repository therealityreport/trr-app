import Link from "next/link";

export default function RHOPS10ResultsPage() {
  return (
    <main className="min-h-screen bg-[#FDF5FB] px-4 py-12">
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-6 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.4em] text-[#5C0F4F]">RHOP · Season 10</p>
        <h1 className="text-4xl font-semibold text-[#1B0017]" style={{ fontFamily: "var(--font-rude-slab)" }}>
          Weekly Fan Power Ranking
        </h1>
        <p className="text-sm text-[#1B0017]/70">
          We’re aggregating responses from the current ranking window. Check back shortly for the leaderboard or
          resubmit your order if the episode just dropped.
        </p>
        <Link
          href="/surveys/rhop-s10/play"
          className="inline-flex items-center rounded-full bg-[#5C0F4F] px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-[#4b0a3f]"
        >
          Update My Ranking
        </Link>
      </div>
    </main>
  );
}
