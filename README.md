# Build a Republican

A 3–4 player hotseat party game. On one screen, players take turns drafting
scandals into their own Republican politician across four rounds — **Personal
Conduct**, **Finance and Fraud**, **Conflict of Interest**, and the **October
Surprise**. Whoever assembles the most electable disaster wins (you decide how).
Three players by default; the setup screen has an **Add a fourth player** toggle.

Built with Vite + React + TypeScript + Tailwind. No backend — it deploys as a
static site on Vercel's free tier.

## How a round works

1. Sealed briefcases are dealt, each hiding one scandal from that round's
   category — two per player, so six for a 3-player game and eight for four.
2. Players go in seat order (Player 1 → 2 → 3 → …). On your turn:
   - **Open** a sealed briefcase and it unfolds into a newspaper: the headline,
     the story, and a *Based on a true story* footer naming the real politician,
     their current position, and a link to the real article.
   - **Decide** immediately — keep it, or **trade it away blind** for one of the
     still-sealed briefcases. A blind swap discards your old scandal and locks you
     into the new one for the rest of the round. You get **two swaps for the whole
     game** — spend them in whichever rounds you like (still one per turn), and
     once both are gone you're stuck with whatever you pick in every later round.
3. After every player locks in, a summary lays out every candidate so far.
4. After four rounds, the end screen lays out all the finished candidates with
   links to every source article, plus **Play again**.

Replays in the same browser session never reuse a scandal you've already seen,
until a category runs out and starts recycling.

## Editing the content

All game text lives in [`scandals.yaml`](./scandals.yaml). It's the only file you
need to touch to change the game. Structure:

```yaml
categories:
  - id: personal-conduct        # keep these 4 ids, in this order
    name: Personal Conduct
    scandals:
      - id: pc-unique-slug      # unique across the whole file, kebab-case
        headline: "ALL CAPS TABLOID HEADLINE"
        text: "The paragraph printed on the newspaper."
        politician: "Real Person's Name"
        position: "Their current political position"
        articleUrl: "https://example.com/real-article"   # must be http(s)
        articleSource: "Outlet Name"                      # optional link label
  # ...finance-and-fraud, conflict-of-interest, october-surprise
```

Rules enforced at build time by [`scripts/validate-scandals.mjs`](./scripts/validate-scandals.mjs):

- exactly 4 categories, with the ids/names above, in that order;
- at least **8** scandals per category (enough to fill a 4-player round);
- every scandal has a unique id and non-empty `headline`, `text`, `politician`,
  `position`, and a valid `http(s)` `articleUrl`.

Each game draws two scandals per player per round at random (6 for three players,
8 for four). Because used scandals are skipped in later games that session, size
each category for the number of back-to-back games you want: roughly
`8 × games` for four-player tables. The bundled file ships 12 per category with
**placeholder** names and links — replace them with real research (and add more
if you want multiple clean 4-player games in a session).

Run the check yourself any time:

```bash
npm run validate:scandals
```

### The Trump deck

[`trump.yaml`](./trump.yaml) is a second scandal pool in the **identical** format.
It is started from the small unlabelled button in the top-right corner of the
setup screen (enabled once every name is filled). It plays a normal 4-round game,
just from this file instead of `scandals.yaml`. Same validation rules apply, and
scandal ids must be unique **across both files** — keep the `t-` prefix used in
the shipped placeholders. `npm run validate:scandals` checks both files.

### Bonus candidates

[`bonus-candidates.yaml`](./bonus-candidates.yaml) holds up to **3** pre-built
candidates shown one at a time on the end screen of successive **standard-deck**
games in a browser session: candidate #1 after the first game, #2 after the first
replay, #3 after the second replay, then none. Each candidate needs a `name` and
**exactly 4** scandals in category order (Personal Conduct, Finance and Fraud,
Conflict of Interest, October Surprise); a bonus scandal has the same fields as a
`scandals.yaml` entry minus `id`. The card's "built by" line is always
`Digital Ground Game`. Trump-deck games never show a bonus candidate.
`npm run validate:scandals` checks this file too.

## Local development

```bash
npm install
npm run dev            # http://localhost:5173
npm run build          # validates scandals.yaml, then builds to dist/
npm run preview        # serve the production build
npm test               # reducer + full-playthrough tests
```

## Deploying to Vercel (free tier)

**Option A — Git:**

1. `git init && git add -A && git commit -m "Build a Republican"`
2. Push to a new GitHub/GitLab repo.
3. In the Vercel dashboard, **Add New → Project** and import the repo. Vercel
   detects Vite automatically; [`vercel.json`](./vercel.json) pins the build
   command (`npm run build`) and output (`dist`). Deploy.

**Option B — CLI:**

```bash
npm i -g vercel
vercel            # first run links/creates the project
vercel --prod     # promote to production
```

To change scandals after deploy: edit `scandals.yaml`, commit/push (or re-run
`vercel --prod`). A malformed file fails the build before it can go live.
