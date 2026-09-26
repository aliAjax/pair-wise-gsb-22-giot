// 占用判断：排配、取消、确认上酒、重开等纯函数，不碰页面与存档

import {
  BoardState,
  FRESHNESS_DAYS,
  LinePlan,
  OpenedBottle,
  POURS_PER_BOTTLE,
  Session,
  SessionLine,
  SessionStatus,
  Wine,
} from "./types";
import { addDays, isoToday } from "./dates";

export function uid(prefix = "id"): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

/** 开瓶余量在某天是否可用：有剩余且未过保鲜截止 */
export function isUsable(bottle: OpenedBottle, onDate: string): boolean {
  return bottle.remainingPours > 0 && bottle.freshUntil >= onDate;
}

export function usableOpenedPours(wine: Wine, onDate: string): number {
  return wine.opened
    .filter((o) => isUsable(o, onDate))
    .reduce((sum, o) => sum + o.remainingPours, 0);
}

/** 已过期但仍挂账的余量（保留到保鲜结束，之后仅展示为已过期） */
export function expiredPours(wine: Wine, today: string): number {
  return wine.opened
    .filter((o) => o.remainingPours > 0 && o.freshUntil < today)
    .reduce((sum, o) => sum + o.remainingPours, 0);
}

/** 同一时段已被其他课程占用的份额（待配与已排课都算占用） */
function reservedBySlot(
  sessions: Session[],
  date: string,
  slot: string,
  excludeId?: string
): Map<string, { opened: number; sealed: number }> {
  const map = new Map<string, { opened: number; sealed: number }>();
  for (const s of sessions) {
    if (s.id === excludeId) continue;
    if (s.status !== "ready" && s.status !== "pending") continue;
    if (s.date !== date || s.slot !== slot) continue;
    for (const p of s.plan) {
      const cur = map.get(p.wineId) ?? { opened: 0, sealed: 0 };
      cur.opened += p.fromOpened;
      cur.sealed += p.bottlesToOpen;
      map.set(p.wineId, cur);
    }
  }
  return map;
}

/**
 * 为一门课计算排配：
 * 1. 先用上课当天未过期的开瓶余量（扣除同时段已被占用的）；
 * 2. 不够再补整瓶（每瓶 POURS_PER_BOTTLE 份）；
 * 3. 仍不够的部分记为缺几份。
 */
export function computePlan(
  wines: Wine[],
  sessions: Session[],
  session: Pick<Session, "id" | "date" | "slot" | "lines">
): LinePlan[] {
  const reserved = reservedBySlot(sessions, session.date, session.slot, session.id);
  return session.lines.map((line) => {
    const wine = wines.find((w) => w.id === line.wineId);
    if (!wine) {
      return { wineId: line.wineId, requested: line.pours, fromOpened: 0, bottlesToOpen: 0, shortage: line.pours };
    }
    const r = reserved.get(line.wineId) ?? { opened: 0, sealed: 0 };
    const availOpened = Math.max(0, usableOpenedPours(wine, session.date) - r.opened);
    const fromOpened = Math.min(line.pours, availOpened);
    const rest = line.pours - fromOpened;
    const availSealed = Math.max(0, wine.sealedBottles - r.sealed);
    const bottlesToOpen = Math.min(Math.ceil(rest / POURS_PER_BOTTLE), availSealed);
    const shortage = Math.max(0, rest - bottlesToOpen * POURS_PER_BOTTLE);
    return { wineId: line.wineId, requested: line.pours, fromOpened, bottlesToOpen, shortage };
  });
}

/** 有缺份就留在待配区，否则进入已排课 */
export function statusFromPlan(plan: LinePlan[]): SessionStatus {
  return plan.some((p) => p.shortage > 0) ? "pending" : "ready";
}

export interface SessionDraft {
  title: string;
  date: string;
  slot: string;
  lines: SessionLine[];
}

/** 排课：只占用份额，不扣库存 */
export function scheduleSession(state: BoardState, draft: SessionDraft): BoardState {
  const base: Session = {
    ...draft,
    id: uid("s"),
    createdAt: Date.now(),
    plan: [],
    status: "pending",
  };
  const plan = computePlan(state.wines, state.sessions, base);
  const session: Session = { ...base, plan, status: statusFromPlan(plan) };
  return { ...state, sessions: [...state.sessions, session] };
}

/**
 * 取消课程：整瓶与余量的占用全部退回（库存本身从未扣减）；
 * 已开瓶的余量不受影响，保留到保鲜结束。
 * 取消后同时段腾出份额，重新排配待配区。
 */
export function cancelSession(state: BoardState, id: string): BoardState {
  const sessions = state.sessions.map((s) =>
    s.id === id && (s.status === "ready" || s.status === "pending")
      ? { ...s, status: "cancelled" as SessionStatus }
      : s
  );
  return { ...state, sessions: replanPending(state.wines, sessions) };
}

export interface ConfirmResult {
  state: BoardState;
  shortages: { wineId: string; missing: number }[];
}

/**
 * 讲师确认上酒：此时才真正扣减份额。
 * 先扣未过期余量（保鲜截止近的先用），再开整瓶；
 * 新开瓶的剩余份数登记为开瓶余量，保鲜截止默认今天 + FRESHNESS_DAYS。
 * 库存不足则不扣减，返回缺数。
 */
export function confirmSession(
  state: BoardState,
  id: string,
  today: string = isoToday()
): ConfirmResult {
  const session = state.sessions.find((s) => s.id === id);
  if (!session || session.status !== "ready") return { state, shortages: [] };

  const wines: Wine[] = state.wines.map((w) => ({
    ...w,
    opened: w.opened.map((o) => ({ ...o })),
  }));
  const shortages: { wineId: string; missing: number }[] = [];

  for (const line of session.lines) {
    const wine = wines.find((w) => w.id === line.wineId);
    if (!wine) {
      shortages.push({ wineId: line.wineId, missing: line.pours });
      continue;
    }
    let need = line.pours;
    const usable = wine.opened
      .filter((o) => isUsable(o, today))
      .sort((a, b) => a.freshUntil.localeCompare(b.freshUntil));
    for (const bottle of usable) {
      if (need === 0) break;
      const take = Math.min(bottle.remainingPours, need);
      bottle.remainingPours -= take;
      need -= take;
    }
    while (need > 0 && wine.sealedBottles > 0) {
      wine.sealedBottles -= 1;
      const used = Math.min(need, POURS_PER_BOTTLE);
      need -= used;
      const leftover = POURS_PER_BOTTLE - used;
      if (leftover > 0) {
        wine.opened.push({
          id: uid("ob"),
          remainingPours: leftover,
          openedOn: today,
          freshUntil: addDays(today, FRESHNESS_DAYS),
        });
      }
    }
    if (need > 0) shortages.push({ wineId: wine.id, missing: need });
  }

  if (shortages.length > 0) return { state, shortages };

  const sessions = state.sessions.map((s) =>
    s.id === id ? { ...s, status: "served" as SessionStatus } : s
  );
  return { state: { wines, sessions: replanPending(wines, sessions) }, shortages };
}

/** 重开已取消的课程：按当前库存重新排配，接着排 */
export function reopenSession(state: BoardState, id: string): BoardState {
  const target = state.sessions.find((s) => s.id === id);
  if (!target || target.status !== "cancelled") return state;
  const revived: Session = { ...target, status: "pending", createdAt: Date.now() };
  const plan = computePlan(state.wines, state.sessions, revived);
  const updated: Session = { ...revived, plan, status: statusFromPlan(plan) };
  return { ...state, sessions: state.sessions.map((s) => (s.id === id ? updated : s)) };
}

/** 手动重排某一门待配课程（例如补货之后） */
export function replanOne(state: BoardState, id: string): BoardState {
  const target = state.sessions.find((s) => s.id === id);
  if (!target || target.status !== "pending") return state;
  const plan = computePlan(state.wines, state.sessions, target);
  const updated: Session = { ...target, plan, status: statusFromPlan(plan) };
  return { ...state, sessions: state.sessions.map((s) => (s.id === id ? updated : s)) };
}

/**
 * 重排全部待配课程：按排课先后依次占用，
 * 先排的课先拿份额，超出可出库份数的留在待配区。
 */
export function replanPending(wines: Wine[], sessions: Session[]): Session[] {
  const fixed = sessions.filter((s) => s.status !== "pending");
  const pendings = sessions
    .filter((s) => s.status === "pending")
    .sort((a, b) => a.createdAt - b.createdAt);
  const planned: Session[] = [];
  for (const p of pendings) {
    const plan = computePlan(wines, [...fixed, ...planned], p);
    planned.push({ ...p, plan, status: statusFromPlan(plan) });
  }
  return sessions.map((s) => planned.find((p) => p.id === s.id) ?? s);
}

/** 库存变动后，待配区自动重排 */
function withReplan(state: BoardState): BoardState {
  return { ...state, sessions: replanPending(state.wines, state.sessions) };
}

/** 补整瓶库存 */
export function restock(state: BoardState, wineId: string, bottles: number): BoardState {
  const wines = state.wines.map((w) =>
    w.id === wineId ? { ...w, sealedBottles: w.sealedBottles + bottles } : w
  );
  return withReplan({ ...state, wines });
}

/** 开瓶登记：整瓶 -1，记录余量与保鲜截止 */
export function openBottle(
  state: BoardState,
  wineId: string,
  freshUntil: string,
  today: string = isoToday()
): BoardState {
  const wines = state.wines.map((w) => {
    if (w.id !== wineId || w.sealedBottles <= 0) return w;
    return {
      ...w,
      sealedBottles: w.sealedBottles - 1,
      opened: [
        ...w.opened,
        { id: uid("ob"), remainingPours: POURS_PER_BOTTLE, openedOn: today, freshUntil },
      ],
    };
  });
  return withReplan({ ...state, wines });
}

export function addWine(
  state: BoardState,
  wine: Pick<Wine, "name" | "region" | "grape" | "sealedBottles">
): BoardState {
  return { ...state, wines: [...state.wines, { ...wine, id: uid("w"), opened: [] }] };
}
