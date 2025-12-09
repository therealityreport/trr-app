"use client";

import { type ReactNode } from "react";
import GlobalHeader from "@/components/GlobalHeader";

export default function ProfileLayout({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-white text-black">
      <GlobalHeader />
      <div className="mx-auto w-full max-w-6xl px-4 pb-12 pt-6 md:px-6 lg:px-8">
        <div className="rounded-3xl bg-white p-4 md:p-6">{children}</div>
      </div>
    </main>
  );
}
