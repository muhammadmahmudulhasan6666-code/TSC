import { describe, expect, it } from "vitest";
import { formatConnects, formatTaka, isTscId } from "./format";
import { localeFromPath, localizePath, stripLocale } from "~/i18n";

describe("format", () => {
  it("uses Bangla numerals in bn", () => {
    expect(formatTaka(1200, "bn")).toBe("৳১,২০০");
    expect(formatTaka(1200, "en")).toBe("৳1,200");
    expect(formatConnects(15, "bn")).toBe("১৫ কানেক্ট");
    expect(formatConnects(1, "en")).toBe("1 Connect");
  });

  it("validates unpadded TSC IDs", () => {
    expect(isTscId("T1")).toBe(true);
    expect(isTscId("S165")).toBe(true);
    expect(isTscId("T000000001")).toBe(true); // legacy padded form still matches the shape
    expect(isTscId("X1")).toBe(false);
    expect(isTscId("T")).toBe(false);
  });
});

describe("locale routing", () => {
  it("maps /en paths to English and everything else to Bangla", () => {
    expect(localeFromPath("/")).toBe("bn");
    expect(localeFromPath("/teachers")).toBe("bn");
    expect(localeFromPath("/en")).toBe("en");
    expect(localeFromPath("/en/teachers")).toBe("en");
    expect(localeFromPath("/english-class")).toBe("bn");
  });

  it("round-trips paths", () => {
    expect(stripLocale("/en/teachers")).toBe("/teachers");
    expect(stripLocale("/en")).toBe("/");
    expect(localizePath("/", "en")).toBe("/en");
    expect(localizePath("/teachers", "en")).toBe("/en/teachers");
    expect(localizePath("/teachers", "bn")).toBe("/teachers");
  });
});
