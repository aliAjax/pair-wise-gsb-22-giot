// 存档：看板状态的本地持久化（localStorage）

import { BoardState } from "../domain/types";

const KEY = "hxwl-08-board-v1";

export function loadState(): BoardState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.wines) || !Array.isArray(parsed.sessions)) return null;
    return parsed as BoardState;
  } catch {
    return null;
  }
}

export function saveState(state: BoardState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // 存储不可用时静默失败，看板仍可在内存中运行
  }
}

export function clearState(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // 同上
  }
}
