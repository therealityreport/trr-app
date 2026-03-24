import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { proxy } from "@/proxy";

describe("proxy person canonicalization", () => {
  it("preserves showId context when redirecting admin people routes to canonical people routes", () => {
    const request = new NextRequest(
      "http://admin.localhost:3000/admin/trr-shows/people/meredith-marks--7f528757?showId=the-traitors-us&tab=gallery",
    );

    const response = proxy(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://admin.localhost:3000/people/meredith-marks--7f528757?showId=the-traitors-us",
    );
  });
});
