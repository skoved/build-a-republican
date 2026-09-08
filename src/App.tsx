import { useReducer } from "react";
import { categoryName } from "./data/scandals";
import { createInitialState, reducer } from "./game/reducer";
import { roundNumber } from "./game/selectors";
import EndScreen from "./components/EndScreen";
import PlayerTurn from "./components/PlayerTurn";
import RoundIntro from "./components/RoundIntro";
import RoundSummaryModal from "./components/RoundSummaryModal";
import SetupScreen from "./components/SetupScreen";

export default function App() {
  const [state, dispatch] = useReducer(reducer, undefined, createInitialState);

  return (
    <div className="min-h-full bg-gop-blue">
      {state.phase === "setup" ? (
        <SetupScreen
          dispatch={dispatch}
          gameIndex={state.gamesStarted}
          previousPlayerNames={state.previousPlayerNames}
        />
      ) : null}

      {state.phase === "round-intro" ? (
        <RoundIntro
          roundNumber={roundNumber(state)}
          categoryIndex={state.rounds.length}
          categoryName={categoryName(state.rounds.length)}
          dispatch={dispatch}
        />
      ) : null}

      {state.phase === "round-turn" ? <PlayerTurn state={state} dispatch={dispatch} /> : null}

      {state.phase === "round-summary" ? (
        <RoundSummaryModal state={state} dispatch={dispatch} />
      ) : null}

      {state.phase === "end" ? <EndScreen state={state} dispatch={dispatch} /> : null}
    </div>
  );
}
