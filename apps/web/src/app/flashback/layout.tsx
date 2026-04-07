import { redirect } from "next/navigation";
import type { ReactNode } from "react";

export default async function FlashbackLayout({ children }: { children: ReactNode }) {
  void children;
  redirect("/hub");
}
