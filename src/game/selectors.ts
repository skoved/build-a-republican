import { getScandal, ROUND_COUNT, type Scandal } from "../data/scandals";
import type { GameState, Player, PlayerId, RoundState } from "./types";

/** The player whose turn it is. Assumes a round is in progress. */
export function activePlayer(state: GameState): Player {
  const round = requireRound(state);
  return state.players[round.activePlayerIndex];
}

export function requireRound(state: GameState): RoundState {
  if (!state.current) throw new Error("No round in progress");
  return state.current;
}

/** 1-based round number for display (1..4). */
export function roundNumber(state: GameState): number {
  const index = state.current ? state.current.categoryIndex : state.rounds.length;
  return Math.min(index, ROUND_COUNT - 1) + 1;
}

/** Index of the briefcase a player currently holds this round, or -1. */
export function heldBriefcaseIndex(round: RoundState, playerId: PlayerId): number {
  return round.briefcases.findIndex((b) => b.heldBy === playerId);
}

/** The scandal a player currently holds this round, or null. */
export function heldScandal(round: RoundState, playerId: PlayerId): Scandal | null {
  const index = heldBriefcaseIndex(round, playerId);
  return index === -1 ? null : getScandal(round.briefcases[index].scandalId);
}

/** Briefcase indexes a swapping player may choose (still closed, unheld). */
export function swapTargetIndexes(round: RoundState): number[] {
  return round.briefcases.flatMap((b, i) => (!b.opened && b.heldBy === null ? [i] : []));
}

export interface PlayerBuild {
  player: Player;
  /** One scandal per completed round, in play order. */
  scandals: { categoryIndex: number; scandal: Scandal }[];
}

/** Each player's picks across every completed round — for summary + end screens. */
export function playerBuilds(state: GameState): PlayerBuild[] {
  return state.players.map((player) => ({
    player,
    scandals: state.rounds.map((round) => {
      const result = round.results.find((r) => r.playerId === player.id);
      if (!result) throw new Error(`Missing result for player ${player.id}`);
      return { categoryIndex: round.categoryIndex, scandal: getScandal(result.scandalId) };
    }),
  }));
}
