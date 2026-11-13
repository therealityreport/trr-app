"use client";

export const dynamic = "force-dynamic";

import GameGallery from "@/components/GameGallery";
import GlobalHeader from "@/components/GlobalHeader";

export default function Page() {
  return (
    <>
      <GlobalHeader />
      <GameGallery />
    </>
  );
}
