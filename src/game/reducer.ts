import {
  briefcasesForPlayers,
  MAX_PLAYERS,
  MIN_PLAYERS,
  ROUND_COUNT,
  sampleScandals,
  scandalIdsForCategory,
  SWAPS_PER_GAME,
} from "../data/scandals";
import type {
  Action,
  Briefcase,
  CompletedRound,
  DeckId,
  GameState,
  Player,
  PlayerId,
  RoundState,
} from "./types";

export function createInitialState(): GameState {
  return {
    phase: "setup",
    deckId: "standard",
    players: [],
    rounds: [],
    current: null,
    usedScandalIds: [],
    completedGames: 0,
  };
}

function seatsAreComplete(action: Extract<Action, { type: "SUBMIT_SETUP" }>) {
  return (
    action.seats.length >= MIN_PLAYERS &&
    action.seats.length <= MAX_PLAYERS &&
    action.seats.every((s) => s.playerName.trim() !== "" && s.politicianName.trim() !== "")
  );
}

/** Deal a fresh round for `categoryIndex`, returning the new round + used-id list. */
function dealRound(
  categoryIndex: number,
  usedScandalIds: string[],
  playerCount: number,
  deckId: DeckId,
): { round: RoundState; usedScandalIds: string[] } {
  const count = briefcasesForPlayers(playerCount);
  const categoryIds = scandalIdsForCategory(categoryIndex, deckId);
  const categoryIdSet = new Set(categoryIds);
  const unusedInCategory = categoryIds.filter((id) => !usedScandalIds.includes(id));

  // Not enough fresh scandals left in this category -> forget this category's
  // history so the round can still be filled (and future games keep varying).
  const carriedUsed =
    unusedInCategory.length < count
      ? usedScandalIds.filter((id) => !categoryIdSet.has(id))
      : usedScandalIds;

  const dealtIds = sampleScandals(categoryIndex, count, carriedUsed, deckId);
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
  return round.activePlayerIndex as PlayerId;
}

/** Index of the briefcase the active player is currently holding, or -1. */
function heldIndex(round: RoundState): number {
  const player = activePlayerId(round);
  return round.briefcases.findIndex((b) => b.heldBy === player);
}

/**
 * Move to the next player's turn. When the last player has locked in, record the
 * round and go to the summary.
 */
function advanceTurn(state: GameState, round: RoundState): GameState {
  const nextIndex = round.activePlayerIndex + 1;

  if (nextIndex < state.players.length) {
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
    results: state.players.map((player) => {
      const held = round.briefcases.find((b) => b.heldBy === player.id);
      if (!held) throw new Error(`Round ended with no scandal held by player ${player.id}`);
      return { playerId: player.id, scandalId: held.scandalId };
    }),
  };

  return {
    ...state,
    phase: "round-summary",
    rounds: [...state.rounds, completed],
    current: round,
  };
}

export function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case "SUBMIT_SETUP": {
      if (state.phase !== "setup" || !seatsAreComplete(action)) return state;
      const players: Player[] = action.seats.map((seat, i) => ({
        id: i as PlayerId,
        playerName: seat.playerName.trim(),
        politicianName: seat.politicianName.trim(),
        swapsRemaining: SWAPS_PER_GAME,
      }));
      return {
        ...state,
        phase: "round-intro",
        deckId: action.deckId ?? "standard",
        players,
        rounds: [],
        current: null,
      };
    }

    case "BEGIN_ROUND": {
      if (state.phase !== "round-intro") return state;
      const categoryIndex = state.rounds.length;
      if (categoryIndex >= ROUND_COUNT) return state;
      const { round, usedScandalIds } = dealRound(
        categoryIndex,
        state.usedScandalIds,
        state.players.length,
        state.deckId,
      );
      return { ...state, phase: "round-turn", current: round, usedScandalIds };
    }

    case "TAKE_BRIEFCASE": {
      const round = state.current;
      if (state.phase !== "round-turn" || !round || round.turnStep !== "picking") return state;
      const target = round.briefcases[action.index];
      if (!target || target.opened || target.heldBy !== null) return state;
      const player = activePlayerId(round);
      const briefcases = round.briefcases.map((b, i) =>
        i === action.index ? { ...b, opened: true, heldBy: player } : b,
      );
      return {
        ...state,
        current: {
          ...round,
          briefcases,
          turnStep: "deciding",
          swapUsed: false,
        },
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
      if (state.players[round.activePlayerIndex].swapsRemaining <= 0) return state;
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
      const index = action.index;
      const target = round.briefcases[index];
      if (!target || target.opened || target.heldBy !== null) return state;
      const player = activePlayerId(round);
      const oldIndex = heldIndex(round);
      const briefcases = round.briefcases.map((b, i) => {
        if (i === oldIndex) return { ...b, heldBy: null }; // stays opened -> discarded
        if (i === index) return { ...b, opened: true, heldBy: player };
        return b;
      });
      // Spend one of the player's game-long swaps.
      const players = state.players.map((p) =>
        p.id === player ? { ...p, swapsRemaining: p.swapsRemaining - 1 } : p,
      );
      // Back to "deciding" so the player sees what they got, but their swap for
      // this turn is spent: the panel now only offers "Lock it in".
      return {
        ...state,
        players,
        current: {
          ...round,
          briefcases,
          turnStep: "deciding",
          swapUsed: true,
        },
      };
    }

    case "DISMISS_SUMMARY": {
      if (state.phase !== "round-summary") return state;
      if (state.rounds.length >= ROUND_COUNT) {
        return {
          ...state,
          phase: "end",
          current: null,
          // Count only standard-deck games — they're what draws a bonus candidate.
          completedGames:
            state.deckId === "standard" ? state.completedGames + 1 : state.completedGames,
        };
      }
      return { ...state, phase: "round-intro", current: null };
    }

    case "PLAY_AGAIN": {
      // Keep usedScandalIds so a fresh game avoids scandals already seen, and
      // completedGames so replays keep advancing the bonus candidate. The deck
      // is re-chosen on the setup screen by which start button is clicked.
      return {
        phase: "setup",
        deckId: "standard",
        players: [],
        rounds: [],
        current: null,
        usedScandalIds: state.usedScandalIds,
        completedGames: state.completedGames,
      };
    }

    default:
      return state;
  }
}
