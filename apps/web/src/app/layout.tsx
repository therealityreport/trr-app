import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import ToastHost from "@/components/ToastHost";

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
  return (
    <html lang="en">
      <body className={`${geistSans.variable} font-sans antialiased`}>
        <ToastHost />
        {children}
      </body>
    </html>
  );
}
