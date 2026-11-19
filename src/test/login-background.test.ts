import { describe, expect, it } from "vitest";
import { validateBackgroundFile, validateVideoDuration } from "@/lib/login-background";

const MB = 1024 * 1024;

describe("login background rules", () => {
  it("accepts GIFs as pictures", () => {
    expect(validateBackgroundFile({ type: "image/gif", size: 3 * MB })).toEqual({ ok: true, kind: "image" });
  });
  it("accepts MP4 as a video", () => {
    expect(validateBackgroundFile({ type: "video/mp4", size: 20 * MB })).toEqual({ ok: true, kind: "video" });
  });
  it("rejects pictures over 15 MB", () => {
    expect(validateBackgroundFile({ type: "image/png", size: 16 * MB }).ok).toBe(false);
    expect(validateBackgroundFile({ type: "image/png", size: 15 * MB }).ok).toBe(true);
  });
  it("rejects videos over 50 MB", () => {
    expect(validateBackgroundFile({ type: "video/webm", size: 51 * MB }).ok).toBe(false);
  });
  it("rejects other file types", () => {
    expect(validateBackgroundFile({ type: "application/pdf", size: MB }).ok).toBe(false);
  });
  it("allows videos up to 30 seconds", () => {
    expect(validateVideoDuration(30)).toBeNull();
    expect(validateVideoDuration(31)).not.toBeNull();
  });
});
