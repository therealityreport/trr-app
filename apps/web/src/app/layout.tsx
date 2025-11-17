import type { Metadata } from "next";
import { Geist, Inter, Playfair_Display } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import "./side-menu.css";
import ToastHost from "@/components/ToastHost";
import ErrorBoundary from "@/components/ErrorBoundary";
import DebugPanel from "@/components/DebugPanel";
import SideMenuProvider from "@/components/SideMenuProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
});

const gloucesterOS = localFont({
  src: "../../public/fonts/monotype/gloucester-os/Gloucester OS MT Std Regular.otf",
  variable: "--font-gloucester",
  display: "swap",
});

const hamburgSerial = localFont({
  src: [
    { path: "../../public/fonts/monotype/hamburg-serial/HamburgSerial-ExtraLight.otf", weight: "200", style: "normal" },
    { path: "../../public/fonts/monotype/hamburg-serial/HamburgSerial-Light.otf", weight: "300", style: "normal" },
    { path: "../../public/fonts/monotype/hamburg-serial/HamburgSerial-Regular.otf", weight: "400", style: "normal" },
    { path: "../../public/fonts/monotype/hamburg-serial/HamburgSerial-Medium.otf", weight: "500", style: "normal" },
    { path: "../../public/fonts/monotype/hamburg-serial/HamburgSerial-Bold.otf", weight: "700", style: "normal" },
    { path: "../../public/fonts/monotype/hamburg-serial/HamburgSerial-ExtraBold.otf", weight: "800", style: "normal" },
    { path: "../../public/fonts/monotype/hamburg-serial/HamburgSerial-Heavy.otf", weight: "900", style: "normal" },
  ],
  variable: "--font-hamburg",
  display: "swap",
});

const plymouthSerial = localFont({
  src: [
    { path: "../../public/fonts/monotype/plymouth-serial/PlymouthSerial-Light.otf", weight: "300", style: "normal" },
    { path: "../../public/fonts/monotype/plymouth-serial/PlymouthSerial-Regular.otf", weight: "400", style: "normal" },
    { path: "../../public/fonts/monotype/plymouth-serial/PlymouthSerial-Medium.otf", weight: "500", style: "normal" },
    { path: "../../public/fonts/monotype/plymouth-serial/PlymouthSerial-Bold.otf", weight: "700", style: "normal" },
    { path: "../../public/fonts/monotype/plymouth-serial/PlymouthSerial-ExtraBold.otf", weight: "800", style: "normal" },
    { path: "../../public/fonts/monotype/plymouth-serial/PlymouthSerial-Heavy.otf", weight: "900", style: "normal" },
    // Italics are copied to the repo too; add here if you plan to use them
  ],
  variable: "--font-plymouth-serial",
  display: "swap",
});

const rudeSlabCondensed = localFont({
  src: [
    { path: "../../public/fonts/monotype/rude-slab-condensed/RudeSlabCondensedCondensedThin-930861873.otf", weight: "200", style: "normal" },
    { path: "../../public/fonts/monotype/rude-slab-condensed/RudeSlabCondensedCondensedThinItalic-930861871.otf", weight: "200", style: "italic" },
    { path: "../../public/fonts/monotype/rude-slab-condensed/RudeSlabCondensedCondensedLight-930861870.otf", weight: "300", style: "normal" },
    { path: "../../public/fonts/monotype/rude-slab-condensed/RudeSlabCondensedCondensedLightItalic-930861869.otf", weight: "300", style: "italic" },
    { path: "../../public/fonts/monotype/rude-slab-condensed/RudeSlabCondensedCondensedBook-930861867.otf", weight: "400", style: "normal" },
    { path: "../../public/fonts/monotype/rude-slab-condensed/RudeSlabCondensedCondensedBookItalic-930861861.otf", weight: "400", style: "italic" },
    { path: "../../public/fonts/monotype/rude-slab-condensed/RudeSlabCondensedCondensedMedium-930861872.otf", weight: "500", style: "normal" },
    { path: "../../public/fonts/monotype/rude-slab-condensed/RudeSlabCondensedCondensedMediumItalic-930861862.otf", weight: "500", style: "italic" },
    { path: "../../public/fonts/monotype/rude-slab-condensed/RudeSlabCondensedCondensedBold-930861866.otf", weight: "700", style: "normal" },
    { path: "../../public/fonts/monotype/rude-slab-condensed/RudeSlabCondensedCondensedBoldItalic-930861864.otf", weight: "700", style: "italic" },
    { path: "../../public/fonts/monotype/rude-slab-condensed/RudeSlabCondensedCondensedExtrabold-930861868.otf", weight: "800", style: "normal" },
    { path: "../../public/fonts/monotype/rude-slab-condensed/RudeSlabCondensedCondensedExtraboldItalic-930861860.otf", weight: "800", style: "italic" },
    { path: "../../public/fonts/monotype/rude-slab-condensed/RudeSlabCondensedCondensedBlack-930861865.otf", weight: "900", style: "normal" },
    { path: "../../public/fonts/monotype/rude-slab-condensed/RudeSlabCondensedCondensedBlackItalic-930861863.otf", weight: "900", style: "italic" },
  ],
  variable: "--font-rude-slab",
  display: "swap",
});

const gloucesterGoodall = localFont({
  src: [
    { path: "../../public/fonts/gloucester-goodall-font-book/GoodallRegular-930826308.otf", weight: "400", style: "normal" },
    { path: "../../public/fonts/gloucester-goodall-font-book/GoodallItalic-930826312.otf", weight: "400", style: "italic" },
    { path: "../../public/fonts/gloucester-goodall-font-book/GoodallMedium-930826315.otf", weight: "500", style: "normal" },
    { path: "../../public/fonts/gloucester-goodall-font-book/GoodallMediumItalic-930826316.otf", weight: "500", style: "italic" },
    { path: "../../public/fonts/gloucester-goodall-font-book/GoodallSemiBold-930826317.otf", weight: "600", style: "normal" },
    { path: "../../public/fonts/gloucester-goodall-font-book/GoodallSemiBoldItalic-930826318.otf", weight: "600", style: "italic" },
    { path: "../../public/fonts/gloucester-goodall-font-book/GoodallBold-930826319.otf", weight: "700", style: "normal" },
    { path: "../../public/fonts/gloucester-goodall-font-book/GoodallBoldItalic-930826320.otf", weight: "700", style: "italic" },
    { path: "../../public/fonts/gloucester-goodall-font-book/GoodallBlack-930826321.otf", weight: "900", style: "normal" },
    { path: "../../public/fonts/gloucester-goodall-font-book/GoodallBlackItalic-930826322.otf", weight: "900", style: "italic" },
  ],
  variable: "--font-goodall",
  display: "swap",
});

export const metadata: Metadata = {
  title: "The Reality Report",
  description: "News, surveys, polls, quizzes, and games for Reality TV fans.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${inter.variable} ${playfair.variable} ${gloucesterOS.variable} ${hamburgSerial.variable} ${plymouthSerial.variable} ${rudeSlabCondensed.variable} ${gloucesterGoodall.variable} font-sans antialiased`}>
        <SideMenuProvider>
          <ErrorBoundary>
            <ToastHost />
            {children}
            <DebugPanel />
          </ErrorBoundary>
        </SideMenuProvider>
      </body>
    </html>
  );
}
