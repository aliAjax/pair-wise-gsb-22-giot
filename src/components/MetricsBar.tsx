import { todayIso } from "../domain/dates";
import type { BoardState } from "../domain/types";

export default function MetricsBar({ state }: { state: BoardState }) {
  const today = todayIso();
  const fullBottles = state.wines.reduce((s, w) => s + w.fullBottles, 0);
  const freshServings = state.wines.reduce(
    (s, w) =>
      s +
      w.opened
        .filter((b) => b.servingsLeft > 0 && b.freshUntil >= today)
        .reduce((x, b) => x + b.servingsLeft, 0),
    0
  );
  const pending = state.classes.filter((c) => c.status === "pending");
  const shortage = pending.flatMap((c) => c.allocations).reduce((s, a) => s + a.shortage, 0);
  const scheduled = state.classes.filter((c) => c.status === "scheduled").length;

  const metrics = [
    { label: "整瓶库存", value: `${fullBottles} 瓶`, tone: "status-ok", note: "未开瓶" },
    { label: "未过期余量", value: `${freshServings} 份`, tone: "status-ok", note: "保鲜期内可用" },
    {
      label: "待配缺额",
      value: `${shortage} 份`,
      tone: shortage > 0 ? "status-danger" : "status-ok",
      note: `${pending.length} 场在待配区`,
    },
    { label: "已排课程", value: `${scheduled} 场`, tone: "status-watch", note: "占用已锁定" },
  ];

  return (
    <section className="metrics-grid">
      {metrics.map((m) => (
        <article key={m.label} className="metric-card">
          <span>{m.label}</span>
          <strong>{m.value}</strong>
          <em>{m.note}</em>
          <i className={m.tone} />
        </article>
      ))}
    </section>
  );
}
