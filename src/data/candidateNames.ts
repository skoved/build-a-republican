import { z } from "zod";
import rawNames from "../../candidate-names.yaml";
import { MAX_PLAYERS } from "./scandals";

/**
 * Name slots each game reserves in `candidate-names.yaml` — one per possible
 * seat. A 3-player game uses 3 of its 4 slots and skips the last, so the Nth
 * game (0-based) of a session reads names starting at `N * NAME_SLOTS_PER_GAME`.
 */
export const NAME_SLOTS_PER_GAME = MAX_PLAYERS;

const fileSchema = z.object({
  names: z
    .array(z.string({ required_error: "each name must be a string" }).trim().min(1, "names must not be empty"))
    .min(1, "candidate-names.yaml needs at least one name"),
});

function parseNames(raw: unknown): string[] {
  const result = fileSchema.safeParse(raw);
  if (!result.success) {
    const lines = result.error.issues.map(
      (i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`,
    );
    throw new Error(`candidate-names.yaml is invalid:\n${lines.join("\n")}`);
  }
  return result.data.names.map((n) => n.trim());
}

/** The candidate-name pool, validated. Throws on a malformed file. */
export const candidateNames: string[] = parseNames(rawNames);

/**
 * The Republican-candidate name for `seatIndex` (0-based) of the `gameIndex`-th
 * game (0-based) this session. Falls back to a generated name if the pool is
 * exhausted so a game can always start.
 */
export function candidateNameFor(gameIndex: number, seatIndex: number): string {
  const i = gameIndex * NAME_SLOTS_PER_GAME + seatIndex;
  return candidateNames[i] ?? `Republican #${i + 1}`;
}
