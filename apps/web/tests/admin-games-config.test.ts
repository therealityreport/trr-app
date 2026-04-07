import { describe, expect, it } from "vitest";
import { ADMIN_GAME_MAP } from "@/lib/admin/games";

describe("admin games config", () => {
  it("marks flashback live gameplay as disabled", () => {
    expect(ADMIN_GAME_MAP.flashback.isLiveEnabled).toBe(false);
    expect(ADMIN_GAME_MAP.flashback.playHref).toBe("/hub");
    expect(ADMIN_GAME_MAP.flashback.liveStatusLabel).toBe("Gameplay disabled");
  });
});
