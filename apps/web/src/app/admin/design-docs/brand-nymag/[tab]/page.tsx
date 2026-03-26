import { redirect } from "next/navigation";
import DesignDocsPageClient from "@/components/admin/design-docs/DesignDocsPageClient";

const VALID_TABS = new Set([
  "typography",
  "colors",
  "components",
  "layout",
  "shapes",
  "resources",
]);

type Props = {
  params: Promise<{ tab: string }>;
};

export default async function BrandNYMagTabPage({ params }: Props) {
  const { tab } = await params;

  if (!VALID_TABS.has(tab)) {
    redirect("/admin/design-docs/brand-nymag/typography");
  }

  return <DesignDocsPageClient activeSection="brand-nymag" brandTab={tab} />;
}
