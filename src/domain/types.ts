/** 每瓶可出的样酒份数（750ml / 约 60ml 一份） */
export const SERVINGS_PER_BOTTLE = 12;
/** 开瓶后默认保鲜天数 */
export const DEFAULT_FRESH_DAYS = 3;

export const SLOTS = ["上午", "下午", "晚间"] as const;
export type Slot = (typeof SLOTS)[number];

/** 开瓶余量：每一瓶单独记账，开瓶时填保鲜截止 */
export interface OpenedBottle {
  id: string;
  openedOn: string;
  freshUntil: string;
  servingsLeft: number;
}

/** 酒款资料：整瓶与开瓶余量分开记 */
export interface Wine {
  id: string;
  name: string;
  region: string;
  grape: string;
  vintage: string;
  fullBottles: number;
  opened: OpenedBottle[];
}

export interface ClassLine {
  wineId: string;
  servings: number;
}

/** 一行的占用判断结果：余量出多少、整瓶补多少、还缺几份 */
export interface LineAllocation {
  wineId: string;
  needed: number;
  fromOpened: number;
  fromFull: number;
  shortage: number;
}

export type ClassStatus = "pending" | "scheduled" | "served" | "cancelled";

export interface ClassSession {
  id: string;
  title: string;
  instructor: string;
  date: string;
  slot: Slot;
  lines: ClassLine[];
  allocations: LineAllocation[];
  status: ClassStatus;
  createdAt: string;
  servedAt?: string;
  cancelledAt?: string;
  archivedAt?: string;
}

export interface ClassDraft {
  title: string;
  instructor: string;
  date: string;
  slot: Slot;
  lines: ClassLine[];
}

export interface WineDraft {
  name: string;
  region: string;
  grape: string;
  vintage: string;
  fullBottles: number;
}

export interface BoardState {
  wines: Wine[];
  classes: ClassSession[];
  archived: ClassSession[];
}
