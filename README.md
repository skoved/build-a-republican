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
   - **Choose** a sealed briefcase. It grows and slides to the centre of the
     screen, still shut, and asks you to confirm — **Open this briefcase** or
     **Choose a different one** — so a stray click can't cost you your pick.
   - **Open** it and it unfolds into a newspaper: the headline, the story, and a
     *Based on a true story* footer naming the real politician, their current
     position, and a link to the real article.
   - **Decide** immediately — keep it, or **trade it away blind** for one of the
     still-sealed briefcases (that trade gets the same confirm step). A blind swap
     discards your old scandal for the rest of the round; you get one swap per turn.
3. After every player locks in, the board comes back into view; a button then
   reveals the scandals in the briefcases nobody picked, one at a time
   ("the ones that got away"), followed by a summary of every candidate so far.
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
