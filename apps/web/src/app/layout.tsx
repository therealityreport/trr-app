import type { Metadata } from "next";
import { Geist, Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import "./side-menu.css";
import "@/styles/cdn-fonts.css";
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
  preload: false,
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
  preload: false,
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
      <body className={`${geistSans.variable} ${inter.variable} ${playfair.variable} font-sans antialiased`}>
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
