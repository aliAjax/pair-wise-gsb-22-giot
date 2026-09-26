import type { BoardState } from "../domain/types";
import { buildSeed } from "../domain/seed";

const STORAGE_KEY = "hxwl-08-board-v1";

/** 读档：没有存档或存档损坏时回到初始资料 */
export function loadBoard(): BoardState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as BoardState;
      if (
        parsed &&
        Array.isArray(parsed.wines) &&
        Array.isArray(parsed.classes) &&
        Array.isArray(parsed.archived)
      ) {
        return parsed;
      }
    }
  } catch {
    // 存档不可读时回落到初始资料
  }
  return buildSeed();
}

export function saveBoard(state: BoardState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // 存储不可用时看板仍在内存中工作
  }
}
