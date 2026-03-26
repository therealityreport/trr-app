import { redirect } from "next/navigation";
import { GAME_ARTICLES } from "@/lib/admin/design-docs-config";
import DesignDocsPageClient from "@/components/admin/design-docs/DesignDocsPageClient";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function NYTGameArticleDetailPage({ params }: Props) {
  const { slug } = await params;

  const game = GAME_ARTICLES.find((g) => g.id === slug);
  if (!game) {
    redirect("/admin/design-docs/nyt-games-articles");
  }

  return <DesignDocsPageClient activeSection="nyt-games-articles" articleSlug={game.id} />;
}
