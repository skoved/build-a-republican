import { describe, expect, it } from "vitest";
import { MAX_NAME_LENGTH, sanitizeName } from "../lib/sanitizeName";

const cp = (n: number) => String.fromCodePoint(n);
const NUL = cp(0x00);
const BELL = cp(0x07);
const C1 = cp(0x85); // NEL, a C1 control
const ZWSP = cp(0x200b);
const RLO = cp(0x202e);
const LRO = cp(0x202d);
const PDI = cp(0x2069);
const LSEP = cp(0x2028);
const BOM = cp(0xfeff);
const ZWJ = cp(0x200d);

describe("sanitizeName", () => {
  it("leaves clean names untouched", () => {
    expect(sanitizeName("Ada")).toBe("Ada");
    expect(sanitizeName("Ada Lovelace")).toBe("Ada Lovelace");
    expect(sanitizeName("Jean-Luc Picard")).toBe("Jean-Luc Picard");
    expect(sanitizeName("O'Brien")).toBe("O'Brien");
  });

  it("trims and collapses internal whitespace", () => {
    expect(sanitizeName("  Ada  ")).toBe("Ada");
    expect(sanitizeName("Ada\t\t  Lovelace")).toBe("Ada Lovelace");
    expect(sanitizeName("Ada\nLovelace")).toBe("Ada Lovelace");
  });

  it("strips C0 and C1 control characters", () => {
    expect(sanitizeName(`A${NUL}B${BELL}C`)).toBe("ABC");
    expect(sanitizeName(`A${C1}B`)).toBe("AB");
  });

  it("strips zero-width, bidi-override, isolate and BOM characters", () => {
    expect(sanitizeName(`a${ZWSP}b`)).toBe("ab");
    expect(sanitizeName(`user${RLO}txt.exe`)).toBe("usertxt.exe");
    expect(sanitizeName(`${LRO}admin${PDI}`)).toBe("admin");
    expect(sanitizeName(`${BOM}Ada`)).toBe("Ada");
    expect(sanitizeName(`A${LSEP}B`)).toBe("AB"); // line separator is stripped outright
  });

  it("keeps ZWJ so emoji sequences survive", () => {
    const familyEmoji = `${cp(0x1f468)}${ZWJ}${cp(0x1f4bb)}`; // man + ZWJ + laptop
    expect(sanitizeName(familyEmoji)).toBe(familyEmoji);
  });

  it("NFC-normalizes", () => {
    // "e" + combining acute accent -> single precomposed "é"
    expect(sanitizeName(`Andr${"e" + cp(0x0301)}`)).toBe(sanitizeName("André"));
    expect(sanitizeName(`Andr${"e" + cp(0x0301)}`).length).toBe(5);
  });

  it("hard-caps the length at MAX_NAME_LENGTH", () => {
    const long = "x".repeat(200);
    expect(sanitizeName(long)).toHaveLength(MAX_NAME_LENGTH);
    expect(sanitizeName(`${"a".repeat(30)} ${"b".repeat(30)}`)).toHaveLength(MAX_NAME_LENGTH);
  });

  it("returns an empty string for input that is only stripped characters", () => {
    expect(sanitizeName(`${NUL}${ZWSP}${RLO}${BOM}`)).toBe("");
    expect(sanitizeName("   ")).toBe("");
  });

  it("does not turn markup into anything but a plain string", () => {
    // It is data, not HTML — sanitizeName only trims/caps it, it stays a string.
    expect(sanitizeName("<img src=x onerror=alert(1)>")).toBe(
      "<img src=x onerror=alert(1)>".slice(0, MAX_NAME_LENGTH),
    );
  });
});
