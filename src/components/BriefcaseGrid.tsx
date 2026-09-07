import type { Player, RoundState } from "../game/types";
import Briefcase, { type BriefcaseVisual } from "./Briefcase";

interface Props {
  round: RoundState;
  players: Player[];
  /**
   * "picking": closed cases selectable. "swapping": only unheld closed cases.
   * "idle": nothing is selectable.
   */
  mode: "picking" | "swapping" | "idle";
  onSelect: (index: number) => void;
}

function visualFor(b: RoundState["briefcases"][number]): BriefcaseVisual {
  if (!b.opened) return "closed";
  return b.heldBy === null ? "discarded" : "held";
}

export default function BriefcaseGrid({ round, players, mode, onSelect }: Props) {
  return (
    <div
      className={`grid grid-cols-2 gap-3 sm:gap-4 ${
        round.briefcases.length === 8 ? "sm:grid-cols-4" : "sm:grid-cols-3"
      }`}
    >
      {round.briefcases.map((b, i) => {
        const isSealed = !b.opened && b.heldBy === null;

        const visual = visualFor(b);
        const isSwapTarget = isSealed;
        const interactive =
          (mode === "picking" && !b.opened) || (mode === "swapping" && isSwapTarget);
        const holderName =
          b.heldBy === null ? undefined : players[b.heldBy]?.politicianName;

        return (
          <Briefcase
            key={i}
            number={i + 1}
            visual={visual}
            interactive={interactive}
            highlight={mode === "swapping" && isSwapTarget}
            holderName={holderName}
            layoutId={mode === "idle" ? undefined : `case-${i}`}
            onClick={interactive ? () => onSelect(i) : undefined}
          />
        );
      })}
    </div>
  );
}
