import { describe, expect, it } from "vitest";
import {
  briefcasesForPlayers,
  ROUND_COUNT,
  scandalIdsForCategory,
  SWAPS_PER_GAME,
} from "../data/scandals";
import { bonusCandidateForGame } from "../data/bonusCandidates";
import { candidateNameFor, candidateNames } from "../data/candidateNames";
import { createInitialState, reducer } from "../game/reducer";
import type { DeckId, GameState } from "../game/types";

const SEATS = [
  { playerName: "Ada" },
  { playerName: "Ben" },
  { playerName: "Cal" },
];

const SEATS_4 = [...SEATS, { playerName: "Dot" }];

/** Briefcases dealt for a 3-player table (6) and a 4-player table (8). */
const SIX = briefcasesForPlayers(3);
const EIGHT = briefcasesForPlayers(4);

function firstClosedIndex(state: GameState): number {
  const round = state.current!;
  return round.briefcases.findIndex((b) => !b.opened);
}

/** Open a sealed briefcase as a fresh pick. */
function take(state: GameState, index: number): GameState {
  return reducer(state, { type: "TAKE_BRIEFCASE", index });
}

/** Commit a blind swap into a sealed briefcase. */
function blindSwap(state: GameState, index: number): GameState {
  return reducer(state, { type: "BLIND_SWAP", index });
}

/** Play one round where every player just keeps their first pick. */
function playRoundKeepingPicks(state: GameState): GameState {
  let next = reducer(state, { type: "BEGIN_ROUND" });
  for (let p = 0; p < state.players.length; p++) {
    next = take(next, firstClosedIndex(next));
    next = reducer(next, { type: "KEEP_SCANDAL" });
  }
  // The last lock-in lands straight on the round summary.
  return reducer(next, { type: "DISMISS_SUMMARY" });
}

function playFullGame(state: GameState): GameState {
  let next = state;
  for (let r = 0; r < ROUND_COUNT; r++) next = playRoundKeepingPicks(next);
  return next;
}

function startedGame(seats = SEATS, deckId?: DeckId): GameState {
  return reducer(createInitialState(), { type: "SUBMIT_SETUP", seats, deckId });
}

describe("setup", () => {
  it("moves to round-intro with 3 players when all seats are filled", () => {
    const state = startedGame();
    expect(state.phase).toBe("round-intro");
    expect(state.players).toHaveLength(3);
    expect(state.players[1].playerName).toBe("Ben");
  });

  it("names each player's Republican from candidate-names.yaml, a block of 4 per game", () => {
    // A 4-player game fills its whole block of 4 slots.
    const g1 = startedGame(SEATS_4);
    expect(g1.players.map((p) => p.politicianName)).toEqual([
      candidateNameFor(0, 0),
      candidateNameFor(0, 1),
      candidateNameFor(0, 2),
      candidateNameFor(0, 3),
    ]);
    // A 3-player game uses slots 0–2 and leaves slot 3 (the 4th name) unused.
    const g1three = startedGame(SEATS);
    expect(g1three.players.map((p) => p.politicianName)).toEqual(
      candidateNames.slice(0, 3),
    );
    expect(g1three.gamesStarted).toBe(1);

    // A replay advances to the next block of 4, whatever the first game's size.
    const replay = reducer(reducer(g1three, { type: "PLAY_AGAIN" }), {
      type: "SUBMIT_SETUP",
      seats: SEATS,
    });
    expect(replay.players[0].politicianName).toBe(candidateNameFor(1, 0));
  });

  it("gives every player their full swap budget for the game", () => {
    const state = startedGame();
    expect(state.players.every((p) => p.swapsRemaining === SWAPS_PER_GAME)).toBe(true);
  });

  it("ignores setup when a seat is blank", () => {
    const state = reducer(createInitialState(), {
      type: "SUBMIT_SETUP",
      seats: [SEATS[0], SEATS[1], { playerName: "  " }],
    });
    expect(state.phase).toBe("setup");
    expect(state.players).toHaveLength(0);
  });

  it("ignores setup when a name is only invisible characters", () => {
    const invisible = String.fromCodePoint(0x200b) + String.fromCodePoint(0x202e);
    const state = reducer(createInitialState(), {
      type: "SUBMIT_SETUP",
      seats: [SEATS[0], SEATS[1], { playerName: invisible }],
    });
    expect(state.phase).toBe("setup");
    expect(state.players).toHaveLength(0);
  });

  it("sanitizes player names into stored state", () => {
    const rlo = String.fromCodePoint(0x202e);
    const state = reducer(createInitialState(), {
      type: "SUBMIT_SETUP",
      seats: [
        { playerName: `  ${rlo}Ada${rlo}  ` },
        { playerName: "x".repeat(100) },
        { playerName: "<script>alert(1)</script>" },
      ],
    });
    expect(state.phase).toBe("round-intro");
    expect(state.players[0].playerName).toBe("Ada");
    expect(state.players[1].playerName).toHaveLength(24);
    // Markup is stored verbatim as text (trimmed/capped) — it is data, never HTML.
    expect(state.players[2].playerName).toBe("<script>alert(1)</script>".slice(0, 24));
  });

  it("accepts a 4-player table", () => {
    const state = startedGame(SEATS_4);
    expect(state.phase).toBe("round-intro");
    expect(state.players).toHaveLength(4);
    expect(state.players[3].politicianName).toBe(candidateNameFor(0, 3));
  });

  it("rejects tables outside 3–4 players", () => {
    const two = reducer(createInitialState(), { type: "SUBMIT_SETUP", seats: SEATS.slice(0, 2) });
    expect(two.phase).toBe("setup");
    const five = reducer(createInitialState(), {
      type: "SUBMIT_SETUP",
      seats: [...SEATS_4, { playerName: "Eve" }],
    });
    expect(five.phase).toBe("setup");
  });
});

describe("opening a briefcase", () => {
  it("TAKE_BRIEFCASE opens the clicked case and moves to the decide step", () => {
    let state = reducer(startedGame(), { type: "BEGIN_ROUND" });
    state = reducer(state, { type: "TAKE_BRIEFCASE", index: 0 });
    expect(state.current?.turnStep).toBe("deciding");
    expect(state.current?.briefcases[0].opened).toBe(true);
    expect(state.current?.briefcases[0].heldBy).toBe(0);
  });

  it("TAKE_BRIEFCASE is ignored for a case that is already opened or held", () => {
    let state = reducer(startedGame(), { type: "BEGIN_ROUND" });
    state = reducer(state, { type: "TAKE_BRIEFCASE", index: 0 });
    state = reducer(state, { type: "KEEP_SCANDAL" }); // player 0 locks in, player 1 up

    const blocked = reducer(state, { type: "TAKE_BRIEFCASE", index: 0 });
    expect(blocked.current?.briefcases[0].heldBy).toBe(0); // still player 0's
    expect(blocked.current?.turnStep).toBe("picking");
  });

  it("TAKE_BRIEFCASE is ignored outside the picking step", () => {
    let state = reducer(startedGame(), { type: "BEGIN_ROUND" });
    state = reducer(state, { type: "TAKE_BRIEFCASE", index: 0 });
    expect(state.current?.turnStep).toBe("deciding");

    const blocked = reducer(state, { type: "TAKE_BRIEFCASE", index: 1 });
    expect(blocked.current?.turnStep).toBe("deciding");
    expect(blocked.current?.briefcases[1].opened).toBe(false);
  });
});

describe("round turn flow", () => {
  it("deals 6 briefcases and records them as used", () => {
    const state = reducer(startedGame(), { type: "BEGIN_ROUND" });
    expect(state.phase).toBe("round-turn");
    expect(state.current?.briefcases).toHaveLength(SIX);
    expect(state.usedScandalIds).toHaveLength(SIX);
  });

  it("deals 8 briefcases for a 4-player table", () => {
    const state = reducer(startedGame(SEATS_4), { type: "BEGIN_ROUND" });
    expect(state.current?.briefcases).toHaveLength(EIGHT);
    expect(state.usedScandalIds).toHaveLength(EIGHT);
  });

  it("KEEP_SCANDAL advances players and ends the round after the last", () => {
    const state = playRoundKeepingPicks(startedGame());
    // DISMISS_SUMMARY was applied at the end -> back to round-intro for round 2.
    expect(state.phase).toBe("round-intro");
    expect(state.rounds).toHaveLength(1);
    expect(state.rounds[0].results).toHaveLength(3);
    const ownedIds = state.rounds[0].results.map((r) => r.scandalId);
    expect(new Set(ownedIds).size).toBe(3);
  });

  it("runs a full 4-player round: 4 picks, then straight to the summary", () => {
    let state = reducer(startedGame(SEATS_4), { type: "BEGIN_ROUND" });
    for (let p = 0; p < 4; p++) {
      state = take(state, firstClosedIndex(state));
      state = reducer(state, { type: "KEEP_SCANDAL" });
    }
    expect(state.phase).toBe("round-summary");
    expect(state.current?.briefcases.filter((b) => b.opened)).toHaveLength(4);
    expect(state.rounds[0].results).toHaveLength(4);
  });

  it("BLIND_SWAP discards the old scandal, keeps the new one, and spends the swap", () => {
    let state = reducer(startedGame(), { type: "BEGIN_ROUND" });
    state = take(state, 0);
    const firstScandal = state.current!.briefcases[0].scandalId;
    state = reducer(state, { type: "REQUEST_SWAP" });
    expect(state.current?.turnStep).toBe("swapping");
    state = blindSwap(state, 3);

    const round = state.current!;
    expect(round.turnStep).toBe("deciding");
    expect(round.swapUsed).toBe(true);
    expect(state.players[0].swapsRemaining).toBe(SWAPS_PER_GAME - 1); // one spent
    expect(round.briefcases[0]).toMatchObject({ opened: true, heldBy: null }); // discarded
    expect(round.briefcases[3]).toMatchObject({ opened: true, heldBy: 0 });
    expect(round.briefcases[3].scandalId).not.toBe(firstScandal);

    // A second swap this turn is refused now that swapUsed is set, even though
    // the player still has budget left for a later round.
    const blocked = reducer(state, { type: "REQUEST_SWAP" });
    expect(blocked.current?.turnStep).toBe("deciding");
  });

  it("gives each player two swaps for the whole game, then locks them out", () => {
    // Run one round: player 0 spends a swap, everyone else just keeps.
    function roundWithPlayerZeroSwap(start: GameState): GameState {
      let s = reducer(start, { type: "BEGIN_ROUND" });
      s = take(s, firstClosedIndex(s));
      s = reducer(s, { type: "REQUEST_SWAP" });
      s = blindSwap(s, s.current!.briefcases.findIndex((b) => !b.opened && b.heldBy === null));
      s = reducer(s, { type: "KEEP_SCANDAL" }); // player 0 locks in
      for (let p = 1; p < start.players.length; p++) {
        s = take(s, firstClosedIndex(s));
        s = reducer(s, { type: "KEEP_SCANDAL" });
      }
      return reducer(s, { type: "DISMISS_SUMMARY" });
    }

    let state = startedGame();
    state = roundWithPlayerZeroSwap(state);
    expect(state.players[0].swapsRemaining).toBe(1);

    state = roundWithPlayerZeroSwap(state);
    expect(state.players[0].swapsRemaining).toBe(0);

    // Round 3: player 0 is out of swaps — REQUEST_SWAP is a no-op.
    state = reducer(state, { type: "BEGIN_ROUND" });
    state = take(state, firstClosedIndex(state));
    expect(state.current?.turnStep).toBe("deciding");
    const blocked = reducer(state, { type: "REQUEST_SWAP" });
    expect(blocked.current?.turnStep).toBe("deciding");
    expect(blocked.players[0].swapsRemaining).toBe(0);
  });

  it("a discarded scandal cannot be chosen by a later player", () => {
    let state = reducer(startedGame(), { type: "BEGIN_ROUND" });
    state = take(state, 0);
    state = reducer(state, { type: "REQUEST_SWAP" });
    state = blindSwap(state, 1);
    state = reducer(state, { type: "KEEP_SCANDAL" }); // player 0 locks in

    // player 1 tries to open the discarded case 0
    const attempt = reducer(state, { type: "TAKE_BRIEFCASE", index: 0 });
    expect(attempt.current?.turnStep).toBe("picking");
    expect(attempt.current?.briefcases[0]).toMatchObject({ opened: true, heldBy: null });
  });
});

describe("end of round", () => {
  it("goes straight to the round summary once the last player locks in", () => {
    let state = reducer(startedGame(), { type: "BEGIN_ROUND" });
    for (let p = 0; p < 3; p++) {
      state = take(state, firstClosedIndex(state));
      state = reducer(state, { type: "KEEP_SCANDAL" });
    }

    // Every player kept their pick, so half the briefcases stay unopened — and
    // there is no recap/reveal for them any more.
    expect(state.phase).toBe("round-summary");
    expect(state.rounds).toHaveLength(1);
    expect(state.rounds[0].results).toHaveLength(3);
    expect(state.current?.briefcases.some((b) => !b.opened)).toBe(true);
  });
});

describe("full game + replays", () => {
  it("completes 4 rounds and reaches the end screen", () => {
    const state = playFullGame(startedGame());
    expect(state.rounds).toHaveLength(ROUND_COUNT);
    expect(state.phase).toBe("end");
  });

  it("never reuses a scandal across back-to-back games (pool = 2 games)", () => {
    const game1 = playFullGame(startedGame());
    const seenGame1 = new Set(game1.usedScandalIds);

    const replay = reducer(reducer(game1, { type: "PLAY_AGAIN" }), {
      type: "SUBMIT_SETUP",
      seats: SEATS,
    });
    const game2 = playFullGame(replay);
    const dealtGame2 = game2.usedScandalIds.slice(seenGame1.size);

    expect(dealtGame2).toHaveLength(ROUND_COUNT * SIX);
    for (const id of dealtGame2) expect(seenGame1.has(id)).toBe(false);
  });

  it("PLAY_AGAIN resets the game but keeps the used-scandal memory", () => {
    const finished = playFullGame(startedGame());
    const again = reducer(finished, { type: "PLAY_AGAIN" });
    expect(again.phase).toBe("setup");
    expect(again.players).toHaveLength(0);
    expect(again.rounds).toHaveLength(0);
    expect(again.current).toBeNull();
    expect(again.usedScandalIds).toEqual(finished.usedScandalIds);
    expect(again.completedGames).toBe(finished.completedGames);
    expect(again.gamesStarted).toBe(finished.gamesStarted);
    expect(finished.gamesStarted).toBe(1);
  });

  it("resets a category's history when it can no longer fill a round", () => {
    const catIds = scandalIdsForCategory(0);
    // Pretend all but 2 scandals of round 1's category are already used.
    const primed: GameState = {
      ...startedGame(),
      usedScandalIds: catIds.slice(0, catIds.length - 2),
    };
    const dealt = reducer(primed, { type: "BEGIN_ROUND" });
    expect(dealt.current?.briefcases).toHaveLength(SIX);
    // History for the category was cleared, then the fresh deal recorded.
    expect(dealt.usedScandalIds).toHaveLength(SIX);
  });
});

describe("trump deck", () => {
  const isTrumpId = (id: string) => id.startsWith("t-");

  it("defaults to the standard deck", () => {
    expect(createInitialState().deckId).toBe("standard");
    expect(startedGame().deckId).toBe("standard");
  });

  it("SUBMIT_SETUP with deckId 'trump' records the deck", () => {
    const state = startedGame(SEATS, "trump");
    expect(state.phase).toBe("round-intro");
    expect(state.deckId).toBe("trump");
  });

  it("deals a trump round entirely from trump.yaml", () => {
    const state = reducer(startedGame(SEATS, "trump"), { type: "BEGIN_ROUND" });
    expect(state.current?.briefcases).toHaveLength(SIX);
    expect(state.current?.briefcases.every((b) => isTrumpId(b.scandalId))).toBe(true);
  });

  it("keeps the standard deck free of trump scandals", () => {
    const state = reducer(startedGame(), { type: "BEGIN_ROUND" });
    expect(state.current?.briefcases.some((b) => isTrumpId(b.scandalId))).toBe(false);
  });

  it("plays a full trump game to the end screen", () => {
    const finished = playFullGame(startedGame(SEATS, "trump"));
    expect(finished.phase).toBe("end");
    const dealt = finished.usedScandalIds;
    expect(dealt).toHaveLength(ROUND_COUNT * SIX);
    expect(dealt.every(isTrumpId)).toBe(true);
  });

  it("PLAY_AGAIN drops back to the standard deck", () => {
    const finished = playFullGame(startedGame(SEATS, "trump"));
    expect(reducer(finished, { type: "PLAY_AGAIN" }).deckId).toBe("standard");
  });
});

describe("bonus candidates", () => {
  it("starts a session with no completed games", () => {
    expect(createInitialState().completedGames).toBe(0);
    expect(createInitialState().gamesStarted).toBe(0);
  });

  it("counts each finished standard-deck game", () => {
    let state = playFullGame(startedGame());
    expect(state.phase).toBe("end");
    expect(state.completedGames).toBe(1);

    for (let want = 2; want <= 4; want++) {
      state = reducer(state, { type: "PLAY_AGAIN" });
      state = reducer(state, { type: "SUBMIT_SETUP", seats: SEATS });
      state = playFullGame(state);
      expect(state.completedGames).toBe(want);
    }
  });

  it("does not count Trump-deck games", () => {
    const finished = playFullGame(startedGame(SEATS, "trump"));
    expect(finished.phase).toBe("end");
    expect(finished.completedGames).toBe(0);
  });

  it("serves candidates 0..2 then runs out", () => {
    expect(bonusCandidateForGame(0)?.scandals).toHaveLength(4);
    expect(bonusCandidateForGame(1)).not.toBeNull();
    expect(bonusCandidateForGame(2)).not.toBeNull();
    expect(bonusCandidateForGame(3)).toBeNull();
    expect(bonusCandidateForGame(-1)).toBeNull();
  });
});
