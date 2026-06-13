import { describe, expect, it } from "vitest";
import { buildPortlessStatusSnapshot, parsePortlessList } from "@/lib/server/admin/portless-status";

describe("parsePortlessList", () => {
  it("parses managed and alias routes from portless list output", () => {
    const routes = parsePortlessList(`
Active routes:

  https://api.trr.localhost  ->  localhost:8000  (alias)
  https://trr.localhost  ->  localhost:4594
  https://wordle.trr.localhost  ->  localhost:5173  (alias)
`);

    expect(routes).toEqual([
      {
        url: "https://api.trr.localhost",
        name: "api.trr",
        target: "localhost:8000",
        kind: "alias",
      },
      {
        url: "https://trr.localhost",
        name: "trr",
        target: "localhost:4594",
        kind: "managed",
      },
      {
        url: "https://wordle.trr.localhost",
        name: "wordle.trr",
        target: "localhost:5173",
        kind: "alias",
      },
    ]);
  });

  it("treats admin.trr as wildcard when the managed trr route is present without a static admin alias", () => {
    const snapshot = buildPortlessStatusSnapshot({
      routes: parsePortlessList(`
Active routes:

  https://api.trr.localhost  ->  localhost:4302  (pid 94606)
  https://trr.localhost  ->  localhost:4192  (pid 94619)
`),
      exitCode: 0,
      checkedAt: "2026-06-10T16:54:00.000Z",
    });

    expect(snapshot.uses_static_aliases).toBe(false);
    expect(snapshot.static_alias_count).toBe(0);
    expect(snapshot.routes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "admin.trr",
          target: "localhost:4192",
          kind: "wildcard",
          present: true,
          staticAlias: false,
        }),
      ]),
    );
  });
});
