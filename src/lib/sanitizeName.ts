/** Longest player-entered name kept in game state. */
export const MAX_NAME_LENGTH = 24;

/**
 * Code points a player name must not contain — they either render as nothing
 * or enable bidi / display spoofing:
 *
 *   U+0000..U+001F   C0 control characters (except U+0009..U+000D, the ASCII
 *                    whitespace controls, left for the collapse step below)
 *   U+007F..U+009F   DEL + C1 control characters
 *   U+200B           zero-width space
 *   U+200E, U+200F   LTR / RTL marks
 *   U+202A..U+202E   bidi embeddings + overrides (LRE/RLE/PDF/LRO/RLO)
 *   U+2066..U+2069   bidi isolates (LRI/RLI/FSI/PDI)
 *   U+2028, U+2029   line / paragraph separators
 *   U+FEFF           BOM / zero-width no-break space
 *
 * U+200C (ZWNJ) and U+200D (ZWJ) are intentionally allowed so legitimate
 * scripts and emoji ZWJ sequences survive.
 */
function isDisallowedCodePoint(cp: number): boolean {
  return (
    // C0 controls, but keep the ASCII whitespace ones (0x09..0x0d: tab, LF,
    // VT, FF, CR) — the whitespace-collapse step folds those into a space.
    (cp <= 0x1f && !(cp >= 0x09 && cp <= 0x0d)) ||
    (cp >= 0x7f && cp <= 0x9f) ||
    cp === 0x200b ||
    cp === 0x200e ||
    cp === 0x200f ||
    (cp >= 0x202a && cp <= 0x202e) ||
    (cp >= 0x2066 && cp <= 0x2069) ||
    cp === 0x2028 ||
    cp === 0x2029 ||
    cp === 0xfeff
  );
}

/**
 * Normalize a player-entered name for storage: NFC-normalize, drop the code
 * points above, collapse internal whitespace, trim, and hard-cap the length.
 *
 * This is NOT a security boundary on its own — React already escapes the value
 * wherever it renders. It just keeps stored names to plain, bounded,
 * single-line text so no console-dispatched action can wedge oversized or
 * invisible junk into the UI.
 */
export function sanitizeName(raw: string): string {
  const filtered = Array.from(raw.normalize("NFC"))
    .filter((ch) => !isDisallowedCodePoint(ch.codePointAt(0) ?? 0))
    .join("");
  return filtered.replace(/\s+/g, " ").trim().slice(0, MAX_NAME_LENGTH).trim();
}
