import { AnimatePresence, motion } from "framer-motion";
import { categoryName, getScandal } from "../data/scandals";
import { requireRound, roundNumber, unopenedBriefcaseIndexes } from "../game/selectors";
import type { AppDispatch, GameState } from "../game/types";
import NewspaperReveal from "./NewspaperReveal";

interface Props {
  state: GameState;
  dispatch: AppDispatch;
}

/**
 * Shown after the last player locks in, before the round summary: walks through
 * the scandals in the briefcases nobody opened, one at a time.
 */
export default function RoundRevealModal({ state, dispatch }: Props) {
  const round = requireRound(state);
  const order = unopenedBriefcaseIndexes(round);
  const total = order.length;
  const cursor = Math.min(Math.max(round.revealCursor, 0), Math.max(total - 1, 0));
  const briefcaseNumber = order[cursor] + 1;
  const scandal = getScandal(round.briefcases[order[cursor]].scandalId);
  const isLast = cursor >= total - 1;
  const kicker = `Round ${roundNumber(state)} — ${categoryName(round.categoryIndex)}`;

  return (
    <div className="fixed inset-0 z-40 flex flex-col items-center overflow-y-auto bg-black/80 px-4 py-8">
      <header className="mb-4 text-center text-paper">
        <p className="dateline text-xs uppercase tracking-[0.3em] text-brass">
          The ones that got away
        </p>
        <p className="mt-1 font-display text-2xl font-bold">
          {cursor + 1} <span className="text-paper/60">of</span> {total}
        </p>
        <p className="mt-0.5 font-serif text-sm text-paper/60">
          Briefcase {briefcaseNumber} — nobody picked it
        </p>
      </header>

      <AnimatePresence mode="wait">
        <motion.div
          key={cursor}
          className="w-full max-w-2xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ type: "spring", stiffness: 220, damping: 24 }}
        >
          <NewspaperReveal scandal={scandal} kicker={kicker} />
        </motion.div>
      </AnimatePresence>

      <button
        type="button"
        onClick={() => dispatch({ type: "NEXT_REVEAL" })}
        className="mt-5 rounded-lg bg-gop-red px-8 py-3 font-display text-lg font-bold text-white shadow-lg transition hover:brightness-110"
      >
        {isLast ? "Show the field →" : "Next scandal →"}
      </button>
    </div>
  );
}
