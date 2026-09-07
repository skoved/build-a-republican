import { AnimatePresence, motion } from "framer-motion";
import { categoryName } from "../data/scandals";
import { activePlayer, heldScandal, requireRound, roundNumber, swapTargetIndexes } from "../game/selectors";
import type { AppDispatch, GameState } from "../game/types";
import BriefcaseGrid from "./BriefcaseGrid";
import NewspaperReveal from "./NewspaperReveal";
import TurnBanner from "./TurnBanner";

interface Props {
  state: GameState;
  dispatch: AppDispatch;
}

export default function PlayerTurn({ state, dispatch }: Props) {
  const round = requireRound(state);
  const active = activePlayer(state);
  const category = categoryName(round.categoryIndex);
  const kicker = `Round ${roundNumber(state)} — ${category}`;
  const held = heldScandal(round, active.id);
  const outOfSwaps = active.swapsRemaining <= 0;
  const canSwap = !round.swapUsed && !outOfSwaps && swapTargetIndexes(round).length > 0;

  const gridMode =
    round.turnStep === "picking"
      ? "picking"
      : round.turnStep === "swapping"
        ? "swapping"
        : "idle";

  return (
    <div className="flex min-h-screen flex-col">
      <TurnBanner
        roundNumber={roundNumber(state)}
        categoryName={category}
        activePlayerName={active.playerName}
        turnStep={round.turnStep}
        swapUsed={round.swapUsed}
        swapsRemaining={active.swapsRemaining}
      />

      {round.turnStep === "swapping" ? (
        <div className="flex items-center justify-center gap-3 bg-brass/15 px-4 py-2 text-sm text-paper">
          <span className="font-serif">Tap a glowing case to trade blind.</span>
          <button
            type="button"
            onClick={() => dispatch({ type: "CANCEL_SWAP" })}
            className="rounded border border-paper/40 px-3 py-1 font-semibold hover:bg-paper/10"
          >
            Never mind
          </button>
        </div>
      ) : null}

      <div className="flex flex-1 items-center justify-center px-4 py-6">
        <div className="w-full max-w-3xl">
          <BriefcaseGrid
            round={round}
            players={state.players}
            mode={gridMode}
            onSelect={(index) =>
              dispatch(
                round.turnStep === "swapping"
                  ? { type: "BLIND_SWAP", index }
                  : { type: "TAKE_BRIEFCASE", index },
              )
            }
          />
        </div>
      </div>

      <AnimatePresence>
        {round.turnStep === "deciding" && held ? (
          <motion.div
            className="fixed inset-0 z-30 flex items-start justify-center overflow-y-auto bg-black/70 px-4 py-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="w-full max-w-2xl"
              initial={{ y: 24, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 16, opacity: 0 }}
              transition={{ type: "spring", stiffness: 220, damping: 24 }}
            >
              <NewspaperReveal scandal={held} kicker={kicker} />

              <div className="mx-auto mt-4 flex max-w-2xl flex-col gap-2 sm:flex-row sm:justify-center">
                {round.swapUsed ? (
                  <button
                    type="button"
                    onClick={() => dispatch({ type: "KEEP_SCANDAL" })}
                    className="rounded-lg bg-gop-red px-6 py-3 font-display text-lg font-bold text-white shadow-lg transition hover:brightness-110"
                  >
                    {outOfSwaps
                      ? `Lock it in — ${active.politicianName} is stuck with this (last swap spent)`
                      : `Lock it in — ${active.politicianName} is stuck with this`}
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => dispatch({ type: "KEEP_SCANDAL" })}
                      className="rounded-lg bg-gop-red px-6 py-3 font-display text-lg font-bold text-white shadow-lg transition hover:brightness-110"
                    >
                      Keep this scandal
                    </button>
                    <button
                      type="button"
                      onClick={() => dispatch({ type: "REQUEST_SWAP" })}
                      disabled={!canSwap}
                      className="rounded-lg border-2 border-brass bg-leather px-6 py-3 font-display text-lg font-bold text-paper transition hover:bg-leather/70 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Trade it away — blind
                    </button>
                  </>
                )}
              </div>
              {!round.swapUsed && !canSwap ? (
                <p className="mt-2 text-center font-serif text-sm text-paper/60">
                  {outOfSwaps
                    ? "Both your swaps are spent — you’re locked into whatever you pick from here."
                    : "No sealed cases left to trade for — you’re keeping this one."}
                </p>
              ) : null}
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
