import { redirect } from "next/navigation";

import { buildLegacyDesignSystemHref } from "@/lib/admin/design-system-routing";

interface LegacyAdminFontsPageProps {
  searchParams?: Promise<{
    tab?: string;
  }>;
}

export default async function LegacyAdminFontsPage({ searchParams }: LegacyAdminFontsPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  redirect(buildLegacyDesignSystemHref(resolvedSearchParams?.tab));
}
