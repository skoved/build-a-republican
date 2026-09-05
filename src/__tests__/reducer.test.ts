import { describe, expect, it } from "vitest";
import { BRIEFCASES_PER_ROUND, ROUND_COUNT, scandalIdsForCategory } from "../data/scandals";
import { createInitialState, reducer } from "../game/reducer";
import type { GameState } from "../game/types";

const SEATS = [
  { playerName: "Ada", politicianName: "Senator Alpha" },
  { playerName: "Ben", politicianName: "Governor Bravo" },
  { playerName: "Cal", politicianName: "Mayor Charlie" },
];

function firstClosedIndex(state: GameState): number {
  const round = state.current!;
  return round.briefcases.findIndex((b) => !b.opened);
}

/** Play one round where every player just keeps their first pick. */
function playRoundKeepingPicks(state: GameState): GameState {
  let next = reducer(state, { type: "BEGIN_ROUND" });
  for (let p = 0; p < 3; p++) {
    next = reducer(next, { type: "TAKE_BRIEFCASE", index: firstClosedIndex(next) });
    next = reducer(next, { type: "KEEP_SCANDAL" });
  }
  return reducer(next, { type: "DISMISS_SUMMARY" });
}

function playFullGame(state: GameState): GameState {
  let next = state;
  for (let r = 0; r < ROUND_COUNT; r++) next = playRoundKeepingPicks(next);
  return next;
}

function startedGame(): GameState {
  return reducer(createInitialState(), { type: "SUBMIT_SETUP", seats: SEATS });
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
});

describe("round turn flow", () => {
  it("deals 6 briefcases and records them as used", () => {
    const state = reducer(startedGame(), { type: "BEGIN_ROUND" });
    expect(state.phase).toBe("round-turn");
    expect(state.current?.briefcases).toHaveLength(BRIEFCASES_PER_ROUND);
    expect(state.usedScandalIds).toHaveLength(BRIEFCASES_PER_ROUND);
  });

  it("TAKE_BRIEFCASE opens the case and moves to the decide step", () => {
    let state = reducer(startedGame(), { type: "BEGIN_ROUND" });
    state = reducer(state, { type: "TAKE_BRIEFCASE", index: 0 });
    expect(state.current?.turnStep).toBe("deciding");
    expect(state.current?.briefcases[0].opened).toBe(true);
    expect(state.current?.briefcases[0].heldBy).toBe(0);
  });

  it("KEEP_SCANDAL advances players and ends the round after the third", () => {
    const state = playRoundKeepingPicks(startedGame());
    // DISMISS_SUMMARY was applied at the end -> back to round-intro for round 2.
    expect(state.phase).toBe("round-intro");
    expect(state.rounds).toHaveLength(1);
    expect(state.rounds[0].results).toHaveLength(3);
    const ownedIds = state.rounds[0].results.map((r) => r.scandalId);
    expect(new Set(ownedIds).size).toBe(3);
  });

  it("BLIND_SWAP discards the old scandal, keeps the new one, and spends the swap", () => {
    let state = reducer(startedGame(), { type: "BEGIN_ROUND" });
    state = reducer(state, { type: "TAKE_BRIEFCASE", index: 0 });
    const firstScandal = state.current!.briefcases[0].scandalId;
    state = reducer(state, { type: "REQUEST_SWAP" });
    expect(state.current?.turnStep).toBe("swapping");
    state = reducer(state, { type: "BLIND_SWAP", index: 3 });

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
    state = reducer(state, { type: "TAKE_BRIEFCASE", index: 0 });
    state = reducer(state, { type: "REQUEST_SWAP" });
    state = reducer(state, { type: "BLIND_SWAP", index: 1 });
    state = reducer(state, { type: "KEEP_SCANDAL" }); // player 0 locks in

    // player 1 tries to take the discarded case 0
    const attempt = reducer(state, { type: "TAKE_BRIEFCASE", index: 0 });
    expect(attempt.current?.briefcases[0].heldBy).toBe(null);
    expect(attempt.current?.turnStep).toBe("picking");
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

    expect(dealtGame2).toHaveLength(ROUND_COUNT * BRIEFCASES_PER_ROUND);
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
    expect(dealt.current?.briefcases).toHaveLength(BRIEFCASES_PER_ROUND);
    // History for the category was cleared, then the fresh deal recorded.
    expect(dealt.usedScandalIds).toHaveLength(BRIEFCASES_PER_ROUND);
  });
});
