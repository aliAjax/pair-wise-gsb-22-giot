export function toIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayIso(): string {
  return toIso(new Date());
}

export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return toIso(d);
}

/** 保鲜截止早于上课日期即为对该课已过期（ISO 日期可直接按字符串比较） */
export function isExpiredOn(freshUntil: string, onDate: string): boolean {
  return freshUntil < onDate;
}
