import { useState, type Dispatch } from "react";
import { addDays } from "../domain/dates";
import { DEFAULT_FRESH_DAYS, type ClassSession, type Wine } from "../domain/types";
import type { Action } from "../store/board";

const STATUS_LABEL: Record<ClassSession["status"], string> = {
  pending: "待配",
  scheduled: "已排",
  served: "已上酒",
  cancelled: "已取消",
};

export default function ClassCard({
  cls,
  wines,
  dispatch,
}: {
  cls: ClassSession;
  wines: Wine[];
  dispatch: Dispatch<Action>;
}) {
  const [confirming, setConfirming] = useState(false);
  const [freshUntil, setFreshUntil] = useState(addDays(cls.date, DEFAULT_FRESH_DAYS));
  const needsNewBottles = cls.allocations.some((a) => a.fromFull > 0);
  const wineName = (id: string) => wines.find((w) => w.id === id)?.name ?? "未知酒款";
  const sum = (key: "fromOpened" | "fromFull") => cls.allocations.reduce((s, a) => s + a[key], 0);

  const confirm = () => {
    dispatch({ type: "confirm", classId: cls.id, freshUntil });
    setConfirming(false);
  };

  return (
    <article className={`class-card status-${cls.status}`}>
      <header>
        <div>
          <h3>{cls.title}</h3>
          <p className="muted">
            {cls.instructor} · {cls.date} {cls.slot}
          </p>
        </div>
        <span className={`tag tag-${cls.status}`}>{STATUS_LABEL[cls.status]}</span>
      </header>

      <ul className="alloc-list">
        {cls.lines.map((line) => {
          const alloc = cls.allocations.find((a) => a.wineId === line.wineId);
          return (
            <li key={line.wineId}>
              <span className="alloc-name">
                {wineName(line.wineId)} × {line.servings} 份
              </span>
              {alloc && (
                <span className="alloc-detail">
                  {alloc.fromOpened > 0 && <em>余量 {alloc.fromOpened}</em>}
                  {alloc.fromFull > 0 && <em>整瓶 {alloc.fromFull}</em>}
                  {alloc.shortage > 0 && <em className="shortage">缺 {alloc.shortage} 份</em>}
                </span>
              )}
            </li>
          );
        })}
      </ul>

      {cls.status === "pending" && (
        <>
          <p className="card-note">超出同时段可出库份数，已锁定的部分仍被占用；补足库存后重新调配。</p>
          <footer>
            <button className="primary-action" onClick={() => dispatch({ type: "retry", classId: cls.id })}>
              重新调配
            </button>
            <button onClick={() => dispatch({ type: "cancel", classId: cls.id })}>取消课程</button>
          </footer>
        </>
      )}

      {cls.status === "scheduled" && !confirming && (
        <footer>
          <button
            className="primary-action"
            onClick={() =>
              needsNewBottles
                ? setConfirming(true)
                : dispatch({ type: "confirm", classId: cls.id, freshUntil })
            }
          >
            讲师确认上酒
          </button>
          <button onClick={() => dispatch({ type: "cancel", classId: cls.id })}>取消课程</button>
        </footer>
      )}

      {cls.status === "scheduled" && confirming && (
        <div className="confirm-bar">
          <label>
            <span>新开瓶保鲜截止</span>
            <input type="date" value={freshUntil} onChange={(e) => setFreshUntil(e.target.value)} />
          </label>
          <div>
            <button className="primary-action" onClick={confirm}>
              确认扣减
            </button>
            <button onClick={() => setConfirming(false)}>返回</button>
          </div>
        </div>
      )}

      {cls.status === "served" && (
        <>
          <p className="card-note">份额已扣减{cls.servedAt ? `（${cls.servedAt}）` : ""}，新开瓶余量已登记保鲜截止。</p>
          <footer>
            <button className="primary-action" onClick={() => dispatch({ type: "archive", classId: cls.id })}>
              结课存档
            </button>
          </footer>
        </>
      )}

      {cls.status === "cancelled" && (
        <>
          <p className="card-note">
            整瓶 {sum("fromFull")} 份已退回库存，余量 {sum("fromOpened")} 份保留到保鲜结束。
          </p>
          <footer>
            <button className="primary-action" onClick={() => dispatch({ type: "reopen", classId: cls.id })}>
              重开接着排
            </button>
            <button onClick={() => dispatch({ type: "archive", classId: cls.id })}>存档</button>
          </footer>
        </>
      )}
    </article>
  );
}
