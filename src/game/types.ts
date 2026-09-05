import type { Dispatch } from "react";

export type Phase =
  | "setup"
  | "round-intro"
  | "round-turn"
  | "round-recap"
  | "round-reveal"
  | "round-summary"
  | "end";

export type PlayerId = 0 | 1 | 2;

/** Where the active player is within their turn. */
export type TurnStep = "picking" | "considering" | "deciding" | "swapping";

/** What confirming a considered briefcase will do. */
export type PendingKind = "pick" | "swap";

export interface Player {
  id: PlayerId;
  /** The human at the keyboard. Used for turn prompts. */
  playerName: string;
  /** The name they give the Republican they are building. Used on summaries. */
  politicianName: string;
}

export interface Briefcase {
  /** The scandal this briefcase contains for the whole round (fixed at deal). */
  scandalId: string;
  /** True once it has ever been opened; opened + heldBy === null means discarded. */
  opened: boolean;
  /** The player currently holding this scandal, or null. */
  heldBy: PlayerId | null;
}

export interface RoundState {
  /** 0-based index into the category/round list. */
  categoryIndex: number;
  /** Always length {@link BRIEFCASES_PER_ROUND}. */
  briefcases: Briefcase[];
  /** 0..2 pointer into {@link PLAYER_ORDER}. */
  activePlayerIndex: number;
  turnStep: TurnStep;
  /** True once the active player has used their one blind swap this turn. */
  swapUsed: boolean;
  /**
   * While `turnStep === "considering"`, the briefcase the player clicked but has
   * not yet committed to. `null` in every other step.
   */
  pendingIndex: number | null;
  /**
   * While `turnStep === "considering"`, whether confirming opens the case as a
   * fresh pick or as a blind swap. Meaningless otherwise.
   */
  pendingKind: PendingKind;
  /**
   * During `round-reveal`, the 0-based position in the list of never-opened
   * briefcases currently being shown. Ignored in every other phase.
   */
  revealCursor: number;
}

export interface CompletedResult {
  playerId: PlayerId;
  scandalId: string;
}

export interface CompletedRound {
  categoryIndex: number;
  /** One entry per player, in {@link PLAYER_ORDER}. */
  results: CompletedResult[];
}

export interface GameState {
  phase: Phase;
  /** Length 3 once setup is submitted; [] beforehand. */
  players: Player[];
  /** Rounds that have finished, in play order. */
  rounds: CompletedRound[];
  /** The round in progress, or null between rounds. */
  current: RoundState | null;
  /**
   * Every scandal id dealt into a briefcase this browser session. Persists
   * across PLAY_AGAIN so a scandal is not reused in a later game. Cleared per
   * category by BEGIN_ROUND when that category runs low.
   */
  usedScandalIds: string[];
}

export interface SetupSeat {
  playerName: string;
  politicianName: string;
}

export type Action =
  | { type: "SUBMIT_SETUP"; seats: SetupSeat[] }
  | { type: "BEGIN_ROUND" }
  | { type: "CONSIDER_BRIEFCASE"; index: number }
  | { type: "CANCEL_CONSIDER" }
  | { type: "TAKE_BRIEFCASE"; index: number }
  | { type: "KEEP_SCANDAL" }
  | { type: "REQUEST_SWAP" }
  | { type: "CANCEL_SWAP" }
  | { type: "BLIND_SWAP"; index: number }
  | { type: "REVEAL_UNOPENED" }
  | { type: "NEXT_REVEAL" }
  | { type: "DISMISS_SUMMARY" }
  | { type: "PLAY_AGAIN" };

/** Convenience alias for the reducer dispatch passed down to components. */
export type AppDispatch = Dispatch<Action>;
