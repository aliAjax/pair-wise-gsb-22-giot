// 页面组合：看板状态在内存中维护，变更后自动存档

import { useEffect, useState } from "react";
import "./styles.css";
import { BoardState } from "./domain/types";
import {
  addWine,
  cancelSession,
  confirmSession,
  openBottle,
  reopenSession,
  replanOne,
  restock,
  scheduleSession,
  SessionDraft,
} from "./domain/allocation";
import { isoToday, addDays } from "./domain/dates";
import { seedState } from "./data/seed";
import { clearState, loadState, saveState } from "./store/persistence";
import InventoryPanel from "./components/InventoryPanel";
import SessionForm from "./components/SessionForm";
import SessionBoard from "./components/SessionBoard";

const project = {
  id: "hxwl-08",
  port: 5108,
  title: "盲品样酒调度看板",
  subtitle:
    "整瓶与开瓶余量分开记，排课先用未过期余量再补整瓶；同一时段超出可出库份数的课程留在待配区并标明缺几份。讲师确认上酒后份额才扣减，取消退整瓶、余量保留到保鲜结束。",
  stack: "React + Vite + TypeScript + CSS",
};

function MetricCard({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <article className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <i className={tone} />
    </article>
  );
}

function App() {
  const [state, setState] = useState<BoardState>(() => loadState() ?? seedState());
  const [notice, setNotice] = useState("");

  useEffect(() => {
    saveState(state);
  }, [state]);

  const today = isoToday();

  const handleConfirm = (id: string) => {
    const result = confirmSession(state, id, today);
    if (result.shortages.length > 0) {
      const names = result.shortages
        .map((s) => {
          const wine = state.wines.find((w) => w.id === s.wineId);
          return `${wine?.name ?? s.wineId} 缺 ${s.missing} 份`;
        })
        .join("；");
      setNotice(`库存不足，无法上酒：${names}`);
      return;
    }
    setNotice("");
    setState(result.state);
  };

  const handleReset = () => {
    clearState();
    setState(seedState());
    setNotice("");
  };

  const soonExpired = state.wines.reduce(
    (sum, w) =>
      sum +
      w.opened
        .filter((o) => o.remainingPours > 0 && o.freshUntil >= today && o.freshUntil <= addDays(today, 1))
        .reduce((s, o) => s + o.remainingPours, 0),
    0
  );

  const metrics = [
    { label: "酒款总数", value: state.wines.length, tone: "status-ok" },
    { label: "待配课程", value: state.sessions.filter((s) => s.status === "pending").length, tone: "status-danger" },
    { label: "待上酒课程", value: state.sessions.filter((s) => s.status === "ready").length, tone: "status-watch" },
    { label: "临期余量（份）", value: soonExpired, tone: "status-watch" },
  ];

  return (
    <main className="app-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">
            {project.id} · port {project.port}
          </p>
          <h1>{project.title}</h1>
          <p className="subtitle">{project.subtitle}</p>
        </div>
        <div className="stack-card">
          <span>技术栈</span>
          <strong>{project.stack}</strong>
          <button onClick={handleReset}>重置示例数据</button>
        </div>
      </section>

      <section className="metrics-grid">
        {metrics.map((m) => (
          <MetricCard key={m.label} label={m.label} value={m.value} tone={m.tone} />
        ))}
      </section>

      {notice && <div className="notice">{notice}</div>}

      <section className="workspace">
        <InventoryPanel
          wines={state.wines}
          onRestock={(wineId, n) => setState((s) => restock(s, wineId, n))}
          onOpenBottle={(wineId, freshUntil) => setState((s) => openBottle(s, wineId, freshUntil, today))}
          onAddWine={(wine) => setState((s) => addWine(s, wine))}
        />
        <SessionForm wines={state.wines} onSchedule={(draft: SessionDraft) => setState((s) => scheduleSession(s, draft))} />
      </section>

      <SessionBoard
        sessions={state.sessions}
        wines={state.wines}
        onConfirm={handleConfirm}
        onCancel={(id) => setState((s) => cancelSession(s, id))}
        onReopen={(id) => setState((s) => reopenSession(s, id))}
        onReplan={(id) => setState((s) => replanOne(s, id))}
      />
    </main>
  );
}

export default App;
