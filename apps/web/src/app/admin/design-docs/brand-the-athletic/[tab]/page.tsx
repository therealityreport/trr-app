import { redirect } from "next/navigation";
import DesignDocsPageClient from "@/components/admin/design-docs/DesignDocsPageClient";

const VALID_TABS = new Set([
  "typography",
  "colors",
  "components",
  "icons",
  "layouts",
  "layout",
  "shapes",
  "resources",
]);

type Props = {
  params: Promise<{ tab: string }>;
};

export default async function BrandAthleticTabPage({ params }: Props) {
  const { tab } = await params;

  if (!VALID_TABS.has(tab)) {
    redirect("/design-docs/brand-the-athletic/typography");
  }

  return <DesignDocsPageClient activeSection="brand-the-athletic" brandTab={tab} />;
}
