import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import {
  ShowCreditsCastMembers,
  ShowCreditsCastViewControls,
  ShowCreditsCrewSections,
  resolveShowCreditsGalleryGridClass,
} from "@/components/admin/show-tabs/ShowCreditsViews";

describe("show credits views", () => {
  it("renders cast view controls and exposes gallery column controls only in gallery mode", () => {
    const onViewModeChange = vi.fn();
    const onGalleryColumnsChange = vi.fn();

    const { rerender } = render(
      <ShowCreditsCastViewControls
        viewMode="gallery"
        galleryColumns={5}
        onViewModeChange={onViewModeChange}
        onGalleryColumnsChange={onGalleryColumnsChange}
      />,
    );

    expect(screen.getByRole("button", { name: "Gallery View" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "List View" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "5 per row" })).toHaveAttribute("aria-pressed", "true");

    rerender(
      <ShowCreditsCastViewControls
        viewMode="list"
        galleryColumns={5}
        onViewModeChange={onViewModeChange}
        onGalleryColumnsChange={onGalleryColumnsChange}
      />,
    );

    expect(screen.getByRole("button", { name: "List View" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByRole("button", { name: "5 per row" })).not.toBeInTheDocument();
  });

  it("renders the same members in gallery and list layouts", () => {
    const members = [
      { id: "heather", name: "Heather Gay" },
      { id: "meredith", name: "Meredith Marks" },
    ];

    const { rerender } = render(
      <ShowCreditsCastMembers
        members={members}
        viewMode="gallery"
        galleryColumns={4}
        renderMember={(member) => <div>{member.name}</div>}
      />,
    );

    expect(screen.getByText("Heather Gay")).toBeInTheDocument();
    expect(screen.getByText("Meredith Marks")).toBeInTheDocument();
    expect(resolveShowCreditsGalleryGridClass(4)).toContain("xl:grid-cols-4");
    expect(resolveShowCreditsGalleryGridClass(6)).toContain("xl:grid-cols-6");

    rerender(
      <ShowCreditsCastMembers
        members={members}
        viewMode="list"
        galleryColumns={4}
        renderMember={(member) => <div>{member.name}</div>}
      />,
    );

    expect(screen.getByText("Heather Gay")).toBeInTheDocument();
    expect(screen.getByText("Meredith Marks")).toBeInTheDocument();
  });

  it("renders grouped crew rows with stacked role and episode lines", () => {
    render(
      <ShowCreditsCrewSections
        sections={[
          {
            title: "Producers",
            groupedRows: [
              {
                personId: "casey",
                personName: "Casey Allan",
                roleLines: [
                  { creditId: "1", role: "supervising producer", episodesLabel: "12 episodes", yearsLabel: "2020-2021" },
                  { creditId: "2", role: "associate producer", episodesLabel: "23 episodes", yearsLabel: "2021-2024" },
                  { creditId: "3", role: "field producer", episodesLabel: "18 episodes", yearsLabel: "2024-2026" },
                ],
              },
            ],
          },
        ]}
      />,
    );

    expect(screen.getByRole("columnheader", { name: "Name" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Role" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Episodes" })).toBeInTheDocument();

    const row = screen.getByRole("row", { name: /Casey Allan/i });
    const scoped = within(row);
    expect(scoped.getByText("Casey Allan")).toBeInTheDocument();
    expect(scoped.getByText("supervising producer")).toBeInTheDocument();
    expect(scoped.getByText("associate producer")).toBeInTheDocument();
    expect(scoped.getByText("field producer")).toBeInTheDocument();
    expect(scoped.getByText("12 episodes • 2020-2021")).toBeInTheDocument();
    expect(scoped.getByText("23 episodes • 2021-2024")).toBeInTheDocument();
    expect(scoped.getByText("18 episodes • 2024-2026")).toBeInTheDocument();
  });
});
