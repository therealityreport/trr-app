// Minimal test stubs. Configure your runner (e.g., Vitest/Jest) to execute.
// @ts-nocheck
import { describe, it, expect } from "vitest";
import { validateUsername, parseShows, validateBirthday } from "@/lib/validation/user";

describe("validateUsername", () => {
  it("accepts valid usernames", () => {
    expect(validateUsername("abc")).toBeNull();
    expect(validateUsername("abc_123")).toBeNull();
    expect(validateUsername("a1b2c3")).toBeNull();
  });
  it("rejects invalid usernames", () => {
    expect(validateUsername("")).toBeTruthy();
    expect(validateUsername("ABCD")).toBeTruthy();
    expect(validateUsername("a")).toBeTruthy();
    expect(validateUsername("too_long_username_over_20_chars")).toBeTruthy();
    expect(validateUsername("has-dash")).toBeTruthy();
  });
});

describe("parseShows", () => {
  it("parses and dedupes comma-separated shows", () => {
    expect(parseShows("A, B, A, C")).toEqual(["A", "B", "C"]);
    expect(parseShows(["A", "B", "A"]).join(",")).toBe("A,B");
  });
});

describe("validateBirthday", () => {
  it("accepts valid ISO dates", () => {
    expect(validateBirthday("1990-12-31")).toBeNull();
  });
  it("rejects future or malformed dates", () => {
    expect(validateBirthday("1990/12/31")).toBeTruthy();
    expect(validateBirthday("abcd-ef-gh")).toBeTruthy();
  });
});

