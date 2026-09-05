import type { Scandal } from "../data/scandals";

interface Props {
  scandal: Scandal;
  /** e.g. "Round 2 — Finance and Fraud". Rendered as the masthead kicker. */
  kicker?: string;
}

/** The full-size newspaper that unfolds when a briefcase is opened. */
export default function NewspaperReveal({ scandal, kicker }: Props) {
  return (
    <article className="paper mx-auto w-full max-w-2xl rounded-sm border border-black/20 p-6 shadow-paperlift sm:p-8">
      <header className="border-b-2 border-black/70 pb-2 text-center">
        <p className="dateline text-[0.7rem] uppercase tracking-[0.25em] text-black/70">
          {kicker ?? "The Republican Record"}
        </p>
        <p className="dateline mt-1 text-[0.65rem] uppercase tracking-[0.2em] text-black/50">
          Vol. MMXXVI · Price: Your Dignity
        </p>
      </header>

      <h2 className="headline mt-4 text-2xl sm:text-3xl">{scandal.headline}</h2>

      <p className="mt-3 border-y border-black/15 py-1 text-center text-xs font-semibold uppercase tracking-wide text-black/60">
        A Developing Scandal
      </p>

      <p className="mt-3 font-serif text-[0.95rem] leading-relaxed first-letter:float-left first-letter:mr-2 first-letter:font-display first-letter:text-5xl first-letter:leading-none">
        {scandal.text}
      </p>

      <footer className="mt-5 rounded-sm border border-black/25 bg-black/[0.04] p-3 text-sm">
        <p className="dateline text-[0.7rem] uppercase tracking-[0.2em] text-black/60">
          Based on a true story
        </p>
        <p className="mt-1 font-serif">
          <span className="font-semibold">{scandal.politician}</span>
          <span className="text-black/70"> — {scandal.position}</span>
        </p>
        <a
          className="mt-1 inline-block font-serif font-semibold text-gop-blue underline decoration-gop-blue/40 underline-offset-2 hover:decoration-gop-blue"
          href={scandal.articleUrl}
          target="_blank"
          rel="noreferrer noopener"
        >
          Read the real story{scandal.articleSource ? ` · ${scandal.articleSource}` : ""} ↗
        </a>
      </footer>
    </article>
  );
}
