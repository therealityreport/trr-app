"use client";

import { useEffect, useState, type ComponentType } from "react";

export default function WeekDetailPageViewLoader() {
  const [Component, setComponent] = useState<ComponentType | null>(null);

  useEffect(() => {
    import("@/components/admin/social-week/WeekDetailPageView").then((mod) => {
      setComponent(() => mod.default);
    });
  }, []);

  if (!Component) {
    return (
      <div className="min-h-screen bg-zinc-50 px-6 py-8">
        <div className="mx-auto max-w-6xl rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="h-4 w-52 animate-pulse rounded bg-zinc-200" />
          <div className="mt-3 h-8 w-72 animate-pulse rounded bg-zinc-200" />
          <div className="mt-8 h-10 w-full animate-pulse rounded-xl bg-zinc-100" />
          <div className="mt-6 h-96 w-full animate-pulse rounded-xl bg-zinc-100" />
        </div>
      </div>
    );
  }
  return <Component />;
}
