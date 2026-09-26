// 领域模型：样酒库存与排课

/** 每瓶可出的品鉴份数 */
export const POURS_PER_BOTTLE = 6;

/** 开瓶后默认保鲜天数 */
export const FRESHNESS_DAYS = 3;

export const SLOTS = ["上午", "下午", "晚上"] as const;

/** 已开瓶：单独记录余量与保鲜截止 */
export interface OpenedBottle {
  id: string;
  remainingPours: number;
  openedOn: string; // ISO 日期
  freshUntil: string; // 保鲜截止（含当天），ISO 日期
}

/** 酒款：整瓶库存与开瓶余量分开记 */
export interface Wine {
  id: string;
  name: string;
  region: string;
  grape: string;
  sealedBottles: number;
  opened: OpenedBottle[];
}

export interface SessionLine {
  wineId: string;
  pours: number;
}

/** 一行排配结果：先用余量，再补整瓶，不够记缺几份 */
export interface LinePlan {
  wineId: string;
  requested: number;
  fromOpened: number;
  bottlesToOpen: number;
  shortage: number;
}

export type SessionStatus = "pending" | "ready" | "served" | "cancelled";

export interface Session {
  id: string;
  title: string;
  date: string; // ISO 日期
  slot: string; // 时段
  lines: SessionLine[];
  plan: LinePlan[];
  status: SessionStatus;
  createdAt: number;
}

export interface BoardState {
  wines: Wine[];
  sessions: Session[];
}
