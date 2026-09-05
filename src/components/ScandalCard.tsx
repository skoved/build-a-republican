import type { Scandal } from "../data/scandals";

interface Props {
  scandal: Scandal;
  /** Category / round label shown as the card kicker. */
  categoryLabel: string;
}

/** Compact newspaper clipping used on the round summary and end screen. */
export default function ScandalCard({ scandal, categoryLabel }: Props) {
  return (
    <div className="paper rounded-sm border border-black/20 p-3 text-left shadow-sm">
      <p className="dateline text-[0.6rem] uppercase tracking-[0.18em] text-gop-red">
        {categoryLabel}
      </p>
      <h4 className="headline mt-1 text-sm leading-tight">{scandal.headline}</h4>
      <p className="mt-1 font-serif text-[0.8rem] leading-snug text-black/80">
        {scandal.politician} — {scandal.position}
      </p>
      <a
        className="mt-1 inline-block font-serif text-[0.75rem] font-semibold text-gop-blue underline decoration-gop-blue/40 underline-offset-2 hover:decoration-gop-blue"
        href={scandal.articleUrl}
        target="_blank"
        rel="noreferrer noopener"
      >
        Read the real story{scandal.articleSource ? ` · ${scandal.articleSource}` : ""} ↗
      </a>
    </div>
  );
}
