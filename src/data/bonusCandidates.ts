import { z } from "zod";
import rawBonusData from "../../bonus-candidates.yaml";
import type { Scandal } from "./scandals";

/** The "built by" name shown on every bonus candidate's end-screen card. */
export const BONUS_BUILT_BY = "Digital Ground Game";

/** Most bonus candidates a session can show — one per game, then they run out. */
export const MAX_BONUS_CANDIDATES = 3;

const nonEmpty = (label: string) =>
  z.string({ required_error: `${label} is required` }).trim().min(1, `${label} must not be empty`);

/** Same fields as a scandals.yaml entry, minus the `id` (synthesized below). */
const bonusScandalSchema = z.object({
  headline: nonEmpty("headline"),
  text: nonEmpty("text"),
  politician: nonEmpty("politician"),
  position: nonEmpty("position"),
  articleUrl: nonEmpty("articleUrl")
    .url("articleUrl must be a valid URL")
    .refine((u) => /^https?:\/\//i.test(u), "articleUrl must be http(s)"),
  articleSource: z.string().trim().min(1).optional(),
});

const bonusCandidateSchema = z.object({
  name: nonEmpty("candidate name"),
  scandals: z
    .array(bonusScandalSchema)
    .length(4, "each bonus candidate needs exactly 4 scandals (one per category, in order)"),
});

const fileSchema = z.object({
  candidates: z
    .array(bonusCandidateSchema)
    .max(MAX_BONUS_CANDIDATES, `at most ${MAX_BONUS_CANDIDATES} bonus candidates`),
});

export interface BonusCandidate {
  name: string;
  /** Exactly 4, indexed by category (0 = Personal Conduct … 3 = October Surprise). */
  scandals: Scandal[];
}

function parseBonusData(raw: unknown): BonusCandidate[] {
  const result = fileSchema.safeParse(raw);
  if (!result.success) {
    const lines = result.error.issues.map(
      (i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`,
    );
    throw new Error(`bonus-candidates.yaml is invalid:\n${lines.join("\n")}`);
  }

  // Synthesize an id per scandal so each entry is a real `Scandal` and renders
  // through the unchanged `ScandalCard`. These ids are never registered in
  // scandals.ts's lookup, so they can't collide with deck scandals.
  return result.data.candidates.map((candidate, ci) => ({
    name: candidate.name,
    scandals: candidate.scandals.map((s, si) => ({ ...s, id: `bonus-${ci}-${si}` })),
  }));
}

/** The bonus candidates, validated. Throws on a malformed file. */
export const bonusCandidates: BonusCandidate[] = parseBonusData(rawBonusData);

/**
 * The bonus candidate for the Nth standard-deck game of the session (0-based:
 * 0 = first game, 1 = first replay, …). `null` once they run out.
 */
export function bonusCandidateForGame(index: number): BonusCandidate | null {
  return index >= 0 && index < bonusCandidates.length ? bonusCandidates[index] : null;
}
