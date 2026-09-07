import type { Dispatch } from "react";
import type { DeckId } from "../data/scandals";

export type { DeckId };

export type Phase = "setup" | "round-intro" | "round-turn" | "round-summary" | "end";

export type PlayerId = 0 | 1 | 2 | 3;

/** Where the active player is within their turn. */
export type TurnStep = "picking" | "deciding" | "swapping";

export interface Player {
  id: PlayerId;
  /** The human at the keyboard. Used for turn prompts. */
  playerName: string;
  /** The name they give the Republican they are building. Used on summaries. */
  politicianName: string;
  /**
   * Blind swaps this player has left for the whole game. Starts at
   * `SWAPS_PER_GAME`; `BLIND_SWAP` decrements it. At 0 the player can never swap
   * again this game.
   */
  swapsRemaining: number;
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
  /** Always length `players.length * BRIEFCASES_PER_PLAYER` (6 for 3, 8 for 4). */
  briefcases: Briefcase[];
  /** 0-based turn pointer; equals the active player's id (seats are 0..n-1). */
  activePlayerIndex: number;
  turnStep: TurnStep;
  /**
   * True once the active player has spent a swap on THIS turn — one swap per
   * turn, independent of their game-long `Player.swapsRemaining` budget. Reset
   * every turn.
   */
  swapUsed: boolean;
}

export interface CompletedResult {
  playerId: PlayerId;
  scandalId: string;
}

export interface CompletedRound {
  categoryIndex: number;
  /** One entry per player, in seat order. */
  results: CompletedResult[];
}

export interface GameState {
  phase: Phase;
  /** Which scandal pool this game draws from. Chosen at SUBMIT_SETUP. */
  deckId: DeckId;
  /** Length 3–4 once setup is submitted; [] beforehand. */
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
  /**
   * Standard-deck games finished this session. Selects which bonus candidate the
   * end screen shows (game 1 -> #1, first replay -> #2, …). Persists across
   * PLAY_AGAIN; reset only on page reload. Trump-deck games do not increment it.
   */
  completedGames: number;
}

export interface SetupSeat {
  playerName: string;
  politicianName: string;
}

export type Action =
  | { type: "SUBMIT_SETUP"; seats: SetupSeat[]; deckId?: DeckId }
  | { type: "BEGIN_ROUND" }
  | { type: "TAKE_BRIEFCASE"; index: number }
  | { type: "KEEP_SCANDAL" }
  | { type: "REQUEST_SWAP" }
  | { type: "CANCEL_SWAP" }
  | { type: "BLIND_SWAP"; index: number }
  | { type: "DISMISS_SUMMARY" }
  | { type: "PLAY_AGAIN" };

/** Convenience alias for the reducer dispatch passed down to components. */
export type AppDispatch = Dispatch<Action>;
