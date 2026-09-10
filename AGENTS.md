# AGENTS.md

Onboarding for coding agents. Read this before touching the repo.

## 1. What this is

**Build a Republican** is a 3–4 player **hotseat** party game (one screen, players pass the
device). Over four rounds — Personal Conduct, Finance and Fraud, Conflict of Interest,
October Surprise — each player drafts one real‑politician scandal per category into their
own fictional Republican candidate. Whoever assembles the "most electable disaster" wins;
players decide the winner themselves.

It is a pure client‑side **static SPA**: no backend, no database, no API calls, no
`localStorage`/cookies. All state lives in a single in‑memory `useReducer` and is wiped on
page reload. It deploys to Vercel as static files.

## 2. Stack & commands

Vite 5 · React 18 · TypeScript 5 (strict) · Tailwind 3 · `framer-motion` (animation) ·
`zod` (runtime validation) · `@rollup/plugin-yaml` (imports YAML as data).
Tests: Vitest 2 · `@testing-library/react` · jsdom. **No ESLint config, no `lint` script.**

`package.json` scripts:

| command | what it does |
| --- | --- |
| `npm run dev` | Vite dev server at `http://localhost:5173` |
| `npm test` | `vitest run` — full suite, one pass |
| `npm run build` | `prebuild` (content validation) → `tsc -b` → `vite build` → `dist/` |
| `npm run preview` | serve the built `dist/` locally |
| `npm run validate:scandals` | run `scripts/validate-scandals.mjs` by itself |

`prebuild` is invoked automatically by npm before `build`.

## 3. Repo layout

```
index.html               entry HTML; loads Google Fonts + /src/main.tsx
vite.config.ts           Vite + React + yaml plugins; Vitest config lives in here
tailwind.config.js       custom "newspaper" theme (colors, fonts, shadows)
postcss.config.js        tailwindcss + autoprefixer
tsconfig.json            project references -> tsconfig.app.json + tsconfig.node.json
vercel.json              build command, SPA rewrite, security headers
README.md                player-facing rules + content-editing guide
scripts/validate-scandals.mjs   build-time content gate
scandals.yaml            standard scandal deck (large)
trump.yaml               "Trump deck" (alternate pool)
bonus-candidates.yaml    up to 3 pre-built end-screen candidates
candidate-names.yaml     ordered pool of names assigned to players' Republicans
src/
  main.tsx               createRoot + <StrictMode><App/></StrictMode>
  App.tsx                single useReducer; renders one screen per phase
  index.css              @tailwind + custom global classes
  yaml.d.ts              `declare module "*.yaml"`
  game/
    types.ts             GameState / Player / RoundState / Phase / TurnStep / Action
    reducer.ts           createInitialState + reducer (all game logic, no React)
    selectors.ts         derived reads over GameState
  data/
    scandals.ts          imports scandals.yaml + trump.yaml; Zod-parses; typed getters + constants
    bonusCandidates.ts   imports bonus-candidates.yaml; Zod-parses
    candidateNames.ts    imports candidate-names.yaml; Zod-parses
  lib/
    sanitizeName.ts      MAX_NAME_LENGTH (24) + sanitizeName()
    shuffle.ts           Fisher-Yates shuffle<T>()
  components/            11 presentational components (see §6)
  __tests__/             app.test.tsx, reducer.test.ts, sanitizeName.test.ts
  test/setup.ts          Vitest setup file (polyfills window.matchMedia)
```

The checkout is **git + Jujutsu colocated** (`.jj/` present). Use plain `git`; `.jj/` is
VCS metadata, not app content. `dist/` and `*.tsbuildinfo` are gitignored build output.

## 4. How the game works (the state machine)

`src/game/reducer.ts` is the single source of truth. `App.tsx` owns the one
`useReducer(reducer, undefined, createInitialState)`; every component is presentational and
communicates only by dispatching `Action`s. `dealRound`, `advanceTurn`, and
`seatsAreComplete` are module‑private helpers.

**`Phase` flow** — `setup → round-intro → round-turn → round-summary` (loop the middle
three for 4 rounds) `→ end`. `App.tsx` renders exactly one screen per phase via separate
conditionals (not a switch):

| phase | screen |
| --- | --- |
| `setup` | `SetupScreen` |
| `round-intro` | `RoundIntro` |
| `round-turn` | `PlayerTurn` |
| `round-summary` | `RoundSummaryModal` |
| `end` | `EndScreen` |

**`RoundState.turnStep`** within a turn: `picking → deciding`, and from `deciding` a player
may enter `swapping → deciding`; ending the turn returns to `picking` for the next player.
`RoundState.activePlayerIndex` doubles as the active `PlayerId` (seats are `0..n-1`).

**`Action`s:** `SUBMIT_SETUP {seats, deckId?}`, `BEGIN_ROUND`, `TAKE_BRIEFCASE {index}`,
`KEEP_SCANDAL`, `REQUEST_SWAP`, `CANCEL_SWAP`, `BLIND_SWAP {index}`, `DISMISS_SUMMARY`,
`PLAY_AGAIN`.

**Briefcases:** each round deals `players.length * BRIEFCASES_PER_PLAYER` (2) sealed
briefcases, each holding one scandal id. A player opens one (`TAKE_BRIEFCASE`), reads it,
then `KEEP_SCANDAL` or trades it.

**Swaps:** each player gets `SWAPS_PER_GAME` (2) *blind* swaps for the **whole game**
(`Player.swapsRemaining`), on top of a per‑turn lock `RoundState.swapUsed` (at most one
swap per turn). `BLIND_SWAP` discards the currently held scandal and takes a still‑sealed
briefcase sight‑unseen. `TurnBanner` shows a dot indicator of swaps left.

**Decks:** `GameState.deckId` is `"standard"` (draws from `scandals.yaml`) or `"trump"`
(draws from `trump.yaml`). The Trump deck is started from the nearly invisible `TrumpMark`
button in the top‑right of the setup screen.

**Session‑persistent state** on `GameState` — survives `PLAY_AGAIN`, resets only on reload:

- `usedScandalIds` — scandals already shown; a replay avoids them until a category runs dry.
- `completedGames` — finished standard‑deck games; selects which bonus candidate to show.
- `gamesStarted` — indexes `candidate-names.yaml` in blocks of 4 (see §5).
- `previousPlayerNames` — pre‑fills the setup form on "Play again" and carries the 3‑vs‑4
  seat count.

**Name handling:** `SUBMIT_SETUP` runs each entered name through `sanitizeName` (NFC
normalize, strip control / zero‑width / bidi‑override characters, collapse whitespace, cap
at `MAX_NAME_LENGTH`). React already escapes names at every render site; this just keeps
stored values plain, bounded, single‑line.

**`src/game/selectors.ts`** — `activePlayer`, `requireRound`, `roundNumber`,
`heldBriefcaseIndex`, `heldScandal`, `swapTargetIndexes`, `playerBuilds` (per‑player list
of drafted scandals, used by the summary and end screens).

## 5. Content: the YAML data pipeline

Four YAML files at the repo root are imported as plain data via `@rollup/plugin-yaml`
(`vite.config.ts` → `plugins: [react(), yaml()]`), typed by `src/yaml.d.ts`.

| file | role | shape |
| --- | --- | --- |
| `scandals.yaml` | standard deck | `categories:` — **exactly 4**, fixed order and ids: `personal-conduct`, `finance-and-fraud`, `conflict-of-interest`, `october-surprise`; **≥8 scandals each** |
| `trump.yaml` | alternate deck | same shape; scandal ids use a `t-` prefix |
| `bonus-candidates.yaml` | end‑screen extras | `candidates:` — up to 3, each `name` + **exactly 4** scandals (one per category, no `id`); "built by Digital Ground Game"; never shown for Trump games |
| `candidate-names.yaml` | Republican name pool | `names:` list. `candidateNameFor(gameIndex, seatIndex)` = `names[gameIndex*4 + seatIndex]`, so a 3‑player game skips its 4th slot; missing entries fall back to `Republican #N` |

A **scandal** entry: `id` (kebab‑case, globally unique across `scandals.yaml` +
`trump.yaml`), `headline`, `text`, `politician`, `position`, `articleUrl` (http/https),
optional `articleSource`.

**Two independent validations:**

1. **Build‑time** — `scripts/validate-scandals.mjs` (exports `validateScandalData`,
   `EXPECTED_CATEGORIES`, `MIN_SCANDALS_PER_CATEGORY` = 8). Checks `scandals.yaml`,
   `trump.yaml`, `bonus-candidates.yaml`: 4 categories in the right order/ids/names, ≥8
   scandals per category, kebab‑case ids, non‑empty required fields, valid `http(s)`
   `articleUrl`, ids unique within and across the two decks, bonus file ≤3 candidates × 4
   scandals. Runs via `prebuild`; a failure aborts `npm run build`. **Does not** check
   `candidate-names.yaml`.
2. **Runtime** — each `src/data/*.ts` module re‑parses its YAML with its own Zod
   `fileSchema.safeParse` and throws a formatted error on a malformed file. This fires
   during both `vite build` and `npm test` (module import).

To change game content: edit the YAML, run `npm run build` (or `npm run
validate:scandals`) to check it, commit.

## 6. Components & styling

- **`SetupScreen`** — seat form: name input per seat (capped at `MAX_NAME_LENGTH`, assigned
  Republican name shown via `candidateNameFor`), add/remove 4th player, submit
  (`SUBMIT_SETUP`); hidden `TrumpMark` button submits with `deckId: "trump"`.
- **`RoundIntro`** — "Round N of 4", category name, flavor blurb, "Deal the briefcases"
  (`BEGIN_ROUND`).
- **`TurnBanner`** — sticky header: round/category, "{activePlayerName}'s turn", a
  blind‑swaps‑left dot indicator (+ `sr-only` count), and a turn‑step hint string.
- **`PlayerTurn`** — the turn screen: `TurnBanner` + `BriefcaseGrid`; during `swapping` a
  "trade blind" bar with a "Never mind" (`CANCEL_SWAP`) button; during `deciding` a modal
  with `NewspaperReveal` and Keep (`KEEP_SCANDAL`) / Trade‑it‑away (`REQUEST_SWAP`) / (post
  swap) Lock‑it‑in.
- **`BriefcaseGrid`** — responsive grid of `Briefcase`s; computes each case's visual state
  and interactivity from `mode` (`picking` / `swapping` / `idle`); dispatches
  `TAKE_BRIEFCASE` / `BLIND_SWAP` via `onSelect`.
- **`Briefcase`** — one `motion.button` styled as a brass‑and‑leather case; closed, held,
  or discarded visual.
- **`NewspaperReveal`** — full unfolded newspaper for an opened scandal: headline, body,
  "based on a true story" footer with the real politician + external `articleUrl` link.
- **`ScandalCard`** — compact newspaper‑clipping card; used on the summary and end screens.
- **`RoundSummaryModal`** — "The field so far": each player's drafted scandals to date;
  advances with `DISMISS_SUMMARY`.
- **`EndScreen`** — final candidates grid (one card per player) + optional dashed "Bonus
  candidate" card (`bonusCandidateForGame(completedGames - 1)`, standard deck only); "Play
  again" (`PLAY_AGAIN`).
- **`TrumpMark`** — monochrome inline `<svg>` silhouette; the face of the hidden Trump‑deck
  button.

**Styling.** Tailwind with a custom newspaper theme in `tailwind.config.js` — colors
`paper`, `ink`, `gop-red`, `gop-blue`, `brass`, `leather`; `display` (Playfair) and `serif`
(Newsreader) font families; `case` / `paperlift` shadows. Plus plain global classes in
`src/index.css`: `.paper` (newsprint texture), `.headline`, `.dateline` (typewriter font),
`.briefcase-skin`, and `.swap-target` + `@keyframes swap-target-glow`, with a
`prefers-reduced-motion` reset. `.swap-target` animates a `filter` drop‑shadow only —
**never `transform`** — so it does not fight framer‑motion's layout projection. Fonts load
from Google Fonts via a `<link>` in `index.html`.

## 7. Tests

Run with `npm test` (`vitest run`). Config is the `test` block in `vite.config.ts`:
`environment: "jsdom"`, `globals: true`, `setupFiles: ["./src/test/setup.ts"]`.
**`@testing-library/jest-dom` is not installed** — assertions use `.toBeTruthy()`,
`.toBeNull()`, `.disabled`, `.textContent`, regex `getByText`, etc. `app.test.tsx` calls
`afterEach(cleanup)` itself.

- **`src/__tests__/reducer.test.ts`** — pure reducer + selectors, no DOM. `describe`
  suites: `setup`, `opening a briefcase`, `round turn flow`, `end of round`,
  `full game + replays`, `trump deck`, `bonus candidates`. Helpers build states through
  `SUBMIT_SETUP` and play whole games (`playRoundKeepingPicks`, `playFullGame`).
- **`src/__tests__/app.test.tsx`** — full `<App />` integration via Testing Library:
  setup → 4 rounds → end screen; blind‑swap flow; swap lockout after both spent; the swap
  indicator; the add/remove 4th‑player toggle; starting the Trump deck; "Play again"
  pre‑fill of names + seat count; player‑name markup rendering as inert text.
- **`src/__tests__/sanitizeName.test.ts`** — unit tests for `sanitizeName`: strips
  control / zero‑width / bidi / BOM characters, NFC‑normalizes, caps length, keeps ZWJ
  emoji sequences, empties an all‑junk input.

Run `npm test` for the current pass count; don't hardcode it.

## 8. Build

`npm run build` runs three stages:

1. **`prebuild`** → `node scripts/validate-scandals.mjs` — the content gate (§5). A
   malformed deck file stops the build here.
2. **`tsc -b`** — type‑checks via the three project‑reference tsconfigs. `strict`,
   `noUnusedLocals`, `noUnusedParameters`, and `noFallthroughCasesInSwitch` are all on, so
   unused imports/vars/params and non‑exhaustive switches **fail the build**.
3. **`vite build`** — emits static assets to `dist/` (`index.html` + hashed `assets/`).

`npm run preview` serves the built `dist/`.

## 9. Deploy

Hosted on **Vercel** as static files. `vercel.json`:

- `framework: "vite"`, `buildCommand: "npm run build"`, `outputDirectory: "dist"`.
- SPA rewrite: `/((?!assets/).*) → /index.html`.
- Security headers on `/(.*)`: a strict **Content‑Security‑Policy** (`default-src 'self'`,
  `script-src 'self'`, `object-src` / `base-uri` / `frame-ancestors` / `form-action`
  `'none'`; the only external allowlist is Google Fonts for `style-src`/`font-src`), plus
  `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `X-Frame-Options:
  DENY`, a `Permissions-Policy` that disables camera/mic/geolocation, and HSTS.

Deploy by importing the repo in the Vercel dashboard, or `npm i -g vercel` then
`vercel --prod`. To publish new content: edit the YAML and push — `npm run build` (which
Vercel runs) rejects a malformed deck before it can go live. The headers apply only on
Vercel, not under `npm run dev`.

## 10. Conventions & gotchas

- Keep all game logic in `src/game/` (framework‑free, unit‑testable). Components stay
  presentational and only dispatch actions.
- Strict TS + `noUnusedLocals`/`noUnusedParameters`: dead code breaks `npm run build`.
  There is no ESLint — `tsc` is the linter.
- No `localStorage`, cookies, `fetch`, WebSockets, analytics, or backend anywhere. The
  "stores nothing" property and the CSP both depend on this. A new runtime dependency that
  needs `eval`/`new Function`, an external host, or an inline script will break the CSP —
  check `dist/index.html` and the console after adding one.
- New scandal content must pass **both** validators and keep the four category ids/order,
  the `t-` prefix for Trump ids, and kebab‑case unique ids.
- Adding a field to `GameState`: update `createInitialState` **and** the `PLAY_AGAIN`
  return object in `reducer.ts` (both are hand‑written literals, not spreads). `tsc` will
  flag a miss.
- After any change, run `npm test` and `npm run build` before committing.
