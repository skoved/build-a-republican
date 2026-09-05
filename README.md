# Build a Republican

A 3-player hotseat party game. On one screen, three players take turns drafting
scandals into their own Republican politician across four rounds — **Personal
Conduct**, **Finance and Fraud**, **Conflict of Interest**, and the **October
Surprise**. Whoever assembles the most electable disaster wins (you decide how).

Built with Vite + React + TypeScript + Tailwind. No backend — it deploys as a
static site on Vercel's free tier.

## How a round works

1. Six sealed briefcases are dealt, each hiding one scandal from that round's
   category.
2. Players go in order (Player 1 → 2 → 3). On your turn:
   - **Pick** a sealed briefcase. It opens into a newspaper: the headline, the
     story, and a *Based on a true story* footer naming the real politician, their
     current position, and a link to the real article.
   - **Decide** immediately — keep it, or **trade it away blind** for one of the
     still-sealed briefcases. A blind swap discards your old scandal for the rest
     of the round; you get one swap per turn.
3. After all three players lock in, a summary shows every candidate so far.
4. After four rounds, the end screen lays out all three finished candidates with
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
- at least **6** scandals per category;
- every scandal has a unique id and non-empty `headline`, `text`, `politician`,
  `position`, and a valid `http(s)` `articleUrl`.

Each game draws 6 scandals per round at random. Because used scandals are skipped
in later games that session, size each category for the number of back-to-back
games you want: roughly `6 × games`. The bundled file ships 12 per category
(2 clean games) with **placeholder** names and links — replace them with real
research.

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
