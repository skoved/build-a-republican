import { useState, type FormEvent } from "react";
import type { AppDispatch, SetupSeat } from "../game/types";
import { MAX_PLAYERS, MIN_PLAYERS } from "../data/scandals";
import TrumpMark from "./TrumpMark";

interface Props {
  dispatch: AppDispatch;
}

const emptySeat = (): SetupSeat => ({ playerName: "", politicianName: "" });
const EMPTY_SEATS: SetupSeat[] = Array.from({ length: MIN_PLAYERS }, emptySeat);

export default function SetupScreen({ dispatch }: Props) {
  const [seats, setSeats] = useState<SetupSeat[]>(EMPTY_SEATS);

  const complete = seats.every(
    (s) => s.playerName.trim() !== "" && s.politicianName.trim() !== "",
  );

  function update(index: number, patch: Partial<SetupSeat>) {
    setSeats((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  function addSeat() {
    setSeats((prev) => (prev.length < MAX_PLAYERS ? [...prev, emptySeat()] : prev));
  }

  function removeSeat() {
    setSeats((prev) => (prev.length > MIN_PLAYERS ? prev.slice(0, -1) : prev));
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    if (complete) dispatch({ type: "SUBMIT_SETUP", seats });
  }

  return (
    <div className="relative mx-auto flex min-h-full max-w-3xl flex-col justify-center px-4 py-10">
      <button
        type="button"
        aria-label="Start with the Trump deck"
        title="Start with the Trump deck"
        disabled={!complete}
        onClick={() => dispatch({ type: "SUBMIT_SETUP", seats, deckId: "trump" })}
        className="absolute right-3 top-3 rounded-full p-2 text-paper/15 transition hover:text-paper/70 focus-visible:text-paper/70 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:text-paper/15"
      >
        <TrumpMark className="h-7 w-7" />
      </button>

      <header className="text-center">
        <p className="dateline text-xs uppercase tracking-[0.35em] text-brass">
          A Hotseat Party Game for Three or Four
        </p>
        <h1 className="headline mt-2 text-5xl text-paper sm:text-6xl">
          Build a <span className="text-gop-red">Republican</span>
        </h1>
        <p className="mx-auto mt-3 max-w-xl font-serif text-paper/80">
          Four rounds. Two briefcases per player each round. Draft one scandal per
          category — Personal Conduct, Finance &amp; Fraud, Conflict of Interest,
          and the October Surprise — into the most electable disaster at the table.
        </p>
      </header>

      <form
        onSubmit={submit}
        className={`mt-8 grid gap-4 ${
          seats.length === 4 ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-3"
        }`}
      >
        {seats.map((seat, i) => (
          <fieldset
            key={i}
            className="rounded-lg border border-brass/40 bg-leather/60 p-4 text-paper"
          >
            <legend className="dateline px-2 text-[0.7rem] uppercase tracking-[0.2em] text-brass">
              Seat {i + 1}
            </legend>
            <label className="block text-sm">
              <span className="font-serif text-paper/80">Your name</span>
              <input
                className="mt-1 w-full rounded border border-brass/40 bg-paper px-2 py-1.5 font-serif text-ink outline-none focus:border-gop-red"
                value={seat.playerName}
                onChange={(e) => update(i, { playerName: e.target.value })}
                maxLength={24}
                autoComplete="off"
              />
            </label>
            <label className="mt-3 block text-sm">
              <span className="font-serif text-paper/80">Name your Republican</span>
              <input
                className="mt-1 w-full rounded border border-brass/40 bg-paper px-2 py-1.5 font-serif text-ink outline-none focus:border-gop-red"
                value={seat.politicianName}
                onChange={(e) => update(i, { politicianName: e.target.value })}
                placeholder="e.g. Senator Buck Wheatland III"
                maxLength={40}
                autoComplete="off"
              />
            </label>
          </fieldset>
        ))}

        <div className="sm:col-span-full">
          {seats.length < MAX_PLAYERS ? (
            <button
              type="button"
              onClick={addSeat}
              className="w-full rounded-lg border border-dashed border-brass/50 px-4 py-2 font-serif text-sm text-paper/80 transition hover:border-brass hover:text-paper"
            >
              ＋ Add a fourth player
            </button>
          ) : (
            <button
              type="button"
              onClick={removeSeat}
              className="w-full rounded-lg border border-dashed border-brass/50 px-4 py-2 font-serif text-sm text-paper/80 transition hover:border-brass hover:text-paper"
            >
              − Back to three players
            </button>
          )}
        </div>

        <div className="sm:col-span-full">
          <button
            type="submit"
            disabled={!complete}
            className="w-full rounded-lg bg-gop-red px-6 py-3 font-display text-lg font-bold text-white shadow-lg transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Open the first briefcases
          </button>
          {!complete ? (
            <p className="mt-2 text-center font-serif text-sm text-paper/60">
              Fill in every name to begin.
            </p>
          ) : null}
        </div>
      </form>
    </div>
  );
}
