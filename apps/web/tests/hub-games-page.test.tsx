/* eslint-disable @next/next/no-img-element */
import type { ImgHTMLAttributes, ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/image", () => ({
  default: (props: ImgHTMLAttributes<HTMLImageElement>) => <img {...props} alt={props.alt ?? ""} />,
}));

vi.mock("@/components/ClientAuthGuard", () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("@/lib/typography/runtime", () => ({
  buildTypographyDataAttributes: () => ({}),
}));

import HubPage from "@/app/hub/page";

describe("hub games page", () => {
  it("omits flashback from the playable game cards", async () => {
    const ui = await HubPage();
    const { container } = render(ui);

    expect(screen.getByText("Realitease")).toBeInTheDocument();
    expect(screen.getByText("Bravodle")).toBeInTheDocument();
    expect(screen.queryByText("Flashback")).not.toBeInTheDocument();
    expect(container.querySelector('a[href="/flashback/cover"]')).toBeNull();
  });
});
