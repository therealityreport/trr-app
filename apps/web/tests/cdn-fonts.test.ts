import { describe, expect, it } from "vitest";
import { resolveCloudfrontCdnFont } from "@/lib/fonts/cdn-fonts";

describe("cdn font resolver", () => {
  it("resolves canonical design system names", () => {
    expect(resolveCloudfrontCdnFont("Sofia Pro")?.name).toBe("Sofia Pro");
    expect(resolveCloudfrontCdnFont("\"Plymouth Serial\", sans-serif")?.name).toBe("Plymouth Serial");
  });

  it("resolves filename-style tokens to canonical families", () => {
    expect(resolveCloudfrontCdnFont("SofiaProBold-930940338.otf")?.name).toBe("Sofia Pro");
    expect(resolveCloudfrontCdnFont("RudeSlabCondensedCondensedBold-930861866.otf")?.name).toBe("Rude Slab Condensed");
    expect(resolveCloudfrontCdnFont("GeoSlab703_Md_BT")?.name).toBe("Geometric Slabserif 703");
    expect(resolveCloudfrontCdnFont("StaffordSerialExtraBoldItalic-930108999.otf")?.name).toBe("Stafford Serial");
  });

  it("resolves figma-exported font tokens to canonical families", () => {
    expect(resolveCloudfrontCdnFont("Gloucester_MT_Std:Bold")?.name).toBe("Gloucester");
    expect(resolveCloudfrontCdnFont("GloucesterOldStyle-5735713.ttf")?.name).toBe("Gloucester");
    expect(resolveCloudfrontCdnFont("Rude_Slab:Cond_XBd")?.name).toBe("Rude Slab Condensed");
    expect(resolveCloudfrontCdnFont("Plymouth_Serial:Medium")?.name).toBe("Plymouth Serial");
  });
});
