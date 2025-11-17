"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import type { User } from "firebase/auth";
import ClientOnly from "@/components/ClientOnly";

const FONT_FAMILIES = [
  {
    name: "Sans (Hamburg + Inter + Geist)",
    cssVar: "--font-sans",
    usage: "font-sans (Default body font)",
    weights: [200, 300, 400, 500, 600, 700, 800, 900],
    type: "Font Stack",
    description: "Includes Hamburg Serial, Inter, and Geist Sans",
  },
  {
    name: "Serif (Gloucester + Playfair)",
    cssVar: "--font-serif",
    usage: "font-serif (Used for h1, h2, h3)",
    weights: [400, 500, 600, 700, 800, 900],
    type: "Font Stack",
    description: "Includes Gloucester OS, Playfair Display, and fallbacks",
  },
  {
    name: "Hamburg Serial",
    cssVar: "--font-hamburg",
    usage: 'style={{ fontFamily: "var(--font-hamburg)" }}',
    weights: [200, 300, 400, 500, 700, 800, 900],
    type: "Local Font",
    files: [
      "HamburgSerial-ExtraLight.otf (200)",
      "HamburgSerial-Light.otf (300)",
      "HamburgSerial-Regular.otf (400)",
      "HamburgSerial-Medium.otf (500)",
      "HamburgSerial-Bold.otf (700)",
      "HamburgSerial-ExtraBold.otf (800)",
      "HamburgSerial-Heavy.otf (900)",
    ],
  },
  {
    name: "Gloucester OS MT Std",
    cssVar: "--font-gloucester",
    usage: 'style={{ fontFamily: "var(--font-gloucester)" }}',
    weights: [400],
    type: "Local Font",
    files: ["Gloucester OS MT Std Regular.otf (400)"],
  },
  {
    name: "Plymouth Serial",
    cssVar: "--font-plymouth-serial",
    usage: 'style={{ fontFamily: "var(--font-plymouth-serial)" }}',
    weights: [300, 400, 500, 700, 800, 900],
    type: "Local Font",
    files: [
      "PlymouthSerial-Light.otf (300)",
      "PlymouthSerial-Regular.otf (400)",
      "PlymouthSerial-Medium.otf (500)",
      "PlymouthSerial-Bold.otf (700)",
      "PlymouthSerial-ExtraBold.otf (800)",
      "PlymouthSerial-Heavy.otf (900)",
    ],
  },
  {
    name: "Rude Slab Condensed",
    cssVar: "--font-rude-slab",
    usage: 'style={{ fontFamily: "var(--font-rude-slab)" }}',
    weights: [200, 300, 400, 500, 700, 800, 900],
    type: "Local Font",
    files: [
      "RudeSlabCondensedCondensedThin (200)",
      "RudeSlabCondensedCondensedLight (300)",
      "RudeSlabCondensedCondensedBook (400)",
      "RudeSlabCondensedCondensedMedium (500)",
      "RudeSlabCondensedCondensedBold (700)",
      "RudeSlabCondensedCondensedExtrabold (800)",
      "RudeSlabCondensedCondensedBlack (900)",
      "All weights also include italic variants",
    ],
  },
  {
    name: "Geist Sans",
    cssVar: "--font-geist-sans",
    usage: 'style={{ fontFamily: "var(--font-geist-sans)" }}',
    weights: [100, 200, 300, 400, 500, 600, 700, 800, 900],
    type: "Google Font",
    description: "Part of the default sans stack",
  },
  {
    name: "Inter",
    cssVar: "--font-inter",
    usage: 'style={{ fontFamily: "var(--font-inter)" }}',
    weights: [100, 200, 300, 400, 500, 600, 700, 800, 900],
    type: "Google Font",
    description: "Part of the default sans stack",
  },
  {
    name: "Playfair Display",
    cssVar: "--font-playfair",
    usage: 'style={{ fontFamily: "var(--font-playfair)" }}',
    weights: [400, 500, 600, 700, 800, 900],
    type: "Google Font",
    description: "Part of the default serif stack",
  },
  {
    name: "Gloucester Goodall",
    cssVar: "--font-goodall",
    usage: 'style={{ fontFamily: "var(--font-goodall)" }}',
    weights: [400, 500, 600, 700, 900],
    type: "Local Font",
    files: [
      "GoodallRegular-930826308.otf (400)",
      "GoodallItalic-930826312.otf (400 italic)",
      "GoodallMedium-930826315.otf (500)",
      "GoodallMediumItalic-930826316.otf (500 italic)",
      "GoodallSemiBold-930826317.otf (600)",
      "GoodallSemiBoldItalic-930826318.otf (600 italic)",
      "GoodallBold-930826319.otf (700)",
      "GoodallBoldItalic-930826320.otf (700 italic)",
      "GoodallBlack-930826321.otf (900)",
      "GoodallBlackItalic-930826322.otf (900 italic)",
    ],
  },
];

const ADDITIONAL_FONTS = [
  {
    category: "Gloucester Variants",
    files: [
      "gloucester-bold-font-book/Gloucester MT Std Bold.otf",
      "gloucester-condensed-font-book/*",
    ],
  },
  {
    category: "Realitease Fonts",
    files: [
      "realitease/NYTFranklin Medium",
      "realitease/NYTFranklin",
      "realitease/NYTKarnak Medium",
      "realitease/NYTKarnak_Condensed",
      "realitease/TN_Web_Use_Only",
      "realitease/Tee Franklin W01 Medium",
    ],
  },
];

function FontPreview({ family }: { family: typeof FONT_FAMILIES[0] }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h3 className="text-lg font-bold text-zinc-900">{family.name}</h3>
          <p className="text-sm text-zinc-500">{family.type}</p>
          {family.description && (
            <p className="mt-1 text-xs text-zinc-400">{family.description}</p>
          )}
        </div>
        <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700">
          {family.weights.length} weight{family.weights.length > 1 ? "s" : ""}
        </span>
      </div>

      <div className="space-y-3">
        <div className="rounded bg-zinc-50 p-3">
          <p className="mb-1 text-xs font-medium text-zinc-600">CSS Variable</p>
          <code className="text-sm text-zinc-900">{family.cssVar}</code>
        </div>

        <div className="rounded bg-zinc-50 p-3">
          <p className="mb-1 text-xs font-medium text-zinc-600">Usage</p>
          <code className="text-xs text-zinc-900">{family.usage}</code>
        </div>

        {family.files && (
          <div className="rounded bg-zinc-50 p-3">
            <p className="mb-2 text-xs font-medium text-zinc-600">Font Files</p>
            <div className="space-y-1">
              {family.files.map((file, idx) => (
                <p key={idx} className="text-xs text-zinc-700">
                  {file}
                </p>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2 border-t border-zinc-200 pt-4">
          <p className="text-xs font-medium text-zinc-600">Preview</p>
          {family.weights.map((weight) => (
            <div
              key={weight}
              style={{ fontFamily: `var(${family.cssVar})`, fontWeight: weight }}
            >
              <span className="text-xs text-zinc-400">
                {weight}:{" "}
              </span>
              <span className="text-lg text-zinc-900">
                The quick brown fox jumps over the lazy dog
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AdminFontsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      setLoading(false);

      // Redirect if not authenticated
      if (!currentUser) {
        router.replace("/");
      }
    });

    return () => unsubscribe();
  }, [router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-neutral-900 border-t-transparent"></div>
          <p className="text-sm text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <ClientOnly>
      <div className="min-h-screen bg-zinc-50">
        {/* Header */}
        <header className="border-b border-zinc-200 bg-white px-6 py-4">
          <div className="mx-auto max-w-7xl">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-zinc-900">Font Library</h1>
                <p className="mt-1 text-sm text-zinc-600">
                  All available fonts loaded in the application
                </p>
              </div>
              <button
                type="button"
                onClick={() => router.push("/hub")}
                className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-50"
              >
                Back to Hub
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="mx-auto max-w-7xl px-6 py-8">
          {/* Loaded Fonts Section */}
          <section className="mb-12">
            <h2 className="mb-6 text-xl font-bold text-zinc-900">
              Loaded Fonts ({FONT_FAMILIES.length})
            </h2>
            <div className="grid gap-6 md:grid-cols-2">
              {FONT_FAMILIES.map((family) => (
                <FontPreview key={family.name} family={family} />
              ))}
            </div>
          </section>

          {/* Additional Font Files Section */}
          <section>
            <h2 className="mb-6 text-xl font-bold text-zinc-900">
              Additional Font Files Available
            </h2>
            <div className="space-y-4">
              {ADDITIONAL_FONTS.map((category) => (
                <div
                  key={category.category}
                  className="rounded-lg border border-zinc-200 bg-white p-6"
                >
                  <h3 className="mb-3 font-bold text-zinc-900">{category.category}</h3>
                  <div className="space-y-2">
                    {category.files.map((file, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 16 16"
                          fill="none"
                          className="flex-shrink-0 text-zinc-400"
                        >
                          <path
                            d="M13.3333 4L6 11.3333L2.66667 8"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        <code className="text-sm text-zinc-700">{file}</code>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Usage Instructions */}
          <section className="mt-12 rounded-lg border border-blue-200 bg-blue-50 p-6">
            <h3 className="mb-3 font-bold text-blue-900">Usage Instructions</h3>
            <div className="space-y-3 text-sm text-blue-800">
              <p>
                <strong>To use fonts in your components:</strong>
              </p>

              <div className="space-y-2">
                <p className="font-semibold">Option 1: Use font stacks (Recommended)</p>
                <div className="rounded bg-blue-100 p-3">
                  <code className="text-xs">className=&quot;font-sans&quot;</code>
                  <p className="mt-1 text-xs">Uses Hamburg + Inter + Geist Sans</p>
                </div>
                <div className="rounded bg-blue-100 p-3">
                  <code className="text-xs">className=&quot;font-serif&quot;</code>
                  <p className="mt-1 text-xs">Uses Gloucester + Playfair Display</p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="font-semibold">Option 2: Use specific fonts with CSS variables</p>
                <div className="rounded bg-blue-100 p-3">
                  <code className="text-xs">style={`{{ fontFamily: &quot;var(--font-hamburg)&quot; }}`}</code>
                  <p className="mt-1 text-xs">Uses only Hamburg Serial</p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="font-semibold">Option 3: Combine with font weights</p>
                <div className="rounded bg-blue-100 p-3">
                  <code className="text-xs">className=&quot;font-sans font-bold&quot;</code>
                  <p className="mt-1 text-xs">Uses sans stack with bold weight (700)</p>
                </div>
              </div>
            </div>
          </section>

          {/* Theme Configuration */}
          <section className="mt-6 rounded-lg border border-zinc-200 bg-white p-6">
            <h3 className="mb-3 font-bold text-zinc-900">Tailwind v4 Theme Configuration</h3>
            <p className="mb-3 text-sm text-zinc-600">
              Fonts are configured in globals.css using the @theme directive:
            </p>
            <div className="space-y-2">
              <div className="rounded bg-zinc-50 p-3">
                <code className="text-xs text-zinc-900">
                  --font-sans: var(--font-hamburg), var(--font-inter), var(--font-geist-sans)
                </code>
              </div>
              <div className="rounded bg-zinc-50 p-3">
                <code className="text-xs text-zinc-900">
                  --font-serif: var(--font-gloucester), var(--font-playfair), ...
                </code>
              </div>
              <div className="rounded bg-zinc-50 p-3">
                <code className="text-xs text-zinc-900">
                  --font-body: var(--font-hamburg)
                </code>
              </div>
              <div className="rounded bg-zinc-50 p-3">
                <code className="text-xs text-zinc-900">
                  --font-games: var(--font-plymouth-serial), ...
                </code>
              </div>
            </div>
          </section>
        </main>
      </div>
    </ClientOnly>
  );
}
