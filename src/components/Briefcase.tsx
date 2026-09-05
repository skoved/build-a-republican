import { motion } from "framer-motion";

export type BriefcaseVisual = "closed" | "held" | "discarded";

interface Props {
  /** 1-based label shown on the case. */
  number: number;
  visual: BriefcaseVisual;
  /** Whether clicking does anything right now. */
  interactive: boolean;
  /** Draw attention to this case (valid swap target). */
  highlight?: boolean;
  /** Politician name of the holder, shown on a held case. */
  holderName?: string;
  /** Shared-layout id, so the case can morph between the grid and an overlay. */
  layoutId?: string;
  onClick?: () => void;
}

export default function Briefcase({
  number,
  visual,
  interactive,
  highlight = false,
  holderName,
  layoutId,
  onClick,
}: Props) {
  const isOpen = visual !== "closed";

  return (
    <motion.button
      type="button"
      layoutId={layoutId}
      disabled={!interactive}
      onClick={onClick}
      aria-label={
        visual === "closed"
          ? `Sealed briefcase ${number}`
          : visual === "discarded"
            ? `Discarded scandal (briefcase ${number})`
            : `Briefcase ${number}, held`
      }
      className={[
        "relative aspect-[4/3] w-full select-none rounded-lg p-3 text-left transition-shadow",
        "briefcase-skin shadow-case",
        interactive ? "cursor-pointer" : "cursor-default",
        highlight ? "swap-target ring-4 ring-brass ring-offset-2 ring-offset-gop-blue" : "",
        visual === "discarded" ? "opacity-40 grayscale" : "",
      ].join(" ")}
      initial={false}
      whileHover={interactive ? { y: -6, scale: 1.02 } : undefined}
      whileTap={interactive ? { scale: 0.97 } : undefined}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
    >
      {/* Handle */}
      <span className="absolute left-1/2 top-1 h-3 w-14 -translate-x-1/2 rounded-t-md border-2 border-brass/70" />

      {!isOpen ? (
        <span className="flex h-full flex-col items-center justify-center gap-2">
          {/* Latches */}
          <span className="absolute left-4 top-1/2 h-4 w-6 -translate-y-1/2 rounded-sm bg-brass/80" />
          <span className="absolute right-4 top-1/2 h-4 w-6 -translate-y-1/2 rounded-sm bg-brass/80" />
          <span className="rounded bg-black/40 px-3 py-1 font-display text-3xl font-black text-brass">
            {number}
          </span>
          <span className="dateline text-[0.6rem] uppercase tracking-[0.2em] text-brass/70">
            Sealed
          </span>
        </span>
      ) : (
        <motion.span
          className="flex h-full flex-col items-center justify-center gap-1"
          initial={{ rotateX: -80, opacity: 0 }}
          animate={{ rotateX: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          style={{ transformPerspective: 500 }}
        >
          <span className="paper flex w-[85%] flex-col items-center rounded-sm border border-black/20 px-2 py-2">
            <span className="headline text-[0.55rem] leading-tight text-ink">
              {visual === "discarded" ? "Spiked" : "Extra! Extra!"}
            </span>
            <span className="mt-0.5 h-0.5 w-8 bg-black/50" />
            <span className="mt-1 space-y-0.5">
              <span className="block h-0.5 w-16 bg-black/25" />
              <span className="block h-0.5 w-14 bg-black/25" />
              <span className="block h-0.5 w-16 bg-black/25" />
            </span>
          </span>
          {visual === "held" && holderName ? (
            <span className="max-w-full truncate rounded bg-gop-red px-2 py-0.5 text-[0.6rem] font-semibold text-white">
              {holderName}
            </span>
          ) : null}
          {visual === "discarded" ? (
            <span className="dateline text-[0.6rem] uppercase tracking-[0.2em] text-white/70">
              Discarded
            </span>
          ) : null}
        </motion.span>
      )}
    </motion.button>
  );
}
