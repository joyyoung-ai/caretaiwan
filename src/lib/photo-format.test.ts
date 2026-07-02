import { describe, expect, it } from "vitest";
import { detectImageType, IMAGE_FORMAT_META } from "./photo-format";

describe("detectImageType", () => {
  it("detects supported image formats from magic bytes", () => {
    expect(detectImageType(new Uint8Array([0xff, 0xd8, 0xff, 0, 0, 0, 0, 0, 0, 0, 0, 0]))).toBe("jpeg");
    expect(
      detectImageType(
        new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0])
      )
    ).toBe("png");
    expect(
      detectImageType(
        new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50])
      )
    ).toBe("webp");
    expect(
      detectImageType(
        new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0, 0, 0, 0, 0, 0])
      )
    ).toBe("gif");
  });

  it("rejects invalid or unsupported image bytes", () => {
    const svg = new TextEncoder().encode("<svg><script>alert(1)</script></svg>");

    expect(detectImageType(svg)).toBeNull();
    expect(detectImageType(new Uint8Array([0xff, 0xd8, 0xff]))).toBeNull();
    expect(detectImageType(new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x38, 0x61, 0, 0, 0, 0, 0, 0]))).toBeNull();
  });

  it("maps detected formats to safe storage metadata", () => {
    expect(IMAGE_FORMAT_META.jpeg).toEqual({ ext: "jpg", contentType: "image/jpeg" });
    expect(IMAGE_FORMAT_META.png).toEqual({ ext: "png", contentType: "image/png" });
    expect(IMAGE_FORMAT_META.webp).toEqual({ ext: "webp", contentType: "image/webp" });
    expect(IMAGE_FORMAT_META.gif).toEqual({ ext: "gif", contentType: "image/gif" });
  });
});
