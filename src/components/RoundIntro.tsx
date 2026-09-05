import type { AppDispatch } from "../game/types";

interface Props {
  roundNumber: number;
  categoryIndex: number;
  categoryName: string;
  dispatch: AppDispatch;
}

const BLURBS = [
  "The messy human stuff: the yacht weeks, the fake degrees, the town halls full of paid extras.",
  "Follow the money: shell consultants, straw donors, and relief loans that relieved no one.",
  "The revolving door, spinning fast: committee seats, family lobbyists, and very convenient votes.",
  "It's late October. Someone has a sealed file, a security tape, and a countdown clock.",
];

export default function RoundIntro({
  roundNumber,
  categoryIndex,
  categoryName,
  dispatch,
}: Props) {
  return (
    <div className="mx-auto flex min-h-full max-w-xl flex-col items-center justify-center px-4 py-12 text-center">
      <p className="dateline text-xs uppercase tracking-[0.35em] text-brass">
        Round {roundNumber} of 4
      </p>
      <h2 className="headline mt-3 text-4xl text-paper sm:text-5xl">{categoryName}</h2>
      <p className="mt-4 font-serif text-paper/80">{BLURBS[categoryIndex]}</p>
      <button
        type="button"
        onClick={() => dispatch({ type: "BEGIN_ROUND" })}
        className="mt-8 rounded-lg bg-gop-red px-8 py-3 font-display text-lg font-bold text-white shadow-lg transition hover:brightness-110"
      >
        Deal the briefcases
      </button>
    </div>
  );
}
