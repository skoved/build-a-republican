import { motion } from "framer-motion";
import { categoryName } from "../data/scandals";
import { requireRound, roundNumber, unopenedBriefcaseIndexes } from "../game/selectors";
import type { AppDispatch, GameState } from "../game/types";
import BriefcaseGrid from "./BriefcaseGrid";

interface Props {
  state: GameState;
  dispatch: AppDispatch;
}

const noop = () => {};

/**
 * A calm beat after the last player locks in: the final board comes back into
 * view, and a button starts the reveal of the briefcases nobody opened.
 */
export default function RoundRecap({ state, dispatch }: Props) {
  const round = requireRound(state);
  const unopened = unopenedBriefcaseIndexes(round).length;

  return (
    <div className="min-h-full pb-28">
      <motion.div
        className="sticky top-0 z-20 border-b-2 border-brass/40 bg-leather/95 px-4 py-3 text-center text-paper backdrop-blur"
        initial={{ y: -16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 26 }}
      >
        <p className="dateline text-[0.65rem] uppercase tracking-[0.3em] text-brass">
          Round {roundNumber(state)} of 4 · {categoryName(round.categoryIndex)}
        </p>
        <p className="mt-1 font-display text-xl font-bold sm:text-2xl">Every pick is in</p>
        <p className="mt-0.5 font-serif text-sm text-paper/80">
          {unopened} briefcase{unopened === 1 ? "" : "s"} went unopened this round.
        </p>
      </motion.div>

      <motion.div
        className="mx-auto max-w-3xl px-4 py-6"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
      >
        <BriefcaseGrid round={round} players={state.players} mode="idle" onSelect={noop} />
      </motion.div>

      <motion.div
        className="fixed inset-x-0 bottom-0 z-20 border-t-2 border-brass/40 bg-leather/95 px-4 py-4 text-center backdrop-blur"
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.28, type: "spring", stiffness: 240, damping: 24 }}
      >
        <button
          type="button"
          onClick={() => dispatch({ type: "REVEAL_UNOPENED" })}
          className="rounded-lg bg-gop-red px-8 py-3 font-display text-lg font-bold text-white shadow-lg transition hover:brightness-110"
        >
          Reveal the {unopened} briefcase{unopened === 1 ? "" : "s"} nobody opened →
        </button>
      </motion.div>
    </div>
  );
}
