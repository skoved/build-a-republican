import {
  briefcasesForPlayers,
  MAX_PLAYERS,
  MIN_PLAYERS,
  ROUND_COUNT,
  sampleScandals,
  scandalIdsForCategory,
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
      pendingIndex: null,
      pendingKind: "pick",
      revealCursor: 0,
    },
    usedScandalIds: [...carriedUsed, ...dealtIds],
  };
}

/** Briefcase indexes that were never opened this round (the "unselected" ones). */
function unopenedIndexes(round: RoundState): number[] {
  return round.briefcases.flatMap((b, i) => (b.opened ? [] : [i]));
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
 * round. If any briefcases were never opened, pause on the board (`round-recap`)
 * so a player can start the reveal; otherwise go straight to the summary.
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
        pendingIndex: null,
        pendingKind: "pick",
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

  const hasUnopened = unopenedIndexes(round).length > 0;

  return {
    ...state,
    phase: hasUnopened ? "round-recap" : "round-summary",
    rounds: [...state.rounds, completed],
    current: { ...round, revealCursor: 0 },
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

    case "CONSIDER_BRIEFCASE": {
      const round = state.current;
      if (state.phase !== "round-turn" || !round) return state;
      const from = round.turnStep;
      if (from !== "picking" && from !== "swapping" && from !== "considering") return state;
      const target = round.briefcases[action.index];
      if (!target || target.opened || target.heldBy !== null) return state;
      const pendingKind =
        from === "swapping" ? "swap" : from === "considering" ? round.pendingKind : "pick";
      return {
        ...state,
        current: { ...round, turnStep: "considering", pendingIndex: action.index, pendingKind },
      };
    }

    case "CANCEL_CONSIDER": {
      const round = state.current;
      if (state.phase !== "round-turn" || !round || round.turnStep !== "considering") return state;
      return {
        ...state,
        current: {
          ...round,
          turnStep: round.pendingKind === "swap" ? "swapping" : "picking",
          pendingIndex: null,
        },
      };
    }

    case "TAKE_BRIEFCASE": {
      const round = state.current;
      if (state.phase !== "round-turn" || !round) return state;
      if (round.turnStep !== "considering" || round.pendingKind !== "pick") return state;
      const index = round.pendingIndex ?? action.index;
      const target = round.briefcases[index];
      if (!target || target.opened) return state;
      const player = activePlayerId(round);
      const briefcases = round.briefcases.map((b, i) =>
        i === index ? { ...b, opened: true, heldBy: player } : b,
      );
      return {
        ...state,
        current: {
          ...round,
          briefcases,
          turnStep: "deciding",
          swapUsed: false,
          pendingIndex: null,
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
      if (state.phase !== "round-turn" || !round) return state;
      if (round.turnStep !== "considering" || round.pendingKind !== "swap") return state;
      const index = round.pendingIndex ?? action.index;
      const target = round.briefcases[index];
      if (!target || target.opened || target.heldBy !== null) return state;
      const player = activePlayerId(round);
      const oldIndex = heldIndex(round);
      const briefcases = round.briefcases.map((b, i) => {
        if (i === oldIndex) return { ...b, heldBy: null }; // stays opened -> discarded
        if (i === index) return { ...b, opened: true, heldBy: player };
        return b;
      });
      // Back to "deciding" so the player sees what they got, but their swap is
      // spent: the panel now only offers "Lock it in".
      return {
        ...state,
        current: {
          ...round,
          briefcases,
          turnStep: "deciding",
          swapUsed: true,
          pendingIndex: null,
        },
      };
    }

    case "REVEAL_UNOPENED": {
      const round = state.current;
      if (state.phase !== "round-recap" || !round) return state;
      const hasUnopened = unopenedIndexes(round).length > 0;
      return {
        ...state,
        phase: hasUnopened ? "round-reveal" : "round-summary",
        current: { ...round, revealCursor: 0 },
      };
    }

    case "NEXT_REVEAL": {
      const round = state.current;
      if (state.phase !== "round-reveal" || !round) return state;
      const nextCursor = round.revealCursor + 1;
      if (nextCursor >= unopenedIndexes(round).length) {
        return { ...state, phase: "round-summary" };
      }
      return { ...state, current: { ...round, revealCursor: nextCursor } };
    }

    case "DISMISS_SUMMARY": {
      if (state.phase !== "round-summary") return state;
      if (state.rounds.length >= ROUND_COUNT) {
        return { ...state, phase: "end", current: null };
      }
      return { ...state, phase: "round-intro", current: null };
    }

    case "PLAY_AGAIN": {
      // Keep usedScandalIds so a fresh game avoids scandals already seen. The
      // deck is re-chosen on the setup screen by which start button is clicked.
      return {
        phase: "setup",
        deckId: "standard",
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
