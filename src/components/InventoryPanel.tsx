import { useState, type Dispatch } from "react";
import { addDays, todayIso } from "../domain/dates";
import { DEFAULT_FRESH_DAYS, SERVINGS_PER_BOTTLE, type Wine, type WineDraft } from "../domain/types";
import type { Action } from "../store/board";

function bottleTag(freshUntil: string, today: string): { text: string; cls: string } {
  if (freshUntil < today) return { text: "已过期", cls: "tag tag-danger" };
  if (freshUntil <= addDays(today, 1)) return { text: "临期", cls: "tag tag-warn" };
  return { text: "可用", cls: "tag tag-ok" };
}

function WineCard({ wine, dispatch }: { wine: Wine; dispatch: Dispatch<Action> }) {
  const today = todayIso();
  const [restock, setRestock] = useState(1);
  const [openServings, setOpenServings] = useState(SERVINGS_PER_BOTTLE);
  const [freshUntil, setFreshUntil] = useState(addDays(today, DEFAULT_FRESH_DAYS));
  const prunable = wine.opened.filter((b) => b.servingsLeft <= 0 || b.freshUntil < today).length;

  return (
    <article className="wine-card">
      <header>
        <div>
          <h3>{wine.name}</h3>
          <p>
            {wine.region} · {wine.grape} · {wine.vintage}
          </p>
        </div>
        <span className="tag tag-strong">{wine.fullBottles} 整瓶</span>
      </header>

      <div className="bottle-list">
        {wine.opened.length === 0 && <p className="empty-note">暂无开瓶余量</p>}
        {wine.opened.map((b) => {
          const tag = bottleTag(b.freshUntil, today);
          return (
            <div key={b.id} className="bottle-row">
              <span>余 {b.servingsLeft} 份</span>
              <span className="muted">保鲜至 {b.freshUntil}</span>
              <i className={tag.cls}>{tag.text}</i>
            </div>
          );
        })}
      </div>

      <div className="wine-actions">
        <div className="mini-form">
          <input
            type="number"
            min={1}
            value={restock}
            onChange={(e) => setRestock(Number(e.target.value))}
            aria-label="入库瓶数"
          />
          <button onClick={() => dispatch({ type: "restock", wineId: wine.id, count: restock })}>
            整瓶入库
          </button>
        </div>
        <div className="mini-form">
          <input
            type="number"
            min={1}
            max={SERVINGS_PER_BOTTLE}
            value={openServings}
            onChange={(e) => setOpenServings(Number(e.target.value))}
            aria-label="开瓶余量份数"
          />
          <input
            type="date"
            value={freshUntil}
            onChange={(e) => setFreshUntil(e.target.value)}
            aria-label="保鲜截止"
          />
          <button
            onClick={() =>
              dispatch({ type: "openBottle", wineId: wine.id, servings: openServings, freshUntil })
            }
          >
            登记开瓶
          </button>
        </div>
        <button
          className="ghost"
          disabled={prunable === 0}
          onClick={() => dispatch({ type: "prune", wineId: wine.id })}
        >
          清理过期（{prunable}）
        </button>
      </div>
    </article>
  );
}

function AddWineForm({ dispatch }: { dispatch: Dispatch<Action> }) {
  const [draft, setDraft] = useState<WineDraft>({
    name: "",
    region: "",
    grape: "",
    vintage: "",
    fullBottles: 1,
  });
  const set = (patch: Partial<WineDraft>) => setDraft((d) => ({ ...d, ...patch }));
  const submit = () => {
    if (!draft.name.trim()) return;
    dispatch({ type: "addWine", draft: { ...draft, name: draft.name.trim() } });
    setDraft({ name: "", region: "", grape: "", vintage: "", fullBottles: 1 });
  };

  return (
    <div className="add-wine">
      <h3>新增酒款</h3>
      <input placeholder="酒款名" value={draft.name} onChange={(e) => set({ name: e.target.value })} />
      <div className="mini-form">
        <input placeholder="产区" value={draft.region} onChange={(e) => set({ region: e.target.value })} />
        <input placeholder="品种" value={draft.grape} onChange={(e) => set({ grape: e.target.value })} />
      </div>
      <div className="mini-form">
        <input placeholder="年份" value={draft.vintage} onChange={(e) => set({ vintage: e.target.value })} />
        <input
          type="number"
          min={0}
          value={draft.fullBottles}
          onChange={(e) => set({ fullBottles: Number(e.target.value) })}
          aria-label="初始整瓶"
        />
      </div>
      <button className="primary-action" onClick={submit}>
        加入库存
      </button>
    </div>
  );
}

export default function InventoryPanel({
  wines,
  dispatch,
}: {
  wines: Wine[];
  dispatch: Dispatch<Action>;
}) {
  return (
    <aside className="panel inventory">
      <div className="section-heading">
        <div>
          <p>酒款库存</p>
          <h2>整瓶与开瓶余量</h2>
        </div>
      </div>
      <div className="wine-list">
        {wines.map((w) => (
          <WineCard key={w.id} wine={w} dispatch={dispatch} />
        ))}
      </div>
      <AddWineForm dispatch={dispatch} />
    </aside>
  );
}
