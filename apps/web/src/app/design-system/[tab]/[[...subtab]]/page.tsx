import { redirect } from "next/navigation";

import DesignSystemPageClient from "@/components/admin/design-system/DesignSystemPageClient";
import { resolveDesignSystemRoute } from "@/lib/admin/design-system-routing";

interface DesignSystemTabPageProps {
  params: Promise<{
    tab: string;
    subtab?: string[];
  }>;
}

export default async function DesignSystemTabPage({ params }: DesignSystemTabPageProps) {
  const { tab: tabParam, subtab: subtabSegments } = await params;
  const route = resolveDesignSystemRoute(tabParam, subtabSegments ?? null);

  if (!route.isCanonical) {
    redirect(route.canonicalHref);
  }

  return <DesignSystemPageClient activeTab={route.tab} activeSubtab={route.subtab} />;
}
