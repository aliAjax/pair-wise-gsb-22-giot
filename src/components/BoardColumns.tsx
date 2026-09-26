import type { Dispatch } from "react";
import { SLOTS, type ClassSession, type ClassStatus, type Wine } from "../domain/types";
import type { Action } from "../store/board";
import ClassCard from "./ClassCard";

const COLUMNS: { status: ClassStatus; title: string; hint: string }[] = [
  { status: "pending", title: "待配区", hint: "超出同时段可出库份数，等待补货后重新调配" },
  { status: "scheduled", title: "已排课", hint: "占用已锁定，讲师确认上酒才扣减份额" },
  { status: "served", title: "已上酒", hint: "份额已扣减，结课后存档" },
  { status: "cancelled", title: "已取消", hint: "整瓶已退回，余量保留到保鲜结束，可重开" },
];

function sortByTime(a: ClassSession, b: ClassSession): number {
  if (a.date !== b.date) return a.date.localeCompare(b.date);
  return SLOTS.indexOf(a.slot) - SLOTS.indexOf(b.slot);
}

export default function BoardColumns({
  classes,
  wines,
  dispatch,
}: {
  classes: ClassSession[];
  wines: Wine[];
  dispatch: Dispatch<Action>;
}) {
  return (
    <div className="board-grid">
      {COLUMNS.map((col) => {
        const list = classes.filter((c) => c.status === col.status).sort(sortByTime);
        return (
          <section key={col.status} className={`board-column col-${col.status}`}>
            <header>
              <h2>
                {col.title}
                <span className="count">{list.length}</span>
              </h2>
              <p>{col.hint}</p>
            </header>
            {list.length === 0 && <p className="empty-note">暂无课程</p>}
            {list.map((cls) => (
              <ClassCard key={cls.id} cls={cls} wines={wines} dispatch={dispatch} />
            ))}
          </section>
        );
      })}
    </div>
  );
}
