// Build-time gate for the content files: the scandal decks (scandals.yaml +
// trump.yaml) and the end-screen bonus candidates (bonus-candidates.yaml).
//
// Run directly (`npm run validate:scandals`) or automatically before every
// build (`prebuild` in package.json). Exits non-zero with a readable message
// so a malformed content file can never reach a deploy.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import yaml from "js-yaml";
import { z } from "zod";

const here = dirname(fileURLToPath(import.meta.url));

// Every deck file the app bundles. src/data/scandals.ts merges them into one
// scandal lookup, so ids must also be unique *across* files (checked below).
const YAML_FILES = [
  { label: "scandals.yaml", path: resolve(here, "..", "scandals.yaml") },
  { label: "trump.yaml", path: resolve(here, "..", "trump.yaml") },
];

// End-screen bonus candidates — a different shape (no categories), validated
// separately below. Keep in sync with src/data/bonusCandidates.ts.
const BONUS_FILE = {
  label: "bonus-candidates.yaml",
  path: resolve(here, "..", "bonus-candidates.yaml"),
};
const MAX_BONUS_CANDIDATES = 3;

// The 4 categories, in the exact order the game plays them as rounds.
export const EXPECTED_CATEGORIES = [
  { id: "personal-conduct", name: "Personal Conduct" },
  { id: "finance-and-fraud", name: "Finance and Fraud" },
  { id: "conflict-of-interest", name: "Conflict of Interest" },
  { id: "october-surprise", name: "October Surprise" },
];

// A full 4-player round deals 8 briefcases, so every category must hold at
// least that many scandals (keep in sync with MAX_BRIEFCASES_PER_ROUND in
// src/data/scandals.ts).
export const MIN_SCANDALS_PER_CATEGORY = 8;

const nonEmpty = (label) =>
  z
    .string({ required_error: `${label} is required` })
    .trim()
    .min(1, `${label} must not be empty`);

const scandalSchema = z.object({
  id: nonEmpty("id").regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "id must be kebab-case"),
  headline: nonEmpty("headline"),
  text: nonEmpty("text"),
  politician: nonEmpty("politician"),
  position: nonEmpty("position"),
  articleUrl: z
    .string({ required_error: "articleUrl is required" })
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
      MIN_SCANDALS_PER_CATEGORY,
      `each category needs at least ${MIN_SCANDALS_PER_CATEGORY} scandals`,
    ),
});

const fileSchema = z.object({
  categories: z.array(categorySchema).length(4, "there must be exactly 4 categories"),
});

// bonus-candidates.yaml: up to 3 candidates, each with exactly 4 scandals (one
// per category, in order) shaped like a scandal entry minus its id.
const bonusScandalSchema = z.object({
  headline: nonEmpty("headline"),
  text: nonEmpty("text"),
  politician: nonEmpty("politician"),
  position: nonEmpty("position"),
  articleUrl: z
    .string({ required_error: "articleUrl is required" })
    .url("articleUrl must be a valid URL")
    .refine((u) => /^https?:\/\//i.test(u), "articleUrl must be http(s)"),
  articleSource: z.string().trim().min(1).optional(),
});

const bonusFileSchema = z.object({
  candidates: z
    .array(
      z.object({
        name: nonEmpty("candidate name"),
        scandals: z
          .array(bonusScandalSchema)
          .length(4, "each bonus candidate needs exactly 4 scandals"),
      }),
    )
    .max(MAX_BONUS_CANDIDATES, `at most ${MAX_BONUS_CANDIDATES} bonus candidates`),
});

/**
 * Validate an already-parsed object. Returns the typed data or throws an Error
 * whose message lists every problem found. `label` names the file in messages.
 */
export function validateScandalData(raw, label = "scandals.yaml") {
  const parsed = fileSchema.safeParse(raw);
  if (!parsed.success) {
    const lines = parsed.error.issues.map(
      (i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`,
    );
    throw new Error(`${label} is invalid:\n${lines.join("\n")}`);
  }

  const data = parsed.data;
  const problems = [];

  // Categories present, correctly ordered, correctly named.
  EXPECTED_CATEGORIES.forEach((expected, index) => {
    const actual = data.categories[index];
    if (!actual) {
      problems.push(`missing category #${index + 1} (${expected.id})`);
      return;
    }
    if (actual.id !== expected.id) {
      problems.push(
        `category #${index + 1} must have id "${expected.id}" (got "${actual.id}")`,
      );
    }
    if (actual.name !== expected.name) {
      problems.push(
        `category "${expected.id}" must have name "${expected.name}" (got "${actual.name}")`,
      );
    }
  });

  // Globally unique scandal ids.
  const seen = new Map();
  for (const category of data.categories) {
    for (const scandal of category.scandals) {
      if (seen.has(scandal.id)) {
        problems.push(
          `duplicate scandal id "${scandal.id}" (in "${seen.get(scandal.id)}" and "${category.id}")`,
        );
      } else {
        seen.set(scandal.id, category.id);
      }
    }
  }

  if (problems.length > 0) {
    throw new Error(
      `${label} is invalid:\n${problems.map((p) => `  - ${p}`).join("\n")}`,
    );
  }

  return data;
}

function main() {
  const validated = [];

  for (const { label, path } of YAML_FILES) {
    let raw;
    try {
      raw = yaml.load(readFileSync(path, "utf8"));
    } catch (err) {
      console.error(`Could not read/parse ${label}:\n  ${err.message}`);
      process.exit(1);
    }

    try {
      const data = validateScandalData(raw, label);
      const counts = data.categories
        .map((c) => `${c.name}: ${c.scandals.length}`)
        .join(", ");
      const total = data.categories.reduce((n, c) => n + c.scandals.length, 0);
      console.log(`${label} OK — ${total} scandals (${counts}).`);
      validated.push({ label, data });
    } catch (err) {
      console.error(err.message);
      process.exit(1);
    }
  }

  // Ids must be unique across every file — src/data/scandals.ts merges all
  // decks into one getScandal() lookup.
  const owner = new Map();
  const collisions = [];
  for (const { label, data } of validated) {
    for (const category of data.categories) {
      for (const scandal of category.scandals) {
        if (owner.has(scandal.id)) {
          collisions.push(`"${scandal.id}" (in ${owner.get(scandal.id)} and ${label})`);
        } else {
          owner.set(scandal.id, label);
        }
      }
    }
  }
  if (collisions.length > 0) {
    console.error(
      `scandal ids must be unique across decks:\n${collisions
        .map((c) => `  - ${c}`)
        .join("\n")}`,
    );
    process.exit(1);
  }
  console.log("no id collisions across decks.");

  // Bonus candidates (end screen) — separate shape.
  let bonusRaw;
  try {
    bonusRaw = yaml.load(readFileSync(BONUS_FILE.path, "utf8"));
  } catch (err) {
    console.error(`Could not read/parse ${BONUS_FILE.label}:\n  ${err.message}`);
    process.exit(1);
  }
  const bonusParsed = bonusFileSchema.safeParse(bonusRaw);
  if (!bonusParsed.success) {
    const lines = bonusParsed.error.issues.map(
      (i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`,
    );
    console.error(`${BONUS_FILE.label} is invalid:\n${lines.join("\n")}`);
    process.exit(1);
  }
  console.log(
    `${BONUS_FILE.label} OK — ${bonusParsed.data.candidates.length} candidates.`,
  );
}

// Only run when executed as a script, not when imported by tests.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
