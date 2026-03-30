import { redirect } from "next/navigation";
import { ARTICLES } from "@/lib/admin/design-docs-config";
import DesignDocsPageClient from "@/components/admin/design-docs/DesignDocsPageClient";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function AthleticArticleDetailPage({ params }: Props) {
  const { slug } = await params;

  const article = ARTICLES.find((a) => a.id === slug);
  if (!article) {
    redirect("/design-docs/athletic-articles");
  }

  return <DesignDocsPageClient activeSection="athletic-articles" articleSlug={article.id} />;
}
