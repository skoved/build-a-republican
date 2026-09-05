import { motion } from "framer-motion";
import { categoryName, ROUND_COUNT } from "../data/scandals";
import { playerBuilds, roundNumber } from "../game/selectors";
import type { AppDispatch, GameState } from "../game/types";
import ScandalCard from "./ScandalCard";

interface Props {
  state: GameState;
  dispatch: AppDispatch;
}

export default function RoundSummaryModal({ state, dispatch }: Props) {
  const builds = playerBuilds(state);
  const isFinalRound = state.rounds.length >= ROUND_COUNT;
  const justFinished = roundNumber(state);

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-black/75 px-4 py-8">
      <motion.div
        className="w-full max-w-4xl rounded-xl border border-brass/40 bg-leather p-5 text-paper shadow-2xl sm:p-8"
        initial={{ y: 24, opacity: 0, scale: 0.97 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 22 }}
      >
        <header className="text-center">
          <p className="dateline text-xs uppercase tracking-[0.3em] text-brass">
            Round {justFinished} sealed · {categoryName(state.rounds.length - 1)}
          </p>
          <h2 className="headline mt-2 text-3xl sm:text-4xl">The field so far</h2>
        </header>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {builds.map(({ player, scandals }) => (
            <section
              key={player.id}
              className="rounded-lg border border-brass/30 bg-black/20 p-3"
            >
              <h3 className="headline text-center text-lg text-brass">
                {player.politicianName}
              </h3>
              <p className="mb-3 text-center font-serif text-xs text-paper/60">
                built by {player.playerName}
              </p>
              <div className="space-y-2">
                {scandals.map(({ categoryIndex, scandal }) => (
                  <ScandalCard
                    key={scandal.id}
                    scandal={scandal}
                    categoryLabel={categoryName(categoryIndex)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-7 text-center">
          <button
            type="button"
            onClick={() => dispatch({ type: "DISMISS_SUMMARY" })}
            className="rounded-lg bg-gop-red px-8 py-3 font-display text-lg font-bold text-white shadow-lg transition hover:brightness-110"
          >
            {isFinalRound ? "See the finished ballot" : "On to the next round"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
