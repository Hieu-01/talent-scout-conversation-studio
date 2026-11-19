import { describe, expect, it } from "vitest";
import { normalizeDisplayName } from "@/lib/display-name";

describe("normalizeDisplayName", () => {
  it("trims and collapses spaces", () => {
    expect(normalizeDisplayName("  Trung   Hiếu ")).toBe("Trung Hiếu");
  });
  it("rejects an empty name", () => {
    expect(normalizeDisplayName("   ")).toBeNull();
  });
  it("rejects names longer than 40 characters", () => {
    expect(normalizeDisplayName("a".repeat(41))).toBeNull();
    expect(normalizeDisplayName("a".repeat(40))).toBe("a".repeat(40));
  });
});
