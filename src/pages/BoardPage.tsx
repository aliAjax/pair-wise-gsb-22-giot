import type { Dispatch } from "react";
import { SERVINGS_PER_BOTTLE, type BoardState } from "../domain/types";
import type { Action } from "../store/board";
import MetricsBar from "../components/MetricsBar";
import InventoryPanel from "../components/InventoryPanel";
import ScheduleForm from "../components/ScheduleForm";
import BoardColumns from "../components/BoardColumns";
import ArchiveList from "../components/ArchiveList";

export default function BoardPage({
  state,
  dispatch,
}: {
  state: BoardState;
  dispatch: Dispatch<Action>;
}) {
  return (
    <main className="app-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">hxwl-08 · 样酒调度</p>
          <h1>盲品课样酒调度看板</h1>
          <p className="subtitle">
            整瓶与开瓶余量分开记账：排课先占未过期余量、再补整瓶；同一时段超出可出库份数的课程留在待配区并标注缺几份。
            讲师确认上酒后份额才扣减，取消退整瓶、开瓶余量保留到保鲜结束，重开还能接着排。
          </p>
        </div>
        <div className="stack-card">
          <span>规则速览</span>
          <strong>每瓶 {SERVINGS_PER_BOTTLE} 份 · 先余量后整瓶 · 确认上酒才扣减</strong>
          <button onClick={() => dispatch({ type: "reset" })}>重置示例数据</button>
        </div>
      </section>

      <MetricsBar state={state} />

      <section className="workspace">
        <InventoryPanel wines={state.wines} dispatch={dispatch} />
        <div className="board-side">
          <ScheduleForm wines={state.wines} dispatch={dispatch} />
          <BoardColumns classes={state.classes} wines={state.wines} dispatch={dispatch} />
        </div>
      </section>

      <ArchiveList archived={state.archived} wines={state.wines} />
    </main>
  );
}
