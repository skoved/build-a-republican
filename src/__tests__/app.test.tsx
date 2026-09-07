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

      // Three turns: click a sealed case, confirm the open, then keep it.
      for (let turn = 0; turn < 3; turn++) {
        const sealed = sealedBriefcases();
        expect(sealed.length).toBeGreaterThan(0);
        fireEvent.click(sealed[0]);
        fireEvent.click(screen.getByRole("button", { name: /open this briefcase/i }));
        fireEvent.click(screen.getByRole("button", { name: /^keep this scandal$/i }));
      }

      // Board recap: the grid returns with a button to start the reveal.
      expect(screen.getByText(/every pick is in/i)).toBeTruthy();
      fireEvent.click(screen.getByRole("button", { name: /nobody opened/i }));

      // Reveal of the briefcases nobody picked (3 of them for a keep-only round).
      expect(screen.getByText(/the ones that got away/i)).toBeTruthy();
      for (let guard = 0; guard < 6; guard++) {
        const next = screen.queryByRole("button", { name: /next scandal|show the field/i });
        if (!next) break;
        fireEvent.click(next);
      }

      // Round summary
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

  it("asks for confirmation before revealing a scandal", () => {
    render(<App />);
    fillSetupAndStart();
    fireEvent.click(screen.getByRole("button", { name: /deal the briefcases/i }));

    fireEvent.click(sealedBriefcases()[0]);

    // Confirm step is up; the scandal is not revealed yet.
    expect(screen.getByRole("button", { name: /open this briefcase/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /choose a different one/i })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^keep this scandal$/i })).toBeNull();
    // No newspaper masthead yet — the scandal stays hidden until confirmed.
    expect(screen.queryByText(/based on a true story/i)).toBeNull();

    // Backing out returns the turn to the plain "pick a briefcase" state.
    fireEvent.click(screen.getByRole("button", { name: /choose a different one/i }));
    expect(screen.getByText(/pick a sealed briefcase/i)).toBeTruthy();
  });

  it("supports a blind swap during a turn", () => {
    render(<App />);
    fillSetupAndStart();
    fireEvent.click(screen.getByRole("button", { name: /deal the briefcases/i }));

    fireEvent.click(sealedBriefcases()[0]);
    fireEvent.click(screen.getByRole("button", { name: /open this briefcase/i }));

    fireEvent.click(screen.getByRole("button", { name: /trade it away/i }));
    const targets = sealedBriefcases();
    expect(targets.length).toBeGreaterThanOrEqual(4);
    fireEvent.click(targets[0]);
    fireEvent.click(screen.getByRole("button", { name: /open this briefcase/i }));

    // After the swap the panel only offers "Lock it in".
    expect(screen.getByRole("button", { name: /lock it in/i })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /trade it away/i })).toBeNull();
  });

  it("cancelling a swap consideration returns to a working swap grid", () => {
    render(<App />);
    fillSetupAndStart();
    fireEvent.click(screen.getByRole("button", { name: /deal the briefcases/i }));

    fireEvent.click(sealedBriefcases()[0]);
    fireEvent.click(screen.getByRole("button", { name: /open this briefcase/i }));
    fireEvent.click(screen.getByRole("button", { name: /trade it away/i }));

    // Consider a target, then back out.
    fireEvent.click(sealedBriefcases()[0]);
    expect(screen.getByRole("button", { name: /open this briefcase/i })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /choose a different one/i }));

    // Grid is interactive again: the swap sub-bar is back and another target
    // can be considered (no stuck overlay).
    expect(screen.getByText(/tap a glowing case/i)).toBeTruthy();
    fireEvent.click(sealedBriefcases()[0]);
    expect(screen.getByRole("button", { name: /open this briefcase/i })).toBeTruthy();
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
      fireEvent.click(screen.getByRole("button", { name: /open this briefcase/i }));
      fireEvent.click(screen.getByRole("button", { name: /^keep this scandal$/i }));
    }

    expect(screen.getByText(/every pick is in/i)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /nobody opened/i }));
    for (let guard = 0; guard < 8; guard++) {
      const next = screen.queryByRole("button", { name: /next scandal|show the field/i });
      if (!next) break;
      fireEvent.click(next);
    }

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
    fireEvent.click(screen.getByRole("button", { name: /open this briefcase/i }));

    // The newspaper's "based on a true story" line names the Trump-deck figure.
    expect(screen.getAllByText(/donald j\. trump/i).length).toBeGreaterThan(0);
  });
});
