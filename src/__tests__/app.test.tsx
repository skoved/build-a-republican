import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import App from "../App";

afterEach(cleanup);

function fillSetupAndStart() {
  const yourName = screen.getAllByText("Your name").map((l) => l.parentElement!.querySelector("input")!);
  const repName = screen
    .getAllByText("Name your Republican")
    .map((l) => l.parentElement!.querySelector("input")!);
  ["Ada", "Ben", "Cal"].forEach((n, i) => fireEvent.change(yourName[i], { target: { value: n } }));
  ["Sen. A", "Gov. B", "Mayor C"].forEach((n, i) =>
    fireEvent.change(repName[i], { target: { value: n } }),
  );
  fireEvent.click(screen.getByRole("button", { name: /open the first briefcases/i }));
}

function sealedBriefcases() {
  return screen
    .getAllByRole("button")
    .filter((b) => /^Sealed briefcase/.test(b.getAttribute("aria-label") ?? ""));
}

describe("<App /> full playthrough", () => {
  it("goes setup -> 4 rounds -> end screen without crashing", () => {
    render(<App />);

    // Setup
    expect(screen.getByText(/A Hotseat Party Game for Three/i)).toBeTruthy();
    fillSetupAndStart();

    for (let round = 1; round <= 4; round++) {
      // Round intro
      fireEvent.click(screen.getByRole("button", { name: /deal the briefcases/i }));

      // Three turns: click a sealed case (opens immediately), then keep it.
      for (let turn = 0; turn < 3; turn++) {
        const sealed = sealedBriefcases();
        expect(sealed.length).toBeGreaterThan(0);
        fireEvent.click(sealed[0]);
        fireEvent.click(screen.getByRole("button", { name: /^keep this scandal$/i }));
      }

      // The last lock-in lands straight on the round summary.
      expect(screen.getByText(/The field so far/i)).toBeTruthy();
      expect(screen.getAllByText(/built by/i)).toHaveLength(3);
      fireEvent.click(
        screen.getByRole("button", { name: /on to the next round|see the finished ballot/i }),
      );
    }

    // End screen: 3 player cards + the first bonus candidate.
    expect(screen.getByText(/Meet your/i)).toBeTruthy();
    const candidates = screen.getAllByText(/built by/i);
    expect(candidates).toHaveLength(4);
    expect(screen.getByText(/^bonus candidate$/i)).toBeTruthy();
    expect(screen.getByText(/built by Digital Ground Game/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /play again/i })).toBeTruthy();
  });

  it("opens a briefcase immediately on click, with no confirmation step", () => {
    render(<App />);
    fillSetupAndStart();
    fireEvent.click(screen.getByRole("button", { name: /deal the briefcases/i }));

    fireEvent.click(sealedBriefcases()[0]);

    // Straight to the reveal: the decide panel is up and there is no confirm gate.
    expect(screen.getByRole("button", { name: /^keep this scandal$/i })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /open this briefcase/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /choose a different one/i })).toBeNull();
  });

  it("supports a blind swap during a turn", () => {
    render(<App />);
    fillSetupAndStart();
    fireEvent.click(screen.getByRole("button", { name: /deal the briefcases/i }));

    fireEvent.click(sealedBriefcases()[0]);

    fireEvent.click(screen.getByRole("button", { name: /trade it away/i }));
    const targets = sealedBriefcases();
    expect(targets.length).toBeGreaterThanOrEqual(4);
    fireEvent.click(targets[0]);

    // After the swap the panel only offers "Lock it in".
    expect(screen.getByRole("button", { name: /lock it in/i })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /trade it away/i })).toBeNull();
  });

  it("backing out of a swap returns to the decide panel", () => {
    render(<App />);
    fillSetupAndStart();
    fireEvent.click(screen.getByRole("button", { name: /deal the briefcases/i }));

    fireEvent.click(sealedBriefcases()[0]);
    fireEvent.click(screen.getByRole("button", { name: /trade it away/i }));
    expect(screen.getByText(/tap a glowing case/i)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /never mind/i }));

    // Back to the decide panel with the swap still available.
    expect(screen.getByRole("button", { name: /^keep this scandal$/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /trade it away/i })).toBeTruthy();
  });

  it("locks a player out of trading once both game swaps are spent", () => {
    render(<App />);
    fillSetupAndStart();

    const playerZeroSwapsRestKeep = () => {
      fireEvent.click(screen.getByRole("button", { name: /deal the briefcases/i }));
      // Player 0 spends a swap this round.
      fireEvent.click(sealedBriefcases()[0]);
      fireEvent.click(screen.getByRole("button", { name: /trade it away/i }));
      fireEvent.click(sealedBriefcases()[0]);
      fireEvent.click(screen.getByRole("button", { name: /lock it in/i }));
      // Players 1 and 2 just keep their picks to end the round.
      for (let p = 0; p < 2; p++) {
        fireEvent.click(sealedBriefcases()[0]);
        fireEvent.click(screen.getByRole("button", { name: /^keep this scandal$/i }));
      }
      fireEvent.click(screen.getByRole("button", { name: /on to the next round/i }));
    };

    playerZeroSwapsRestKeep(); // round 1 — one swap left
    playerZeroSwapsRestKeep(); // round 2 — no swaps left

    // Round 3: player 0 opens a case and can no longer trade it away.
    fireEvent.click(screen.getByRole("button", { name: /deal the briefcases/i }));
    fireEvent.click(sealedBriefcases()[0]);

    const trade = screen.getByRole("button", {
      name: /trade it away/i,
    }) as HTMLButtonElement;
    expect(trade.disabled).toBe(true);
    expect(screen.getByText(/both your swaps are spent/i)).toBeTruthy();
  });

  it("adds a fourth player and deals eight briefcases", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /add a fourth player/i }));

    const yourName = screen
      .getAllByText("Your name")
      .map((l) => l.parentElement!.querySelector("input")!);
    const repName = screen
      .getAllByText("Name your Republican")
      .map((l) => l.parentElement!.querySelector("input")!);
    expect(yourName).toHaveLength(4);
    ["Ada", "Ben", "Cal", "Dot"].forEach((n, i) =>
      fireEvent.change(yourName[i], { target: { value: n } }),
    );
    ["Sen. A", "Gov. B", "Mayor C", "Judge D"].forEach((n, i) =>
      fireEvent.change(repName[i], { target: { value: n } }),
    );

    fireEvent.click(screen.getByRole("button", { name: /open the first briefcases/i }));
    fireEvent.click(screen.getByRole("button", { name: /deal the briefcases/i }));

    expect(sealedBriefcases()).toHaveLength(8);

    // Four turns, keep each pick.
    for (let turn = 0; turn < 4; turn++) {
      fireEvent.click(sealedBriefcases()[0]);
      fireEvent.click(screen.getByRole("button", { name: /^keep this scandal$/i }));
    }

    // Straight to the round summary — one card per player.
    expect(screen.getByText(/The field so far/i)).toBeTruthy();
    expect(screen.getAllByText(/built by/i)).toHaveLength(4);
  });

  it("can drop back to three players after adding a fourth", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /add a fourth player/i }));
    expect(screen.getAllByText("Your name")).toHaveLength(4);
    fireEvent.click(screen.getByRole("button", { name: /back to three players/i }));
    expect(screen.getAllByText("Your name")).toHaveLength(3);
  });

  it("starts a game from the Trump deck via the unmarked button", () => {
    render(<App />);

    const trumpButton = screen.getByRole("button", { name: /trump deck/i });
    expect((trumpButton as HTMLButtonElement).disabled).toBe(true);

    const yourName = screen
      .getAllByText("Your name")
      .map((l) => l.parentElement!.querySelector("input")!);
    const repName = screen
      .getAllByText("Name your Republican")
      .map((l) => l.parentElement!.querySelector("input")!);
    ["Ada", "Ben", "Cal"].forEach((n, i) =>
      fireEvent.change(yourName[i], { target: { value: n } }),
    );
    ["Sen. A", "Gov. B", "Mayor C"].forEach((n, i) =>
      fireEvent.change(repName[i], { target: { value: n } }),
    );

    expect((trumpButton as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(trumpButton);

    fireEvent.click(screen.getByRole("button", { name: /deal the briefcases/i }));
    fireEvent.click(sealedBriefcases()[0]);

    // The newspaper's "based on a true story" line names the Trump-deck figure.
    expect(screen.getAllByText(/donald j\. trump/i).length).toBeGreaterThan(0);
  });
});
