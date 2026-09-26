import { useEffect, useReducer } from "react";
import { boardReducer } from "./store/board";
import { loadBoard, saveBoard } from "./store/archive";
import BoardPage from "./pages/BoardPage";

export default function App() {
  const [state, dispatch] = useReducer(boardReducer, undefined, loadBoard);

  useEffect(() => {
    saveBoard(state);
  }, [state]);

  return <BoardPage state={state} dispatch={dispatch} />;
}
