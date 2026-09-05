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

describe("<App /> full playthrough", () => {
  it("goes setup -> 4 rounds -> end screen without crashing", () => {
    render(<App />);

    // Setup
    expect(screen.getByText(/A Hotseat Party Game for Three/i)).toBeTruthy();
    fillSetupAndStart();

    for (let round = 1; round <= 4; round++) {
      // Round intro
      fireEvent.click(screen.getByRole("button", { name: /deal the briefcases/i }));

      // Three turns: take the first still-sealed case, then keep it.
      for (let turn = 0; turn < 3; turn++) {
        const sealed = screen
          .getAllByRole("button")
          .filter((b) => /^Sealed briefcase/.test(b.getAttribute("aria-label") ?? ""));
        expect(sealed.length).toBeGreaterThan(0);
        fireEvent.click(sealed[0]);
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

    // End screen
    expect(screen.getByText(/Meet your/i)).toBeTruthy();
    const candidates = screen.getAllByText(/built by/i);
    expect(candidates).toHaveLength(3);
    expect(screen.getByRole("button", { name: /play again/i })).toBeTruthy();
  });

  it("supports a blind swap during a turn", () => {
    render(<App />);
    fillSetupAndStart();
    fireEvent.click(screen.getByRole("button", { name: /deal the briefcases/i }));

    const sealed = screen
      .getAllByRole("button")
      .filter((b) => /^Sealed briefcase/.test(b.getAttribute("aria-label") ?? ""));
    fireEvent.click(sealed[0]);

    fireEvent.click(screen.getByRole("button", { name: /trade it away/i }));
    const targets = screen
      .getAllByRole("button")
      .filter((b) => /^Sealed briefcase/.test(b.getAttribute("aria-label") ?? ""));
    expect(targets.length).toBe(5);
    fireEvent.click(targets[0]);

    // After the swap the panel only offers "Lock it in".
    expect(screen.getByRole("button", { name: /lock it in/i })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /trade it away/i })).toBeNull();
  });
});
