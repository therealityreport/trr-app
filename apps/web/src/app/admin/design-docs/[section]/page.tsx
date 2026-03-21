import { redirect } from "next/navigation";
import {
  isDesignDocSectionId,
  type DesignDocSectionId,
} from "@/lib/admin/design-docs-config";
import DesignDocsPageClient from "@/components/admin/design-docs/DesignDocsPageClient";

type Props = {
  params: Promise<{ section: string }>;
};

export default async function DesignDocsSectionPage({ params }: Props) {
  const { section } = await params;

  if (!isDesignDocSectionId(section)) {
    redirect("/admin/design-docs/overview");
  }

  return <DesignDocsPageClient activeSection={section as DesignDocSectionId} />;
}
