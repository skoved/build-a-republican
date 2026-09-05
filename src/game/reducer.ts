import {
  BRIEFCASES_PER_ROUND,
  ROUND_COUNT,
  sampleSix,
  scandalIdsForCategory,
} from "../data/scandals";
import type {
  Action,
  Briefcase,
  CompletedRound,
  GameState,
  Player,
  PlayerId,
  RoundState,
} from "./types";

/** Fixed seating / turn order for every round. */
export const PLAYER_ORDER: readonly PlayerId[] = [0, 1, 2] as const;

export function createInitialState(): GameState {
  return {
    phase: "setup",
    players: [],
    rounds: [],
    current: null,
    usedScandalIds: [],
  };
}

function seatsAreComplete(action: Extract<Action, { type: "SUBMIT_SETUP" }>) {
  return (
    action.seats.length === PLAYER_ORDER.length &&
    action.seats.every((s) => s.playerName.trim() !== "" && s.politicianName.trim() !== "")
  );
}

/** Deal a fresh round for `categoryIndex`, returning the new round + used-id list. */
function dealRound(
  categoryIndex: number,
  usedScandalIds: string[],
): { round: RoundState; usedScandalIds: string[] } {
  const categoryIds = scandalIdsForCategory(categoryIndex);
  const categoryIdSet = new Set(categoryIds);
  const unusedInCategory = categoryIds.filter((id) => !usedScandalIds.includes(id));

  // Not enough fresh scandals left in this category -> forget this category's
  // history so the round can still be filled (and future games keep varying).
  const carriedUsed =
    unusedInCategory.length < BRIEFCASES_PER_ROUND
      ? usedScandalIds.filter((id) => !categoryIdSet.has(id))
      : usedScandalIds;

  const dealtIds = sampleSix(categoryIndex, carriedUsed);
  const briefcases: Briefcase[] = dealtIds.map((scandalId) => ({
    scandalId,
    opened: false,
    heldBy: null,
  }));

  return {
    round: {
      categoryIndex,
      briefcases,
      activePlayerIndex: 0,
      turnStep: "picking",
      swapUsed: false,
    },
    usedScandalIds: [...carriedUsed, ...dealtIds],
  };
}

function activePlayerId(round: RoundState): PlayerId {
  return PLAYER_ORDER[round.activePlayerIndex];
}

/** Index of the briefcase the active player is currently holding, or -1. */
function heldIndex(round: RoundState): number {
  const player = activePlayerId(round);
  return round.briefcases.findIndex((b) => b.heldBy === player);
}

/**
 * Move to the next player's turn. When the last player has locked in, record the
 * round and switch to the summary.
 */
function advanceTurn(state: GameState, round: RoundState): GameState {
  const nextIndex = round.activePlayerIndex + 1;

  if (nextIndex < PLAYER_ORDER.length) {
    return {
      ...state,
      current: {
        ...round,
        activePlayerIndex: nextIndex,
        turnStep: "picking",
        swapUsed: false,
      },
    };
  }

  const completed: CompletedRound = {
    categoryIndex: round.categoryIndex,
    results: PLAYER_ORDER.map((playerId) => {
      const held = round.briefcases.find((b) => b.heldBy === playerId);
      if (!held) throw new Error(`Round ended with no scandal held by player ${playerId}`);
      return { playerId, scandalId: held.scandalId };
    }),
  };

  return {
    ...state,
    phase: "round-summary",
    rounds: [...state.rounds, completed],
    current: { ...round },
  };
}

export function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case "SUBMIT_SETUP": {
      if (state.phase !== "setup" || !seatsAreComplete(action)) return state;
      const players: Player[] = PLAYER_ORDER.map((id) => ({
        id,
        playerName: action.seats[id].playerName.trim(),
        politicianName: action.seats[id].politicianName.trim(),
      }));
      return { ...state, phase: "round-intro", players, rounds: [], current: null };
    }

    case "BEGIN_ROUND": {
      if (state.phase !== "round-intro") return state;
      const categoryIndex = state.rounds.length;
      if (categoryIndex >= ROUND_COUNT) return state;
      const { round, usedScandalIds } = dealRound(categoryIndex, state.usedScandalIds);
      return { ...state, phase: "round-turn", current: round, usedScandalIds };
    }

    case "TAKE_BRIEFCASE": {
      const round = state.current;
      if (state.phase !== "round-turn" || !round || round.turnStep !== "picking") return state;
      const target = round.briefcases[action.index];
      if (!target || target.opened) return state;
      const player = activePlayerId(round);
      const briefcases = round.briefcases.map((b, i) =>
        i === action.index ? { ...b, opened: true, heldBy: player } : b,
      );
      return {
        ...state,
        current: { ...round, briefcases, turnStep: "deciding", swapUsed: false },
      };
    }

    case "KEEP_SCANDAL": {
      const round = state.current;
      if (state.phase !== "round-turn" || !round || round.turnStep !== "deciding") return state;
      return advanceTurn(state, round);
    }

    case "REQUEST_SWAP": {
      const round = state.current;
      if (state.phase !== "round-turn" || !round || round.turnStep !== "deciding") return state;
      if (round.swapUsed) return state;
      const hasTarget = round.briefcases.some((b) => !b.opened && b.heldBy === null);
      if (!hasTarget) return state;
      return { ...state, current: { ...round, turnStep: "swapping" } };
    }

    case "CANCEL_SWAP": {
      const round = state.current;
      if (state.phase !== "round-turn" || !round || round.turnStep !== "swapping") return state;
      return { ...state, current: { ...round, turnStep: "deciding" } };
    }

    case "BLIND_SWAP": {
      const round = state.current;
      if (state.phase !== "round-turn" || !round || round.turnStep !== "swapping") return state;
      const target = round.briefcases[action.index];
      if (!target || target.opened || target.heldBy !== null) return state;
      const player = activePlayerId(round);
      const oldIndex = heldIndex(round);
      const briefcases = round.briefcases.map((b, i) => {
        if (i === oldIndex) return { ...b, heldBy: null }; // stays opened -> discarded
        if (i === action.index) return { ...b, opened: true, heldBy: player };
        return b;
      });
      // Back to "deciding" so the player sees what they got, but their swap is
      // spent: the panel now only offers "Lock it in".
      return {
        ...state,
        current: { ...round, briefcases, turnStep: "deciding", swapUsed: true },
      };
    }

    case "DISMISS_SUMMARY": {
      if (state.phase !== "round-summary") return state;
      if (state.rounds.length >= ROUND_COUNT) {
        return { ...state, phase: "end", current: null };
      }
      return { ...state, phase: "round-intro", current: null };
    }

    case "PLAY_AGAIN": {
      // Keep usedScandalIds so a fresh game avoids scandals already seen.
      return {
        phase: "setup",
        players: [],
        rounds: [],
        current: null,
        usedScandalIds: state.usedScandalIds,
      };
    }

    default:
      return state;
  }
}
