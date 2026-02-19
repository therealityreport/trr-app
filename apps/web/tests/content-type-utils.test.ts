import { describe, expect, it } from "vitest";
import {
  contentTypeToAssetKind,
  contentTypeToContextType,
  normalizeContentTypeToken,
  resolveCanonicalContentType,
} from "@/lib/media/content-type";

describe("content-type utilities", () => {
  it("normalizes profile aliases to PROFILE PICTURE", () => {
    expect(normalizeContentTypeToken("profile_picture")).toBe("PROFILE PICTURE");
    expect(normalizeContentTypeToken("profile-photo")).toBe("PROFILE PICTURE");
    expect(normalizeContentTypeToken("headshot")).toBe("PROFILE PICTURE");
  });

  it("maps PROFILE PICTURE to expected kind and context", () => {
    expect(contentTypeToAssetKind("PROFILE PICTURE")).toBe("profile_picture");
    expect(contentTypeToContextType("PROFILE PICTURE")).toBe("profile_picture");
  });

  it("resolves canonical content type precedence: explicit > section tag > heuristics", () => {
    expect(
      resolveCanonicalContentType({
        explicitContentType: "profile_picture",
        fandomSectionTag: "PROMO",
        contextType: "confessional",
      })
    ).toBe("PROFILE PICTURE");

    expect(
      resolveCanonicalContentType({
        explicitContentType: null,
        fandomSectionTag: "REUNION",
        contextType: "confessional",
      })
    ).toBe("REUNION");
  });
});
