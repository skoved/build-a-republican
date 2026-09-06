import { z } from "zod";
import rawScandalData from "../../scandals.yaml";
import rawTrumpData from "../../trump.yaml";
import { shuffle } from "../lib/shuffle";

/** Briefcases dealt per player, per round. 3 players -> 6, 4 players -> 8. */
export const BRIEFCASES_PER_PLAYER = 2;

/** Fewest / most players a game supports. */
export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 4;

/**
 * The largest round a game can deal (a full 4-player table). Also the minimum
 * number of scandals a category must contain, so any table size can be filled.
 */
export const MAX_BRIEFCASES_PER_ROUND = MAX_PLAYERS * BRIEFCASES_PER_PLAYER;

/** How many briefcases a round deals for a table of `playerCount` players. */
export function briefcasesForPlayers(playerCount: number): number {
  return playerCount * BRIEFCASES_PER_PLAYER;
}

/** The 4 categories, in the order the game plays them as rounds 1-4. */
export const EXPECTED_CATEGORIES = [
  { id: "personal-conduct", name: "Personal Conduct" },
  { id: "finance-and-fraud", name: "Finance and Fraud" },
  { id: "conflict-of-interest", name: "Conflict of Interest" },
  { id: "october-surprise", name: "October Surprise" },
] as const;

const nonEmpty = (label: string) =>
  z.string({ required_error: `${label} is required` }).trim().min(1, `${label} must not be empty`);

const scandalSchema = z.object({
  id: nonEmpty("id").regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "id must be kebab-case"),
  headline: nonEmpty("headline"),
  text: nonEmpty("text"),
  politician: nonEmpty("politician"),
  position: nonEmpty("position"),
  articleUrl: nonEmpty("articleUrl")
    .url("articleUrl must be a valid URL")
    .refine((u) => /^https?:\/\//i.test(u), "articleUrl must be http(s)"),
  articleSource: z.string().trim().min(1).optional(),
});

const categorySchema = z.object({
  id: nonEmpty("category id"),
  name: nonEmpty("category name"),
  scandals: z
    .array(scandalSchema)
    .min(
      MAX_BRIEFCASES_PER_ROUND,
      `each category needs at least ${MAX_BRIEFCASES_PER_ROUND} scandals`,
    ),
});

const fileSchema = z.object({
  categories: z.array(categorySchema).length(4, "there must be exactly 4 categories"),
});

export type Scandal = z.infer<typeof scandalSchema>;
export type Category = z.infer<typeof categorySchema>;

/** Which scandal pool a game is drawing from. */
export type DeckId = "standard" | "trump";

/** Parse + validate one scandal file into its category list. Throws on a bad file. */
function buildDeck(raw: unknown, fileLabel: string): Category[] {
  const result = fileSchema.safeParse(raw);
  if (!result.success) {
    const lines = result.error.issues.map(
      (i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`,
    );
    throw new Error(`${fileLabel} is invalid:\n${lines.join("\n")}`);
  }

  const { categories } = result.data;

  EXPECTED_CATEGORIES.forEach((expected, index) => {
    const actual = categories[index];
    if (actual.id !== expected.id || actual.name !== expected.name) {
      throw new Error(
        `${fileLabel}: category #${index + 1} must be "${expected.name}" (${expected.id}), ` +
          `got "${actual.name}" (${actual.id})`,
      );
    }
  });

  const seen = new Set<string>();
  for (const category of categories) {
    for (const scandal of category.scandals) {
      if (seen.has(scandal.id)) {
        throw new Error(`${fileLabel}: duplicate scandal id "${scandal.id}"`);
      }
      seen.add(scandal.id);
    }
  }

  return categories;
}

const STANDARD_DECK: Category[] = buildDeck(rawScandalData, "scandals.yaml");
const TRUMP_DECK: Category[] = buildDeck(rawTrumpData, "trump.yaml");

if (TRUMP_DECK.length !== STANDARD_DECK.length) {
  throw new Error("trump.yaml must have the same number of categories as scandals.yaml");
}

const DECKS: Record<DeckId, Category[]> = { standard: STANDARD_DECK, trump: TRUMP_DECK };

/** The category list for a deck. */
export function deckCategories(deckId: DeckId): Category[] {
  return DECKS[deckId];
}

/**
 * The standard deck's categories. Both decks are locked to the same 4 category
 * ids/names by {@link EXPECTED_CATEGORIES}, so this is the canonical list for
 * display (round names, "Round N of 4").
 */
export const categories: Category[] = STANDARD_DECK;

/** Number of rounds in a game (one per category). Same for every deck. */
export const ROUND_COUNT = STANDARD_DECK.length;

const scandalsById: Map<string, Scandal> = new Map();
for (const [deckId, deck] of Object.entries(DECKS) as [DeckId, Category[]][]) {
  for (const category of deck) {
    for (const scandal of category.scandals) {
      if (scandalsById.has(scandal.id)) {
        throw new Error(
          `Scandal id "${scandal.id}" appears in more than one deck — ids must be ` +
            `unique across scandals.yaml and trump.yaml (seen again in the ${deckId} deck)`,
        );
      }
      scandalsById.set(scandal.id, scandal);
    }
  }
}

/** Look up a single scandal by id, in any deck. Throws if the id is unknown. */
export function getScandal(id: string): Scandal {
  const scandal = scandalsById.get(id);
  if (!scandal) throw new Error(`Unknown scandal id: ${id}`);
  return scandal;
}

/**
 * The category (round) name for a given round index. Deck-agnostic: every deck
 * uses the same 4 names (enforced by {@link EXPECTED_CATEGORIES}).
 */
export function categoryName(categoryIndex: number): string {
  return categories[categoryIndex].name;
}

/** Every scandal id belonging to a category, in the given deck. */
export function scandalIdsForCategory(
  categoryIndex: number,
  deckId: DeckId = "standard",
): string[] {
  return deckCategories(deckId)[categoryIndex].scandals.map((s) => s.id);
}

/**
 * Pick `count` scandal ids for a round, at random, skipping any id in
 * `excludeIds`. Callers are responsible for clearing exclusions when a category
 * no longer has enough unused scandals (see the reducer's BEGIN_ROUND). Falls
 * back to sampling with reuse only if the category itself is too small, which
 * the loader's validation already prevents.
 */
export function sampleScandals(
  categoryIndex: number,
  count: number,
  excludeIds: readonly string[] = [],
  deckId: DeckId = "standard",
): string[] {
  const exclude = new Set(excludeIds);
  const pool = deckCategories(deckId)[categoryIndex].scandals.map((s) => s.id);
  const available = pool.filter((id) => !exclude.has(id));
  const source = available.length >= count ? available : pool;
  return shuffle(source).slice(0, count);
}
