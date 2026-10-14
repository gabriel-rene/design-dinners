import { describe, expect, it } from "vitest";

import { checkImageFile, isImageDimension, isPendingPath, mimeForPath } from "./image-rules";

describe("image rules", () => {
  it("accepts jpg/png/webp up to 4.5 MB", () => {
    expect(checkImageFile({ type: "image/png", size: 4_718_592 })).toBeNull();
    expect(checkImageFile({ type: "image/png", size: 4_718_593 })).toMatch(/4\.5 MB/);
    expect(checkImageFile({ type: "image/svg+xml", size: 10 })).toMatch(/JPG, PNG o WebP/);
  });
  it("maps extensions back to mime types", () => {
    expect(mimeForPath("a.jpg")).toBe("image/jpeg");
    expect(mimeForPath("a.gif")).toBeNull();
  });
  it("only accepts {uuid}.{ext} pending paths", () => {
    expect(isPendingPath("0f8fad5b-d9cb-469f-a165-70867728950e.webp")).toBe(true);
    expect(isPendingPath("../0f8fad5b-d9cb-469f-a165-70867728950e.webp")).toBe(false);
  });
  it("checks image dimensions", () => {
    expect(isImageDimension(1080)).toBe(true);
    expect(isImageDimension(0)).toBe(false);
    expect(isImageDimension(20_001)).toBe(false);
  });
});
