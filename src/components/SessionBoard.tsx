// 页面：调度看板 —— 待配区 / 已排课 / 已上酒 / 已取消 四列

import { Session, SessionStatus, Wine } from "../domain/types";
import { SLOTS } from "../domain/types";

interface Props {
  sessions: Session[];
  wines: Wine[];
  onConfirm: (id: string) => void;
  onCancel: (id: string) => void;
  onReopen: (id: string) => void;
  onReplan: (id: string) => void;
}

const COLUMNS: { status: SessionStatus; title: string; hint: string }[] = [
  { status: "pending", title: "待配区", hint: "超出可出库份数，等补货或重排" },
  { status: "ready", title: "已排课", hint: "份额已占用，待讲师确认上酒" },
  { status: "served", title: "已上酒", hint: "份额已扣减" },
  { status: "cancelled", title: "已取消", hint: "整瓶已退回，可重开续排" },
];

function wineName(wines: Wine[], id: string): string {
  return wines.find((w) => w.id === id)?.name ?? "未知酒款";
}

function slotRank(slot: string): number {
  const i = SLOTS.indexOf(slot as (typeof SLOTS)[number]);
  return i === -1 ? SLOTS.length : i;
}

export default function SessionBoard({
  sessions,
  wines,
  onConfirm,
  onCancel,
  onReopen,
  onReplan,
}: Props) {
  const sorted = [...sessions].sort(
    (a, b) =>
      a.date.localeCompare(b.date) || slotRank(a.slot) - slotRank(b.slot) || a.createdAt - b.createdAt
  );

  return (
    <div className="board">
      {COLUMNS.map((col) => {
        const list = sorted.filter((s) => s.status === col.status);
        return (
          <section key={col.status} className={`board-column col-${col.status}`}>
            <header>
              <h2>
                {col.title}
                <span className="count">{list.length}</span>
              </h2>
              <p>{col.hint}</p>
            </header>
            {list.length === 0 && <div className="column-empty">暂无课程</div>}
            {list.map((s) => (
              <article key={s.id} className="session-card">
                <div className="session-head">
                  <h3>{s.title}</h3>
                  <span className="session-time">
                    {s.date} · {s.slot}
                  </span>
                </div>
                <ul className="session-lines">
                  {s.lines.map((line, i) => {
                    const plan = s.plan.find((p) => p.wineId === line.wineId);
                    return (
                      <li key={`${line.wineId}-${i}`}>
                        <span className="line-name">
                          {wineName(wines, line.wineId)} × {line.pours} 份
                        </span>
                        {plan && s.status !== "served" && s.status !== "cancelled" && (
                          <span className="line-plan">
                            {plan.fromOpened > 0 && <em className="badge-ok">余量 {plan.fromOpened}</em>}
                            {plan.bottlesToOpen > 0 && (
                              <em className="badge-warn">新开 {plan.bottlesToOpen} 瓶</em>
                            )}
                            {plan.shortage > 0 && (
                              <em className="badge-danger">缺 {plan.shortage} 份</em>
                            )}
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
                <div className="session-actions">
                  {s.status === "ready" && (
                    <>
                      <button className="primary-action" onClick={() => onConfirm(s.id)}>
                        确认上酒
                      </button>
                      <button onClick={() => onCancel(s.id)}>取消</button>
                    </>
                  )}
                  {s.status === "pending" && (
                    <>
                      <button onClick={() => onReplan(s.id)}>重新排配</button>
                      <button onClick={() => onCancel(s.id)}>取消</button>
                    </>
                  )}
                  {s.status === "served" && <span className="badge-ok">份额已扣减</span>}
                  {s.status === "cancelled" && (
                    <button onClick={() => onReopen(s.id)}>重开续排</button>
                  )}
                </div>
              </article>
            ))}
          </section>
        );
      })}
    </div>
  );
}
