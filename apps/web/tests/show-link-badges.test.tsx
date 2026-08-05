import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  PersonSourceLogo,
  SocialHandlePill,
  SourceBadge,
} from "@/components/admin/ShowLinkBadges";
import type { EntityLink, ShowSocialLinkPill } from "@/lib/admin/show-page/workspace-model";

const socialLink: EntityLink = {
  id: "social-1",
  show_id: "show-1",
  entity_type: "show",
  entity_id: "show-1",
  season_number: 0,
  link_group: "social",
  link_kind: "instagram",
  label: "@rhoslc",
  url: "https://instagram.com/rhoslc",
  status: "approved",
  confidence: null,
  source: null,
  metadata: null,
  created_at: null,
  updated_at: null,
};

describe("show link badges", () => {
  it("keeps a text alternative alongside a decorative social icon", () => {
    render(<SourceBadge kind="instagram" label="Instagram" />);

    expect(screen.getByText("Instagram")).toHaveClass("sr-only");
  });

  it("renders branded source tokens without changing their visible labels", () => {
    const { rerender } = render(<PersonSourceLogo sourceKey="imdb" />);
    expect(screen.getByText("IMDb")).toBeInTheDocument();

    rerender(<SourceBadge kind="google_news" label="Google News" />);
    expect(screen.getByText("News")).toBeInTheDocument();
  });

  it("preserves the external-link and accessible-name contract for social pills", () => {
    const pill: ShowSocialLinkPill = {
      id: socialLink.id,
      sourceKind: "instagram",
      sourceLabel: "Instagram",
      text: "@rhoslc",
      url: socialLink.url,
      link: socialLink,
    };

    render(<SocialHandlePill pill={pill} />);

    const anchor = screen.getByRole("link", { name: "@rhoslc" });
    expect(anchor).toHaveAttribute("href", "https://instagram.com/rhoslc");
    expect(anchor).toHaveAttribute("target", "_blank");
    expect(anchor).toHaveAttribute("rel", "noopener noreferrer");
    expect(anchor).toHaveAttribute("title", "https://instagram.com/rhoslc");
  });
});
