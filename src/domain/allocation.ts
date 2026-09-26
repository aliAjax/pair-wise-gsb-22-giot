import { todayIso } from "./dates";
import {
  BoardState,
  ClassDraft,
  ClassSession,
  LineAllocation,
  OpenedBottle,
  SERVINGS_PER_BOTTLE,
  Slot,
  Wine,
  WineDraft,
} from "./types";

export function uid(prefix: string): string {
  const rnd =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}-${rnd}`;
}

/** 某酒款在指定日期仍未过期的开瓶余量（份） */
export function unexpiredOpenedServings(wine: Wine, onDate: string): number {
  return wine.opened
    .filter((b) => b.servingsLeft > 0 && b.freshUntil >= onDate)
    .reduce((sum, b) => sum + b.servingsLeft, 0);
}

export interface Availability {
  /** 未过期开瓶余量中还可出库的份数 */
  opened: number;
  /** 整瓶折算后还可出库的份数 */
  full: number;
}

/**
 * 占用判断：同一日期同一时段内，已排课与待配课程锁定的份数要先扣除，
 * 避免几个班次算到同一瓶酒。已上酒的课已实际扣减库存，不再占用。
 */
export function availabilityFor(
  state: BoardState,
  wineId: string,
  date: string,
  slot: Slot,
  excludeClassId?: string
): Availability {
  const wine = state.wines.find((w) => w.id === wineId);
  if (!wine) return { opened: 0, full: 0 };

  const occupied = state.classes
    .filter(
      (c) =>
        c.id !== excludeClassId &&
        c.date === date &&
        c.slot === slot &&
        (c.status === "scheduled" || c.status === "pending")
    )
    .flatMap((c) => c.allocations)
    .filter((a) => a.wineId === wineId)
    .reduce(
      (acc, a) => ({ opened: acc.opened + a.fromOpened, full: acc.full + a.fromFull }),
      { opened: 0, full: 0 }
    );

  const physicalOpened = unexpiredOpenedServings(wine, date);
  const physicalFull = wine.fullBottles * SERVINGS_PER_BOTTLE;
  // 总量上限：确认上酒新开瓶的余量也算在物理库存里，
  // 已被锁定的份数（含整瓶占用）要先从总量扣除，避免开剩被算重
  const freeTotal = Math.max(0, physicalOpened + physicalFull - occupied.opened - occupied.full);
  const opened = Math.min(Math.max(0, physicalOpened - occupied.opened), freeTotal);
  const full = Math.min(Math.max(0, physicalFull - occupied.full), freeTotal - opened);
  return { opened, full };
}

/** 排课：先用未过期余量，再补整瓶；仍不够的记录缺几份 */
export function allocateLines(state: BoardState, cls: ClassSession): LineAllocation[] {
  return cls.lines.map((line) => {
    const avail = availabilityFor(state, line.wineId, cls.date, cls.slot, cls.id);
    const fromOpened = Math.min(line.servings, avail.opened);
    const rest = line.servings - fromOpened;
    const fromFull = Math.min(rest, avail.full);
    return {
      wineId: line.wineId,
      needed: line.servings,
      fromOpened,
      fromFull,
      shortage: line.servings - fromOpened - fromFull,
    };
  });
}

/** 有缺口就留在待配区，否则进入已排课 */
function withAllocation(state: BoardState, cls: ClassSession): ClassSession {
  const allocations = allocateLines(state, cls);
  const hasShortage = allocations.some((a) => a.shortage > 0);
  return { ...cls, allocations, status: hasShortage ? "pending" : "scheduled" };
}

export function scheduleClass(state: BoardState, draft: ClassDraft): BoardState {
  const cls = withAllocation(state, {
    ...draft,
    id: uid("cls"),
    allocations: [],
    status: "scheduled",
    createdAt: todayIso(),
  });
  return { ...state, classes: [...state.classes, cls] };
}

/** 待配课程在补足库存后重新调配，仍不够就继续留在待配区 */
export function retryClass(state: BoardState, classId: string): BoardState {
  const target = state.classes.find((c) => c.id === classId);
  if (!target || target.status !== "pending") return state;
  const next = withAllocation(state, target);
  return { ...state, classes: state.classes.map((c) => (c.id === classId ? next : c)) };
}

/**
 * 讲师确认上酒：份额到这一刻才扣减。
 * 先按保鲜截止先到期先出扣开瓶余量，再现场开整瓶，新瓶登记保鲜截止。
 */
export function confirmClass(state: BoardState, classId: string, freshUntilForNew: string): BoardState {
  const cls = state.classes.find((c) => c.id === classId);
  if (!cls || cls.status !== "scheduled") return state;

  const wines = state.wines.map((w) => ({ ...w, opened: w.opened.map((b) => ({ ...b })) }));

  for (const alloc of cls.allocations) {
    const wine = wines.find((w) => w.id === alloc.wineId);
    if (!wine) continue;

    let need = alloc.fromOpened;
    const fifo = [...wine.opened].sort((a, b) => a.freshUntil.localeCompare(b.freshUntil));
    for (const bottle of fifo) {
      if (need <= 0) break;
      if (bottle.servingsLeft <= 0 || bottle.freshUntil < cls.date) continue;
      const take = Math.min(bottle.servingsLeft, need);
      bottle.servingsLeft -= take;
      need -= take;
    }

    if (alloc.fromFull > 0) {
      const bottlesToOpen = Math.min(wine.fullBottles, Math.ceil(alloc.fromFull / SERVINGS_PER_BOTTLE));
      wine.fullBottles -= bottlesToOpen;
      const leftover = bottlesToOpen * SERVINGS_PER_BOTTLE - alloc.fromFull;
      if (leftover > 0) {
        const bottle: OpenedBottle = {
          id: uid("btl"),
          openedOn: cls.date,
          freshUntil: freshUntilForNew,
          servingsLeft: leftover,
        };
        wine.opened.push(bottle);
      }
    }
  }

  const cleaned = wines.map((w) => ({ ...w, opened: w.opened.filter((b) => b.servingsLeft > 0) }));
  const classes = state.classes.map((c) =>
    c.id === classId ? { ...c, status: "served" as const, servedAt: todayIso() } : c
  );
  return { ...state, wines: cleaned, classes };
}

/**
 * 取消课程：整瓶占用退回库存，开瓶余量占用释放、原瓶保留到保鲜结束。
 * 份额要等讲师确认上酒才扣减，所以这里只需解除占用标记。
 */
export function cancelClass(state: BoardState, classId: string): BoardState {
  return {
    ...state,
    classes: state.classes.map((c) =>
      c.id === classId && (c.status === "scheduled" || c.status === "pending")
        ? { ...c, status: "cancelled" as const, cancelledAt: todayIso() }
        : c
    ),
  };
}

/** 重开课程：重新做占用判断，接着排 */
export function reopenClass(state: BoardState, classId: string): BoardState {
  const target = state.classes.find((c) => c.id === classId);
  if (!target || target.status !== "cancelled") return state;
  const next = withAllocation(state, { ...target, status: "scheduled" as const, cancelledAt: undefined });
  return { ...state, classes: state.classes.map((c) => (c.id === classId ? next : c)) };
}

/** 结课或取消后存档，从看板移入存档区 */
export function archiveClass(state: BoardState, classId: string): BoardState {
  const target = state.classes.find((c) => c.id === classId);
  if (!target || (target.status !== "served" && target.status !== "cancelled")) return state;
  const stamped = { ...target, archivedAt: todayIso() };
  return {
    ...state,
    classes: state.classes.filter((c) => c.id !== classId),
    archived: [stamped, ...state.archived],
  };
}

export function addFullBottles(state: BoardState, wineId: string, count: number): BoardState {
  if (!Number.isFinite(count) || count <= 0) return state;
  return {
    ...state,
    wines: state.wines.map((w) => (w.id === wineId ? { ...w, fullBottles: w.fullBottles + count } : w)),
  };
}

/** 登记开瓶：填余量与保鲜截止 */
export function registerOpenedBottle(
  state: BoardState,
  wineId: string,
  servings: number,
  freshUntil: string
): BoardState {
  if (!Number.isFinite(servings) || servings <= 0 || !freshUntil) return state;
  const bottle: OpenedBottle = { id: uid("btl"), openedOn: todayIso(), freshUntil, servingsLeft: servings };
  return {
    ...state,
    wines: state.wines.map((w) => (w.id === wineId ? { ...w, opened: [...w.opened, bottle] } : w)),
  };
}

/** 清理已过期或倒空的开瓶 */
export function pruneOpenedBottles(state: BoardState, wineId: string): BoardState {
  const today = todayIso();
  return {
    ...state,
    wines: state.wines.map((w) =>
      w.id === wineId
        ? { ...w, opened: w.opened.filter((b) => b.servingsLeft > 0 && b.freshUntil >= today) }
        : w
    ),
  };
}

export function addWine(state: BoardState, draft: WineDraft): BoardState {
  const wine: Wine = { ...draft, id: uid("wine"), opened: [] };
  return { ...state, wines: [...state.wines, wine] };
}
