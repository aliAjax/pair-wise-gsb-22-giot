import type { BoardState, ClassDraft, WineDraft } from "../domain/types";
import * as ops from "../domain/allocation";
import { buildSeed } from "../domain/seed";

export type Action =
  | { type: "schedule"; draft: ClassDraft }
  | { type: "retry"; classId: string }
  | { type: "confirm"; classId: string; freshUntil: string }
  | { type: "cancel"; classId: string }
  | { type: "reopen"; classId: string }
  | { type: "archive"; classId: string }
  | { type: "restock"; wineId: string; count: number }
  | { type: "openBottle"; wineId: string; servings: number; freshUntil: string }
  | { type: "prune"; wineId: string }
  | { type: "addWine"; draft: WineDraft }
  | { type: "reset" };

/** 看板状态机：所有动作都委托给领域层的占用判断 */
export function boardReducer(state: BoardState, action: Action): BoardState {
  switch (action.type) {
    case "schedule":
      return ops.scheduleClass(state, action.draft);
    case "retry":
      return ops.retryClass(state, action.classId);
    case "confirm":
      return ops.confirmClass(state, action.classId, action.freshUntil);
    case "cancel":
      return ops.cancelClass(state, action.classId);
    case "reopen":
      return ops.reopenClass(state, action.classId);
    case "archive":
      return ops.archiveClass(state, action.classId);
    case "restock":
      return ops.addFullBottles(state, action.wineId, action.count);
    case "openBottle":
      return ops.registerOpenedBottle(state, action.wineId, action.servings, action.freshUntil);
    case "prune":
      return ops.pruneOpenedBottles(state, action.wineId);
    case "addWine":
      return ops.addWine(state, action.draft);
    case "reset":
      return buildSeed();
  }
}
