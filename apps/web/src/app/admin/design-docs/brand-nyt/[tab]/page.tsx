import { redirect } from "next/navigation";
import DesignDocsPageClient from "@/components/admin/design-docs/DesignDocsPageClient";

const VALID_TABS = new Set([
  "typography",
  "colors",
  "layout",
  "architecture",
  "charts",
  "components",
  "resources",
]);

type Props = {
  params: Promise<{ tab: string }>;
};

export default async function BrandNYTTabPage({ params }: Props) {
  const { tab } = await params;

  if (!VALID_TABS.has(tab)) {
    redirect("/design-docs/brand-nyt/typography");
  }

  return <DesignDocsPageClient activeSection="brand-nyt" brandTab={tab} />;
}
