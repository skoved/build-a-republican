import { motion } from "framer-motion";
import { categoryName } from "../data/scandals";
import { playerBuilds } from "../game/selectors";
import type { AppDispatch, GameState } from "../game/types";
import ScandalCard from "./ScandalCard";

interface Props {
  state: GameState;
  dispatch: AppDispatch;
}

export default function EndScreen({ state, dispatch }: Props) {
  const builds = playerBuilds(state);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <header className="text-center">
        <p className="dateline text-xs uppercase tracking-[0.35em] text-brass">
          The polls have closed
        </p>
        <h1 className="headline mt-2 text-4xl text-paper sm:text-5xl">
          Meet your <span className="text-gop-red">candidates</span>
        </h1>
        <p className="mt-3 font-serif text-paper/70">
          Four scandals apiece. May the least disqualified win.
        </p>
      </header>

      <div
        className={`mt-8 grid gap-5 ${
          builds.length === 4 ? "sm:grid-cols-2 lg:grid-cols-4" : "md:grid-cols-3"
        }`}
      >
        {builds.map(({ player, scandals }, i) => (
          <motion.section
            key={player.id}
            className="rounded-xl border border-brass/40 bg-leather p-4 text-paper shadow-xl"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: i * 0.12, type: "spring", stiffness: 200, damping: 22 }}
          >
            <div className="rounded-lg bg-black/25 p-3 text-center">
              <p className="dateline text-[0.65rem] uppercase tracking-[0.25em] text-brass">
                Candidate {i + 1}
              </p>
              <h2 className="headline mt-1 text-2xl text-brass">{player.politicianName}</h2>
              <p className="font-serif text-xs text-paper/60">built by {player.playerName}</p>
            </div>
            <div className="mt-3 space-y-2">
              {scandals.map(({ categoryIndex, scandal }) => (
                <ScandalCard
                  key={scandal.id}
                  scandal={scandal}
                  categoryLabel={categoryName(categoryIndex)}
                />
              ))}
            </div>
          </motion.section>
        ))}
      </div>

      <div className="mt-10 text-center">
        <button
          type="button"
          onClick={() => dispatch({ type: "PLAY_AGAIN" })}
          className="rounded-lg bg-gop-red px-10 py-3 font-display text-lg font-bold text-white shadow-lg transition hover:brightness-110"
        >
          Play again
        </button>
        <p className="mt-2 font-serif text-sm text-paper/50">
          A fresh game skips every scandal you&rsquo;ve already seen this session.
        </p>
      </div>
    </div>
  );
}
