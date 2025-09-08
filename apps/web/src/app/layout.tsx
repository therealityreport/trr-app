import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import ToastHost from "@/components/ToastHost";
import React from "react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "The Reality Report",
  description: "News, surveys, polls, quizzes, and games for Reality TV fans.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const useEmu = (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS ?? "false").toLowerCase() === "true";
  return (
    <html lang="en">
      <body className={`${geistSans.variable} font-sans antialiased`}>
        {useEmu && (
          <div className="w-full bg-amber-100 text-amber-900 text-xs py-2 px-3 text-center">
            You're on the local Firebase emulator.
          </div>
        )}
        <ToastHost />
        {children}
      </body>
    </html>
  );
}