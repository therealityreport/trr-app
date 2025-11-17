"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getUserProfile } from "@/lib/db/users";
import type { UserProfile } from "@/lib/validation/user";

type ProfileState = {
  loading: boolean;
  error: string | null;
};

function StatItem({ label, value, helper }: { label: string; value: string | number; helper?: string }) {
  return (
    <div className="rounded-2xl border border-zinc-100 bg-white/90 px-4 py-3 text-center shadow-[0_4px_24px_rgba(15,23,42,0.05)]">
      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-zinc-500">{label}</p>
      <p className="mt-1 text-3xl font-bold text-black">{value}</p>
      {helper && <p className="mt-1 text-xs text-zinc-500">{helper}</p>}
    </div>
  );
}

function GameStatCard({
  title,
  value,
  trend,
}: {
  title: string;
  value: string;
  trend?: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white/80 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
      <p className="text-xs font-semibold uppercase tracking-[0.35em] text-zinc-500">{title}</p>
      <p className="mt-2 text-3xl font-bold text-black">{value}</p>
      {trend && <p className="text-xs text-zinc-500">{trend}</p>}
    </div>
  );
}

function ChecklistItem({ label, helper, complete }: { label: string; helper: string; complete: boolean }) {
  return (
    <li className="flex items-start gap-3 rounded-2xl border border-zinc-200 bg-white/80 px-4 py-3">
      <span
        aria-hidden="true"
        className={`mt-1 inline-flex size-6 items-center justify-center rounded-full text-xs font-semibold ${
          complete ? "bg-emerald-100 text-emerald-700" : "bg-zinc-100 text-zinc-500"
        }`}
      >
        {complete ? "✓" : "•"}
      </span>
      <div>
        <p className="text-sm font-semibold text-black">{label}</p>
        <p className="text-xs text-zinc-500">{helper}</p>
      </div>
    </li>
  );
}

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [{ loading, error }, setState] = useState<ProfileState>({ loading: true, error: null });

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      setUser(firebaseUser);
      if (!firebaseUser) {
        setProfile(null);
        setState({ loading: false, error: null });
        return;
      }

      setState({ loading: true, error: null });
      try {
        const record = await getUserProfile(firebaseUser.uid);
        setProfile(record);
        setState({ loading: false, error: null });
      } catch (err) {
        console.error("Profile page: failed to load profile", err);
        setState({ loading: false, error: "Unable to load profile" });
      }
    });

    return () => unsubscribe();
  }, []);

  const shows = useMemo(() => profile?.shows ?? [], [profile]);
  const displayName = profile?.name ?? user?.displayName ?? "Reality Fan";
  const displayUsername = profile?.username ? `@${profile.username}` : user?.email ?? "unknown";
  const initials = displayName
    .split(" ")
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const showCount = shows.length;
  const followerCount = profile ? 128 + showCount * 12 : 0;
  const followingCount = profile ? 48 + showCount * 4 : 0;
  const secondaryShowCount = Math.max(showCount - 1, 0);
  const primaryShow = shows[0] ?? null;
  const membershipBadge = useMemo(() => {
    if (showCount >= 8) return "Reality Archivist";
    if (showCount >= 5) return "Bravo Scholar";
    if (showCount >= 3) return "Superfan";
    return "New Member";
  }, [showCount]);

  const showSummary = useMemo(() => {
    if (showCount === 0) return "Add shows to personalize your polls and trivia.";
    if (showCount === 1) return `All eyes on ${shows[0]}.`;
    if (showCount === 2) return `Balancing ${shows[0]} + ${shows[1]}.`;
    return `${shows[0]} + ${secondaryShowCount} more in rotation.`;
  }, [showCount, secondaryShowCount, shows]);

  const highlightShows = useMemo(() => shows.slice(0, 8), [shows]);
  const extraShowCount = Math.max(0, showCount - highlightShows.length);

  const joinedLabel = useMemo(() => {
    const createdAt = user?.metadata?.creationTime ?? null;
    if (!createdAt) return null;
    const date = new Date(createdAt);
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  }, [user]);

  const checklist = useMemo(
    () => [
      {
        id: "username",
        label: "Username reserved",
        helper: profile?.username ? `@${profile.username}` : "Claim yours to share your stats",
        complete: Boolean(profile?.username),
      },
      {
        id: "shows",
        label: "Following 3+ shows",
        helper: showCount >= 3 ? `${showCount} shows tracked` : "Add at least 3 shows to unlock recs",
        complete: showCount >= 3,
      },
      {
        id: "birthday",
        label: "Birthday verified",
        helper: profile?.birthday ? "Birthday on file" : "Needed for prize eligibility",
        complete: Boolean(profile?.birthday),
      },
    ],
    [profile, showCount],
  );

  const checklistProgress = Math.round((checklist.filter((item) => item.complete).length / checklist.length) * 100);

  if (loading) {
    return (
      <section className="flex min-h-[50vh] items-center justify-center text-sm text-zinc-500">
        Loading your profile…
      </section>
    );
  }

  if (!user) {
    return (
      <section className="rounded-3xl border border-zinc-200 bg-white p-10 text-center">
        <p className="text-xl font-semibold text-black">Sign in to view your profile</p>
        <p className="mt-2 text-sm text-zinc-500">
          Your photo, Bravo stats, and personalized show list will appear once you log in.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-flex items-center justify-center rounded-full bg-black px-6 py-3 text-sm font-semibold text-white transition hover:bg-zinc-900"
        >
          Go to login
        </Link>
      </section>
    );
  }

  return (
    <section className="space-y-8">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <article className="relative overflow-hidden rounded-[32px] border border-zinc-200 bg-gradient-to-br from-[#FEF9F3] via-white to-[#F2ECE1] p-6 shadow-[0_25px_80px_rgba(15,23,42,0.08)]">
        <div className="pointer-events-none absolute inset-0 opacity-20" style={{ backgroundImage: "url(/assets/icons/side-menu/background.svg)" }} aria-hidden="true" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-white/30 via-transparent to-white/10" aria-hidden="true" />
        <div className="relative flex flex-col gap-8 md:flex-row md:items-center">
          <div className="flex flex-col items-center gap-4 md:items-start">
            <div className="relative grid size-32 place-items-center rounded-full border-[4px] border-black bg-white text-3xl font-bold uppercase shadow-[0_12px_35px_rgba(15,23,42,0.2)]">
              {user.photoURL ? (
                <Image
                  src={user.photoURL}
                  alt={displayName}
                  width={120}
                  height={120}
                  className="size-28 rounded-full object-cover"
                />
              ) : (
                initials
              )}
              <span className="pointer-events-none absolute inset-3 rounded-full border border-dashed border-black/40" aria-hidden="true" />
            </div>
            <button
              type="button"
              className="text-xs font-semibold uppercase tracking-[0.35em] text-zinc-600 hover:text-black"
            >
              Update photo
            </button>
          </div>

          <div className="flex-1 space-y-4 text-center md:text-left">
            <div className="space-y-2">
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-zinc-600">Reality Profile</p>
              <div className="flex flex-wrap items-center justify-center gap-3 md:justify-start">
                <h2 className="text-4xl font-bold text-black" style={{ fontFamily: "var(--font-rude-slab)" }}>
                  {displayName}
                </h2>
                <span className="inline-flex items-center rounded-full border border-black px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em]">
                  {membershipBadge}
                </span>
              </div>
              <p className="text-sm text-zinc-500">{displayUsername}</p>
              <p className="text-sm text-black">{showSummary}</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <StatItem label="Followers" value={followerCount} helper="Estimated fans" />
              <StatItem label="Following" value={followingCount} helper="Bravo accounts" />
              <StatItem label="Shows" value={showCount} helper="Tracked favorites" />
            </div>

            <div className="flex flex-wrap justify-center gap-3 md:justify-start">
              <Link
                href="/hub/surveys"
                className="inline-flex items-center rounded-full border border-zinc-300 bg-white/80 px-5 py-2 text-sm font-semibold text-black shadow-sm transition hover:bg-white"
              >
                Edit interests
              </Link>
              <Link
                href="/auth/finish"
                className="inline-flex items-center rounded-full bg-black px-5 py-2 text-sm font-semibold text-white transition hover:bg-zinc-900"
              >
                Update profile
              </Link>
            </div>
          </div>

          <div className="w-full rounded-2xl border border-black/10 bg-white/80 p-5 shadow-inner md:w-64">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-zinc-500">Current focus</p>
            {primaryShow ? (
              <>
                <p className="mt-2 text-2xl font-bold text-black">{primaryShow}</p>
                {secondaryShowCount > 0 && (
                  <p className="text-sm text-zinc-500">+ {secondaryShowCount} more on your list</p>
                )}
              </>
            ) : (
              <p className="mt-2 text-sm text-zinc-500">Pick a few shows to unlock tailored recs.</p>
            )}
            {joinedLabel && <p className="mt-6 text-xs text-zinc-500">Member since {joinedLabel}</p>}
          </div>
        </div>
      </article>

      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <article className="rounded-3xl border border-zinc-200 bg-white p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-zinc-500">Shows you follow</p>
              <h3 className="text-2xl font-bold text-black">Your Bravo rotation</h3>
            </div>
            <Link href="/hub/surveys" className="text-sm font-semibold text-black underline underline-offset-4">
              Manage shows
            </Link>
          </div>

          {showCount === 0 ? (
            <p className="mt-6 text-sm text-zinc-500">
              Add at least three shows during onboarding to unlock tailored polls and notifications.
            </p>
          ) : (
            <>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {highlightShows.map((show, index) => (
                  <div
                    key={show}
                    className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-zinc-50/70 px-5 py-3"
                  >
                    <div>
                      <p className="text-base font-semibold text-black">{show}</p>
                      <p className="text-xs text-zinc-500">Rank #{index + 1}</p>
                    </div>
                    <span className="text-xs font-semibold uppercase tracking-[0.35em] text-zinc-400">BRAVO</span>
                  </div>
                ))}
              </div>
              {extraShowCount > 0 && (
                <p className="mt-4 text-xs text-zinc-500">…and {extraShowCount} more shows saved.</p>
              )}
            </>
          )}
        </article>

        <div className="space-y-6">
          <article className="rounded-3xl border border-zinc-200 bg-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-zinc-500">Game stats</p>
                <h3 className="text-lg font-bold text-black">Daily play</h3>
              </div>
              <Link href="/realitease/play" className="text-xs font-semibold uppercase tracking-[0.35em] text-black">
                Play now
              </Link>
            </div>
            <div className="mt-4 space-y-4">
              <GameStatCard title="Realitease streak" value="—" trend="Play today to start a streak." />
              <GameStatCard title="Bravodle solves" value="—" trend="Finish your first puzzle to unlock stats." />
            </div>
          </article>

          <article className="rounded-3xl border border-zinc-200 bg-white p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-zinc-500">Account Status</p>
                <h3 className="text-lg font-bold text-black">{checklistProgress}% complete</h3>
              </div>
              <Link href="/auth/finish" className="text-xs font-semibold uppercase tracking-[0.35em] text-black">
                Review
              </Link>
            </div>
            <ul className="mt-4 space-y-3">
              {checklist.map((item) => (
                <ChecklistItem key={item.id} label={item.label} helper={item.helper} complete={item.complete} />
              ))}
            </ul>
          </article>
        </div>
      </div>
    </section>
  );
}
