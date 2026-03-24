import { redirect } from "next/navigation";
import { ARTICLES } from "@/lib/admin/design-docs-config";
import ArticleDetailPage from "@/components/admin/design-docs/ArticleDetailPage";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function NYTArticleDetailPage({ params }: Props) {
  const { slug } = await params;

  const article = ARTICLES.find((a) => a.id === slug);
  if (!article) {
    redirect("/admin/design-docs/nyt-articles");
  }

  return <ArticleDetailPage articleId={article.id} />;
}
