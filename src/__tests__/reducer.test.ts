import { describe, expect, it } from "vitest";
import { briefcasesForPlayers, ROUND_COUNT, scandalIdsForCategory } from "../data/scandals";
import { createInitialState, reducer } from "../game/reducer";
import type { GameState } from "../game/types";

const SEATS = [
  { playerName: "Ada", politicianName: "Senator Alpha" },
  { playerName: "Ben", politicianName: "Governor Bravo" },
  { playerName: "Cal", politicianName: "Mayor Charlie" },
];

const SEATS_4 = [...SEATS, { playerName: "Dot", politicianName: "Judge Delta" }];

/** Briefcases dealt for a 3-player table (6) and a 4-player table (8). */
const SIX = briefcasesForPlayers(3);
const EIGHT = briefcasesForPlayers(4);

function firstClosedIndex(state: GameState): number {
  const round = state.current!;
  return round.briefcases.findIndex((b) => !b.opened);
}

function firstSwapTargetIndex(state: GameState): number {
  const round = state.current!;
  return round.briefcases.findIndex((b) => !b.opened && b.heldBy === null);
}

/** Consider + open a briefcase as a fresh pick (the two-step confirm flow). */
function take(state: GameState, index: number): GameState {
  const considered = reducer(state, { type: "CONSIDER_BRIEFCASE", index });
  return reducer(considered, { type: "TAKE_BRIEFCASE", index });
}

/** Consider + commit a blind swap into a sealed briefcase. */
function blindSwap(state: GameState, index: number): GameState {
  const considered = reducer(state, { type: "CONSIDER_BRIEFCASE", index });
  return reducer(considered, { type: "BLIND_SWAP", index });
}

/** Play one round where every player just keeps their first pick. */
function playRoundKeepingPicks(state: GameState): GameState {
  let next = reducer(state, { type: "BEGIN_ROUND" });
  for (let p = 0; p < state.players.length; p++) {
    next = take(next, firstClosedIndex(next));
    next = reducer(next, { type: "KEEP_SCANDAL" });
  }
  // Keeping every pick leaves the other half of the briefcases unopened ->
  // board recap, then the reveal, one per unopened case.
  if (next.phase === "round-recap") next = reducer(next, { type: "REVEAL_UNOPENED" });
  while (next.phase === "round-reveal") next = reducer(next, { type: "NEXT_REVEAL" });
  return reducer(next, { type: "DISMISS_SUMMARY" });
}

function playFullGame(state: GameState): GameState {
  let next = state;
  for (let r = 0; r < ROUND_COUNT; r++) next = playRoundKeepingPicks(next);
  return next;
}

function startedGame(seats = SEATS): GameState {
  return reducer(createInitialState(), { type: "SUBMIT_SETUP", seats });
}

describe("setup", () => {
  it("moves to round-intro with 3 players when all seats are filled", () => {
    const state = startedGame();
    expect(state.phase).toBe("round-intro");
    expect(state.players).toHaveLength(3);
    expect(state.players[1].politicianName).toBe("Governor Bravo");
  });

  it("ignores setup when a seat is blank", () => {
    const state = reducer(createInitialState(), {
      type: "SUBMIT_SETUP",
      seats: [SEATS[0], SEATS[1], { playerName: "Cal", politicianName: "  " }],
    });
    expect(state.phase).toBe("setup");
    expect(state.players).toHaveLength(0);
  });

  it("accepts a 4-player table", () => {
    const state = startedGame(SEATS_4);
    expect(state.phase).toBe("round-intro");
    expect(state.players).toHaveLength(4);
    expect(state.players[3].politicianName).toBe("Judge Delta");
  });

  it("rejects tables outside 3–4 players", () => {
    const two = reducer(createInitialState(), { type: "SUBMIT_SETUP", seats: SEATS.slice(0, 2) });
    expect(two.phase).toBe("setup");
    const five = reducer(createInitialState(), {
      type: "SUBMIT_SETUP",
      seats: [...SEATS_4, { playerName: "Eve", politicianName: "Rep. Echo" }],
    });
    expect(five.phase).toBe("setup");
  });
});

describe("considering a briefcase (confirm step)", () => {
  it("CONSIDER_BRIEFCASE lifts the case without opening or locking anything", () => {
    let state = reducer(startedGame(), { type: "BEGIN_ROUND" });
    state = reducer(state, { type: "CONSIDER_BRIEFCASE", index: 2 });
    const round = state.current!;
    expect(round.turnStep).toBe("considering");
    expect(round.pendingIndex).toBe(2);
    expect(round.pendingKind).toBe("pick");
    expect(round.briefcases[2].opened).toBe(false);
    expect(round.briefcases[2].heldBy).toBe(null);
  });

  it("TAKE_BRIEFCASE is ignored straight from picking (must consider first)", () => {
    let state = reducer(startedGame(), { type: "BEGIN_ROUND" });
    state = reducer(state, { type: "TAKE_BRIEFCASE", index: 0 });
    expect(state.current?.turnStep).toBe("picking");
    expect(state.current?.briefcases[0].opened).toBe(false);
  });

  it("CONSIDER then TAKE_BRIEFCASE opens the case and moves to the decide step", () => {
    let state = reducer(startedGame(), { type: "BEGIN_ROUND" });
    state = take(state, 0);
    expect(state.current?.turnStep).toBe("deciding");
    expect(state.current?.briefcases[0].opened).toBe(true);
    expect(state.current?.briefcases[0].heldBy).toBe(0);
    expect(state.current?.pendingIndex).toBe(null);
  });

  it("CANCEL_CONSIDER returns to picking with nothing changed", () => {
    let state = reducer(startedGame(), { type: "BEGIN_ROUND" });
    state = reducer(state, { type: "CONSIDER_BRIEFCASE", index: 1 });
    state = reducer(state, { type: "CANCEL_CONSIDER" });
    expect(state.current?.turnStep).toBe("picking");
    expect(state.current?.pendingIndex).toBe(null);
    expect(state.current?.briefcases.every((b) => !b.opened)).toBe(true);
  });

  it("re-targeting moves the pending index and still opens nothing", () => {
    let state = reducer(startedGame(), { type: "BEGIN_ROUND" });
    state = reducer(state, { type: "CONSIDER_BRIEFCASE", index: 0 });
    state = reducer(state, { type: "CONSIDER_BRIEFCASE", index: 4 });
    expect(state.current?.turnStep).toBe("considering");
    expect(state.current?.pendingIndex).toBe(4);
    expect(state.current?.briefcases.every((b) => !b.opened)).toBe(true);
  });

  it("a blind-swap consideration cancels back to swapping, scandal untouched", () => {
    let state = reducer(startedGame(), { type: "BEGIN_ROUND" });
    state = take(state, 0);
    const heldScandal = state.current!.briefcases[0].scandalId;
    state = reducer(state, { type: "REQUEST_SWAP" });
    state = reducer(state, { type: "CONSIDER_BRIEFCASE", index: 3 });
    expect(state.current?.turnStep).toBe("considering");
    expect(state.current?.pendingKind).toBe("swap");

    state = reducer(state, { type: "CANCEL_CONSIDER" });
    expect(state.current?.turnStep).toBe("swapping");
    expect(state.current?.briefcases[0]).toMatchObject({ opened: true, heldBy: 0 });
    expect(state.current?.briefcases[0].scandalId).toBe(heldScandal);
    expect(state.current?.briefcases[3].opened).toBe(false);
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

  it("runs a full 4-player round: 4 picks, 4 unopened cases revealed", () => {
    let state = reducer(startedGame(SEATS_4), { type: "BEGIN_ROUND" });
    for (let p = 0; p < 4; p++) {
      state = take(state, firstClosedIndex(state));
      state = reducer(state, { type: "KEEP_SCANDAL" });
    }
    expect(state.phase).toBe("round-recap");
    expect(state.current?.briefcases.filter((b) => b.opened)).toHaveLength(4);

    state = reducer(state, { type: "REVEAL_UNOPENED" });
    let steps = 0;
    while (state.phase === "round-reveal") {
      state = reducer(state, { type: "NEXT_REVEAL" });
      steps++;
    }
    expect(steps).toBe(4); // 8 dealt - 4 kept = 4 that got away
    expect(state.phase).toBe("round-summary");
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
    expect(round.briefcases[0]).toMatchObject({ opened: true, heldBy: null }); // discarded
    expect(round.briefcases[3]).toMatchObject({ opened: true, heldBy: 0 });
    expect(round.briefcases[3].scandalId).not.toBe(firstScandal);

    // A second swap is refused now that swapUsed is set.
    const blocked = reducer(state, { type: "REQUEST_SWAP" });
    expect(blocked.current?.turnStep).toBe("deciding");
  });

  it("a discarded scandal cannot be chosen by a later player", () => {
    let state = reducer(startedGame(), { type: "BEGIN_ROUND" });
    state = take(state, 0);
    state = reducer(state, { type: "REQUEST_SWAP" });
    state = blindSwap(state, 1);
    state = reducer(state, { type: "KEEP_SCANDAL" }); // player 0 locks in

    // player 1 tries to consider the discarded case 0
    const attempt = reducer(state, { type: "CONSIDER_BRIEFCASE", index: 0 });
    expect(attempt.current?.turnStep).toBe("picking");
    expect(attempt.current?.pendingIndex).toBe(null);
  });
});

describe("end-of-round reveal", () => {
  function lockInThreeKeepingPicks(): GameState {
    let state = reducer(startedGame(), { type: "BEGIN_ROUND" });
    for (let p = 0; p < 3; p++) {
      state = take(state, firstClosedIndex(state));
      state = reducer(state, { type: "KEEP_SCANDAL" });
    }
    return state;
  }

  it("pauses on the board recap, then reveals the unopened briefcases before the summary", () => {
    let state = lockInThreeKeepingPicks();
    // Last lock-in lands on the board recap, not straight into the reveal.
    expect(state.phase).toBe("round-recap");

    state = reducer(state, { type: "REVEAL_UNOPENED" });
    expect(state.phase).toBe("round-reveal");
    expect(state.current?.revealCursor).toBe(0);

    // 3 kept picks -> 3 unopened briefcases to reveal.
    state = reducer(state, { type: "NEXT_REVEAL" });
    expect(state.phase).toBe("round-reveal");
    expect(state.current?.revealCursor).toBe(1);

    state = reducer(state, { type: "NEXT_REVEAL" });
    expect(state.phase).toBe("round-reveal");
    expect(state.current?.revealCursor).toBe(2);

    state = reducer(state, { type: "NEXT_REVEAL" });
    expect(state.phase).toBe("round-summary");
    expect(state.rounds).toHaveLength(1);
  });

  it("skips the recap and reveal when every briefcase was opened", () => {
    let state = reducer(startedGame(), { type: "BEGIN_ROUND" });
    for (let p = 0; p < 3; p++) {
      state = take(state, firstClosedIndex(state));
      state = reducer(state, { type: "REQUEST_SWAP" });
      state = blindSwap(state, firstSwapTargetIndex(state));
      state = reducer(state, { type: "KEEP_SCANDAL" });
    }
    // 3 taken + 3 swapped-into = all 6 opened.
    expect(state.current?.briefcases.every((b) => b.opened)).toBe(true);
    expect(state.phase).toBe("round-summary");
  });

  it("REVEAL_UNOPENED only fires from the recap", () => {
    const recap = lockInThreeKeepingPicks();
    expect(recap.phase).toBe("round-recap");

    // Ignored from other phases.
    expect(reducer(startedGame(), { type: "REVEAL_UNOPENED" }).phase).toBe("round-intro");

    const revealing = reducer(recap, { type: "REVEAL_UNOPENED" });
    expect(revealing.phase).toBe("round-reveal");
    // A second REVEAL_UNOPENED does nothing now that we've left the recap.
    expect(reducer(revealing, { type: "REVEAL_UNOPENED" }).phase).toBe("round-reveal");
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
