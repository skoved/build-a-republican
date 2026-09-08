import { SWAPS_PER_GAME } from "../data/scandals";
import type { TurnStep } from "../game/types";

interface Props {
  roundNumber: number;
  categoryName: string;
  activePlayerName: string;
  turnStep: TurnStep;
  swapUsed: boolean;
  /** The active player's game-long blind-swap budget. */
  swapsRemaining: number;
}

function hint(turnStep: TurnStep, swapUsed: boolean, swapsRemaining: number): string {
  switch (turnStep) {
    case "picking":
      return "Pick a sealed briefcase.";
    case "deciding":
      if (swapUsed) return "That swap is locked in for this round.";
      if (swapsRemaining <= 0) return "No swaps left — keep what you pick.";
      return "Keep this scandal, or trade it away blind.";
    case "swapping":
      return "Choose a sealed briefcase to trade for — you won't see it until you commit.";
  }
}

export default function TurnBanner({
  roundNumber,
  categoryName,
  activePlayerName,
  turnStep,
  swapUsed,
  swapsRemaining,
}: Props) {
  return (
    <div className="sticky top-0 z-20 border-b-2 border-brass/40 bg-leather/95 px-4 py-3 text-center text-paper backdrop-blur">
      <p className="dateline text-base uppercase tracking-[0.2em] text-brass sm:text-xl">
        Round {roundNumber} of 4 · {categoryName}
      </p>
      <p className="mt-1 break-words font-display text-xl font-bold sm:text-2xl">
        <span className="text-brass">{activePlayerName}</span>&rsquo;s turn
      </p>
      <div className="mt-1 flex items-center justify-center gap-2 text-xs text-paper/70">
        <span className="dateline uppercase tracking-[0.15em]">Blind swaps left</span>
        <span className="flex gap-1" aria-hidden="true">
          {Array.from({ length: SWAPS_PER_GAME }, (_, i) => (
            <span
              key={i}
              className={`inline-block h-2.5 w-2.5 rounded-full border border-brass ${
                i < swapsRemaining ? "bg-brass" : "bg-transparent"
              }`}
            />
          ))}
        </span>
        <span className="sr-only">
          {swapsRemaining} of {SWAPS_PER_GAME} blind swaps left
        </span>
      </div>
      <p className="mt-0.5 font-serif text-sm text-paper/80">
        {hint(turnStep, swapUsed, swapsRemaining)}
      </p>
    </div>
  );
}
