"use client";

import { useEffect, useState, type ComponentType } from "react";

export default function WeekDetailPageViewLoader() {
  const [Component, setComponent] = useState<ComponentType | null>(null);

  useEffect(() => {
    import("@/components/admin/social-week/WeekDetailPageView").then((mod) => {
      setComponent(() => mod.default);
    });
  }, []);

  if (!Component) return null;
  return <Component />;
}
