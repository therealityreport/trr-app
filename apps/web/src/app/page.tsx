"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { onUser, signInWithGoogle, logout, initAnalytics } from "@/lib/firebase";
import { logEvent } from "firebase/analytics";
import type { User } from "firebase/auth";
import { checkUserExists, isFirestoreUnavailableError } from "@/lib/db/users";
import { AuthDebugger, EnvUtils } from "@/lib/debug";
import { buildTypographyDataAttributes } from "@/lib/typography/runtime";

const COVERAGE_PILLARS = ["News", "Polls", "Surveys", "Games"] as const;
const EDITORIAL_SIGNALS = [
  "Bravo coverage with sharper context.",
  "Daily games built for people who already know the cast list.",
  "Member flows that move from headline to vote without friction.",
] as const;
const ACCENT = "#7A0307";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.26em]" style={{ color: ACCENT }}>
      {children}
    </p>
  );
}

function EditorialAnchor() {
  return (
    <section
      aria-label="The Reality Report editorial launch artwork"
      className="rounded-[2rem] border-2 border-black bg-white px-6 py-6 text-black sm:px-8 sm:py-8"
    >
      <div className="flex h-full min-h-[26rem] flex-col justify-between gap-8 sm:min-h-[32rem]">
        <div className="flex items-start justify-between gap-4">
          <div
            className="rounded-full border border-black px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em]"
            style={{ color: ACCENT }}
          >
            The Reality Report
          </div>
          <div className="hidden text-right text-[11px] font-semibold uppercase tracking-[0.22em] text-black/60 sm:block">
            Culture desk
            <br />
            March 2026
          </div>
        </div>

        <div>
          <div className="grid gap-8 lg:grid-cols-[0.92fr_1.08fr] lg:items-end">
            <div>
              <div className="mx-auto w-full max-w-[17rem] border-b-2 border-black pb-2">
                <Image
                  src="/images/shows/rhoslc/season-6/Bronwyn.png"
                  alt="Editorial cast portrait used as launch artwork"
                  width={488}
                  height={640}
                  priority
                  className="h-auto w-full object-contain"
                />
              </div>
            </div>

            <div className="max-w-xl">
              <p className="text-[10px] font-semibold uppercase tracking-[0.4em]" style={{ color: ACCENT }}>
                Reality TV, reported with a cleaner line
              </p>
              <h2 className="mt-3 max-w-lg font-serif text-4xl leading-[0.95] tracking-[-0.05em] text-black sm:text-5xl lg:text-[4.4rem]">
                Vote fast.
                <br />
                Read deeper.
              </h2>
              <p className="mt-4 max-w-md text-sm leading-7 text-black/75 sm:text-base">
                TRR puts breaking Bravo coverage, fan surveys, and quick-hit games into one nightly rhythm.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                {COVERAGE_PILLARS.map((pillar) => (
                  <span
                    key={pillar}
                    className="rounded-full border border-black px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]"
                    style={{ color: ACCENT }}
                  >
                    {pillar}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-3 border-t border-black pt-4 sm:grid-cols-3">
          {EDITORIAL_SIGNALS.map((signal) => (
            <p key={signal} className="text-sm leading-6 text-black/75">
              {signal}
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function Page() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    AuthDebugger.log("Main page: Component mounted", {
      environment: EnvUtils.getEnvironmentInfo(),
    });

    void (async () => {
      try {
        const analytics = await initAnalytics();
        if (analytics) {
          logEvent(analytics, "page_view");
          AuthDebugger.log("Main page: Analytics initialized and page_view logged");
        }
      } catch (error) {
        AuthDebugger.log("Main page: Analytics init error (expected in some environments)", {
          error: error?.toString(),
        });
      }
    })();

    const unsub = onUser(async (currentUser) => {
      AuthDebugger.log("Main page: User state changed", {
        hasUser: !!currentUser,
        email: currentUser?.email,
        uid: currentUser?.uid?.substring(0, 8) + "...",
        environment: EnvUtils.isProduction() ? "production" : "local",
      });

      setUser(currentUser);
      AuthDebugger.log("Main page: No automatic redirects - manual navigation only");
    });

    return () => {
      AuthDebugger.log("Main page: Component unmounting, cleaning up user listener");
      unsub();
    };
  }, [router]);

  const handleGoogle = async () => {
    try {
      AuthDebugger.log("Main page: Starting Google sign-in");
      const ok = await signInWithGoogle();
      if (!ok) {
        AuthDebugger.log("Main page: Google sign-in not completed (cancelled/blocked/in-flight)");
        return;
      }
      AuthDebugger.log("Main page: Google sign-in successful, redirecting to complete");
      router.replace("/auth/complete");
    } catch (error) {
      AuthDebugger.log("Main page: Google sign-in error", { error: error?.toString() });
    }
  };

  const handleHubNavigation = () => {
    AuthDebugger.log("Main page: User clicked 'Go to Hub' button");
    try {
      router.push("/hub");
      AuthDebugger.log("Main page: router.push('/hub') called successfully");
    } catch (error) {
      AuthDebugger.log("Main page: Navigation error", { error: error?.toString() });
    }
  };

  const handleProfileNavigation = () => {
    AuthDebugger.log("Main page: User clicked 'Complete Profile' button");
    try {
      router.push("/auth/finish");
      AuthDebugger.log("Main page: router.push('/auth/finish') called successfully");
    } catch (error) {
      AuthDebugger.log("Main page: Profile navigation error", { error: error?.toString() });
    }
  };

  const handleSignOut = async () => {
    try {
      AuthDebugger.log("Main page: User initiated sign out");
      await logout();
      setUser(null);
      AuthDebugger.log("Main page: Sign out successful");
    } catch (error) {
      AuthDebugger.log("Main page: Sign out error", { error: error?.toString() });
      console.error("Error signing out:", error);
    }
  };

  return (
    <main className="min-h-dvh overflow-hidden bg-white text-black">
      <div>
        <header className="px-5 pb-4 pt-5 sm:px-7 lg:px-10">
          <div className="mx-auto flex w-full max-w-[88rem] items-center justify-between gap-4 border-b border-black pb-4">
            <Link href="/" className="transition hover:opacity-80" aria-label="The Reality Report home">
              <Image
                className="h-auto w-[15rem] sm:w-[18rem]"
                src="/images/logos/FullName-Black.png"
                alt="The Reality Report"
                width={320}
                height={70}
                priority
              />
            </Link>
            <div className="hidden items-center gap-6 text-[11px] font-semibold uppercase tracking-[0.24em] text-black sm:flex">
              <span>Reality TV Desk</span>
              <Link href="/games" className="transition hover:opacity-70">
                Games
              </Link>
              <Link href="/shows" className="transition hover:opacity-70">
                Shows
              </Link>
            </div>
          </div>
        </header>

        <section className="px-5 pb-8 sm:px-7 lg:px-10 lg:pb-10">
          <div className="mx-auto grid w-full max-w-[88rem] gap-8 xl:grid-cols-[minmax(0,0.9fr)_minmax(34rem,0.95fr)] xl:items-center">
            <div className="order-1 flex flex-col gap-8">
              <div className="max-w-2xl">
                <SectionLabel>Membership desk</SectionLabel>
                <h1
                  className="mt-4 max-w-[15ch] font-serif text-[clamp(3rem,7vw,6.4rem)] leading-[0.92] tracking-[-0.06em] text-black [text-wrap:balance]"
                  {...buildTypographyDataAttributes({
                    area: "user-frontend",
                    pageKey: "home",
                    instanceKey: "landing-shell",
                    role: "heroTitle",
                  })}
                >
                  Reality TV, reported with a sharper eye.
                </h1>
                <p
                  className="mt-5 max-w-[34rem] text-base leading-8 text-black/75 sm:text-lg"
                  {...buildTypographyDataAttributes({
                    area: "user-frontend",
                    pageKey: "home",
                    instanceKey: "landing-shell",
                    role: "body",
                  })}
                >
                  Get into TRR for fast reads, sharper polls, and daily games built for people who already know the cast list.
                </p>
              </div>

              {user ? (
                <section className="max-w-xl rounded-[2rem] border-2 border-black bg-white p-6 sm:p-7">
                  <SectionLabel>Signed in</SectionLabel>
                  <p className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-black">
                    Welcome back.
                  </p>
                  <p className="mt-2 text-sm leading-7 text-black/75">
                    You&apos;re signed in as <span className="font-semibold text-black">{user.email}</span>.
                  </p>
                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    <button
                      onClick={handleHubNavigation}
                      className="inline-flex min-h-14 items-center justify-center rounded-full bg-black px-6 text-sm font-semibold uppercase tracking-[0.18em] text-white transition duration-200 hover:opacity-85"
                      {...buildTypographyDataAttributes({
                        area: "user-frontend",
                        pageKey: "home",
                        instanceKey: "landing-shell",
                        role: "cta",
                      })}
                    >
                      Go to hub
                    </button>
                    <button
                      onClick={handleProfileNavigation}
                      className="inline-flex min-h-14 items-center justify-center rounded-full border border-black bg-white px-6 text-sm font-semibold uppercase tracking-[0.18em] text-black transition duration-200 hover:opacity-80"
                    >
                      Finish profile
                    </button>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="mt-3 inline-flex min-h-12 items-center justify-center rounded-full px-4 text-xs font-semibold uppercase tracking-[0.18em] transition hover:opacity-80"
                    style={{ color: ACCENT }}
                  >
                    Sign out
                  </button>
                </section>
              ) : (
                <form
                  noValidate
                  onSubmit={async (event) => {
                    event.preventDefault();
                    const formData = new FormData(event.currentTarget);
                    const email = formData.get("email") as string;
                    if (!email?.trim()) return;

                    try {
                      const normalizedEmail = email.trim();
                      const userExists = await checkUserExists(normalizedEmail);
                      if (userExists) {
                        router.push(`/login?email=${encodeURIComponent(normalizedEmail)}`);
                      } else {
                        router.push(`/auth/register?email=${encodeURIComponent(normalizedEmail)}`);
                      }
                    } catch (error) {
                      console.error("Error checking user existence:", error);
                      if (isFirestoreUnavailableError(error)) {
                        router.push(`/login?email=${encodeURIComponent(email.trim())}`);
                      } else {
                        router.push(`/auth/register?email=${encodeURIComponent(email.trim())}`);
                      }
                    }
                  }}
                  className="max-w-xl rounded-[2rem] border-2 border-black bg-white p-6 sm:p-7"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <SectionLabel>Member access</SectionLabel>
                      <p className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-black">
                        Log in or create your account.
                      </p>
                    </div>
                    <div
                      className="rounded-full border border-black bg-white px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em]"
                      style={{ color: ACCENT }}
                    >
                      Email first
                    </div>
                  </div>

                  <div className="mt-6">
                    <label
                      htmlFor="email"
                      className="text-[11px] font-semibold uppercase tracking-[0.22em]"
                      style={{ color: ACCENT }}
                      {...buildTypographyDataAttributes({
                        area: "user-frontend",
                        pageKey: "home",
                        instanceKey: "landing-shell",
                        role: "body",
                      })}
                    >
                      Email address
                    </label>
                    <div className="mt-3 flex min-h-16 items-center rounded-[1.4rem] border border-black bg-white px-5 transition focus-within:border-black">
                      <input
                        type="email"
                        name="email"
                        id="email"
                        required
                        placeholder="your.email@example.com"
                        className="w-full bg-transparent text-base text-black outline-none placeholder:text-black/50"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="mt-4 inline-flex min-h-14 w-full items-center justify-center rounded-full bg-black px-6 text-sm font-semibold uppercase tracking-[0.18em] text-white transition duration-200 hover:opacity-85"
                    {...buildTypographyDataAttributes({
                      area: "user-frontend",
                      pageKey: "home",
                      instanceKey: "landing-shell",
                      role: "cta",
                    })}
                  >
                    Continue
                  </button>

                  <div className="mt-5 flex items-center gap-4">
                    <div className="h-px flex-1 bg-black/10" />
                    <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-black/50">
                      or
                    </span>
                    <div className="h-px flex-1 bg-black/10" />
                  </div>

                  <button
                    type="button"
                    onClick={handleGoogle}
                    className="mt-5 inline-flex min-h-14 w-full items-center justify-center rounded-full border border-black bg-white px-6 text-sm font-semibold uppercase tracking-[0.16em] text-black transition duration-200 hover:opacity-80"
                  >
                    <span
                      {...buildTypographyDataAttributes({
                        area: "user-frontend",
                        pageKey: "home",
                        instanceKey: "landing-shell",
                        role: "body",
                      })}
                    >
                      Continue with Google
                    </span>
                  </button>

                  <p
                    className="mt-5 max-w-lg text-sm leading-7 text-black/70"
                    {...buildTypographyDataAttributes({
                      area: "user-frontend",
                      pageKey: "home",
                      instanceKey: "landing-shell",
                      role: "body",
                    })}
                  >
                    By continuing, you agree to the{" "}
                    <Link href="/terms-of-sale" className="font-medium text-black underline decoration-black underline-offset-4">
                      Terms of Sale
                    </Link>
                    {", "}
                    <Link href="/terms-of-service" className="font-medium text-black underline decoration-black underline-offset-4">
                      Terms of Service
                    </Link>
                    {", and "}
                    <Link href="/privacy-policy" className="font-medium text-black underline decoration-black underline-offset-4">
                      Privacy Policy
                    </Link>
                    .
                  </p>
                </form>
              )}
            </div>

            <div className="order-2">
              <EditorialAnchor />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
