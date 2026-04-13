import { redirect } from "next/navigation";

import DesignSystemPageClient from "@/components/admin/design-system/DesignSystemPageClient";
import { decodeColorLabShareState } from "@/lib/admin/color-lab/share-state";
import { resolveDesignSystemRoute } from "@/lib/admin/design-system-routing";

interface DesignSystemTabPageProps {
  params: Promise<{
    tab: string;
    subtab?: string[];
  }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

function getSearchParamValue(
  searchParams: Record<string, string | string[] | undefined>,
  key: string,
): string | null {
  const raw = searchParams[key];
  if (typeof raw === "string") return raw;
  if (Array.isArray(raw)) return raw[0] ?? null;
  return null;
}

export default async function DesignSystemTabPage({ params, searchParams }: DesignSystemTabPageProps) {
  const { tab: tabParam, subtab: subtabSegments } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const route = resolveDesignSystemRoute(tabParam, subtabSegments ?? null);
  const initialColorLabState = route.tab === "colors"
    ? decodeColorLabShareState(getSearchParamValue(resolvedSearchParams, "palette"))
    : null;

  if (!route.isCanonical) {
    redirect(route.canonicalHref);
  }

  return (
    <DesignSystemPageClient
      activeTab={route.tab}
      activeSubtab={route.subtab}
      initialColorLabState={initialColorLabState}
    />
  );
}
