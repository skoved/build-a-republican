import type { Player, RoundState } from "../game/types";
import Briefcase, { type BriefcaseVisual } from "./Briefcase";

interface Props {
  round: RoundState;
  players: Player[];
  /**
   * "picking": closed cases selectable. "swapping": only unheld closed cases.
   * "considering": the pending case is lifted into an overlay (rendered as a
   * placeholder here); other unheld closed cases stay clickable to re-target.
   */
  mode: "picking" | "swapping" | "considering" | "idle";
  /** The briefcase currently lifted into the confirm overlay, if any. */
  consideringIndex?: number | null;
  onSelect: (index: number) => void;
}

function visualFor(b: RoundState["briefcases"][number]): BriefcaseVisual {
  if (!b.opened) return "closed";
  return b.heldBy === null ? "discarded" : "held";
}

export default function BriefcaseGrid({
  round,
  players,
  mode,
  consideringIndex = null,
  onSelect,
}: Props) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
      {round.briefcases.map((b, i) => {
        const isSealed = !b.opened && b.heldBy === null;

        // The considered case lives in the overlay; keep its slot to hold layout.
        if (mode === "considering" && i === consideringIndex) {
          return <div key={i} className="aspect-[4/3] w-full rounded-lg" aria-hidden />;
        }

        const visual = visualFor(b);
        const isSwapTarget = isSealed;
        const interactive =
          (mode === "picking" && !b.opened) ||
          (mode === "swapping" && isSwapTarget) ||
          (mode === "considering" && isSwapTarget);
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
