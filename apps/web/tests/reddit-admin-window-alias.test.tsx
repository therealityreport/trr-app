import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw new Error(`REDIRECT:${url}`); } }));
vi.mock("@/app/admin/reddit-window-posts/page", () => ({ default: () => "admin-window" }));
vi.mock("@/app/admin/reddit-post-details/page", () => ({ default: () => "admin-post" }));

import WindowPage from "@/app/admin/social/reddit/[communitySlug]/[showSlug]/s[seasonNumber]/[windowKey]/page";
import PostPage from "@/app/admin/social/reddit/[communitySlug]/[showSlug]/s[seasonNumber]/[windowKey]/post/[postId]/page";
import DetailPage from "@/app/admin/social/reddit/[communitySlug]/[showSlug]/s[seasonNumber]/[windowKey]/[detailSlug]/page";

describe("admin Reddit season window routes", () => {
  it.each([[WindowPage, "admin-window"], [PostPage, "admin-post"], [DetailPage, "admin-post"]])(
    "keeps Episode 6 and its posts on the authenticated admin surface",
    async (Page, expected) => {
      const props = { params: Promise.resolve({ communitySlug: "rhoslc", showSlug: "rhoslc", seasonNumber: "7", windowKey: "e6", postId: "1xc1j7n", detailSlug: "sample-post" }) };
      expect(await (Page as (props: unknown) => unknown)(props)).toBe(expected);
    },
  );
});
