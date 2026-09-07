import type { TurnStep } from "../game/types";

interface Props {
  roundNumber: number;
  categoryName: string;
  activePlayerName: string;
  turnStep: TurnStep;
  swapUsed: boolean;
}

function hint(turnStep: TurnStep, swapUsed: boolean): string {
  switch (turnStep) {
    case "picking":
      return "Pick a sealed briefcase.";
    case "deciding":
      return swapUsed
        ? "Your swap is spent — lock in what you got."
        : "Keep this scandal, or trade it away blind.";
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
}: Props) {
  return (
    <div className="sticky top-0 z-20 border-b-2 border-brass/40 bg-leather/95 px-4 py-3 text-center text-paper backdrop-blur">
      <p className="dateline text-base uppercase tracking-[0.2em] text-brass sm:text-xl">
        Round {roundNumber} of 4 · {categoryName}
      </p>
      <p className="mt-1 font-display text-xl font-bold sm:text-2xl">
        <span className="text-brass">{activePlayerName}</span>&rsquo;s turn
      </p>
      <p className="mt-0.5 font-serif text-sm text-paper/80">{hint(turnStep, swapUsed)}</p>
    </div>
  );
}
