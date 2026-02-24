"use client";

import type { ReactNode } from "react";

export function LightboxImageStage({ children }: { children: ReactNode }) {
  return <div className="relative flex flex-1 items-center justify-center bg-black/20">{children}</div>;
}
