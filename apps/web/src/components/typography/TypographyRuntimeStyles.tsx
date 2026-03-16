import { TypographyClientProvider } from "@/components/typography/TypographyClientProvider";
import { getTypographyState } from "@/lib/server/admin/typography-repository";
import { buildTypographyStylesheet } from "@/lib/typography/runtime";
import type { ReactNode } from "react";

export default async function TypographyRuntimeStyles({
  children,
}: {
  children: ReactNode;
}) {
  let state = { sets: [], assignments: [] } as Awaited<ReturnType<typeof getTypographyState>>;
  let stylesheet = "";

  try {
    state = await getTypographyState();
    stylesheet = buildTypographyStylesheet(state);
  } catch {
    // Fall back to the seeded client state when the runtime typography store is unavailable.
  }

  return (
    <TypographyClientProvider state={state}>
      {stylesheet ? <style data-trr-typography-runtime>{stylesheet}</style> : null}
      {children}
    </TypographyClientProvider>
  );
}
