import { describe, expect, it } from "vitest";

import {
  ARTICLES,
  type ContentBlock,
} from "@/lib/admin/design-docs-config";
import {
  getReusableUiPrimitive,
  matchReusableUiPrimitive,
  resolveSiteHeaderShellBlock,
  resolveStorylineBlock,
} from "@/lib/admin/design-docs-ui-primitives";

function getBlock<TType extends ContentBlock["type"]>(
  articleId: string,
  type: TType,
): Extract<ContentBlock, { type: TType }> {
  const article = ARTICLES.find((entry) => entry.id === articleId);
  if (!article) {
    throw new Error(`Missing article ${articleId}`);
  }

  const block = article.contentBlocks.find(
    (entry): entry is Extract<ContentBlock, { type: TType }> => entry.type === type,
  );
  if (!block) {
    throw new Error(`Missing ${type} block for ${articleId}`);
  }

  return block;
}

describe("design docs reusable UI primitives", () => {
  it("resolves the NYT standard header shell through a primitive id", () => {
    const shellBlock = getBlock("trump-tariffs-reaction", "site-header-shell");
    const primitive = getReusableUiPrimitive(shellBlock.primitiveId ?? "");

    expect(shellBlock.primitiveId).toBe("nyt.interactive.header-shell.standard");
    expect(primitive).toMatchObject({
      id: "nyt.interactive.header-shell.standard",
      kind: "site-header-shell",
      publisher: "nyt",
      layoutFamily: "nyt-interactive",
    });

    const resolved = resolveSiteHeaderShellBlock(shellBlock);
    expect(resolved.menuSections[0]?.label).toBe("U.S.");
    expect(resolved.accountPanel.email).toBe("admin@thereality.report");
  });

  it("reuses the same Tariffs and Trade storyline primitive across multiple NYT articles", () => {
    const reactionStoryline = getBlock("trump-tariffs-reaction", "storyline");
    const importsStoryline = getBlock("trump-tariffs-us-imports", "storyline");

    expect(reactionStoryline.primitiveId).toBe("nyt.storyline.tariffs-and-trade.standard");
    expect(importsStoryline.primitiveId).toBe("nyt.storyline.tariffs-and-trade.standard");

    const resolvedReaction = resolveStorylineBlock(reactionStoryline);
    const resolvedImports = resolveStorylineBlock(importsStoryline);

    expect(resolvedReaction.title).toBe("Tariffs and Trade");
    expect(resolvedReaction.links).toEqual(resolvedImports.links);
  });

  it("matches extracted NYT chrome against the reusable primitive registry", () => {
    const match = matchReusableUiPrimitive({
      publisher: "nyt",
      layoutFamily: "nyt-interactive",
      kind: "storyline",
      title: "Tariffs and Trade",
      linkLabels: [
        "Metals and Pharmaceuticals",
        "U.S.-E.U. Trade Deal",
        "Tariff Refunds",
        "U.S. Trade Deficit",
        "Trade Investigation",
        "Tariff Tracker",
      ],
    });

    expect(match?.id).toBe("nyt.storyline.tariffs-and-trade.standard");
  });
});
