import type { Metadata } from "next";
import { Geist, Inter, Playfair_Display } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import ToastHost from "@/components/ToastHost";
import ErrorBoundary from "@/components/ErrorBoundary";
import DebugPanel from "@/components/DebugPanel";
import React from "react";

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
  src: "../../public/fonts/Gloucester OS MT Std Regular.otf",
  variable: "--font-gloucester",
  display: "swap",
});

const hamburgSerial = localFont({
  src: [
    { path: "../../public/fonts/hamburg-serial-regular.ttf", weight: "400" },
    { path: "../../public/fonts/HamburgSerial Medium.ttf", weight: "500" },
  ],
  variable: "--font-hamburg",
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
      <body className={`${geistSans.variable} ${inter.variable} ${playfair.variable} ${gloucesterOS.variable} ${hamburgSerial.variable} font-sans antialiased`}>
        <ErrorBoundary>
          <ToastHost />
          {children}
          <DebugPanel />
        </ErrorBoundary>
      </body>
    </html>
  );
}
