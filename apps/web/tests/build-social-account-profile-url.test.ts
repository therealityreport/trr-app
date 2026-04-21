import { describe, expect, it } from "vitest";
import { buildSocialAccountProfileUrl } from "@/lib/admin/show-admin-routes";

describe("buildSocialAccountProfileUrl", () => {
  it.each([
    ["stats", "/social/instagram/bravotv"],
    ["socialblade", "/social/instagram/bravotv/socialblade"],
    ["catalog", "/social/instagram/bravotv/catalog"],
    ["comments", "/social/instagram/bravotv/comments"],
    ["posts", "/social/instagram/bravotv/posts"],
    ["hashtags", "/social/instagram/bravotv/hashtags"],
    ["collaborators-tags", "/social/instagram/bravotv/collaborators-tags"],
  ] as const)("builds canonical /social path for %s tab", (tab, expected) => {
    expect(buildSocialAccountProfileUrl({ platform: "instagram", handle: "bravotv", tab })).toBe(expected);
  });
});
