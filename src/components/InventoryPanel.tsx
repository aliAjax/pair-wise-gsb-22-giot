// 页面：库存面板 —— 整瓶与开瓶余量分开展示，开瓶需填保鲜截止

import { useState } from "react";
import { FRESHNESS_DAYS, Wine } from "../domain/types";
import { expiredPours, usableOpenedPours } from "../domain/allocation";
import { addDays, isoToday } from "../domain/dates";

interface Props {
  wines: Wine[];
  onRestock: (wineId: string, bottles: number) => void;
  onOpenBottle: (wineId: string, freshUntil: string) => void;
  onAddWine: (wine: { name: string; region: string; grape: string; sealedBottles: number }) => void;
}

export default function InventoryPanel({ wines, onRestock, onOpenBottle, onAddWine }: Props) {
  const today = isoToday();
  const [openingFor, setOpeningFor] = useState<string | null>(null);
  const [freshUntil, setFreshUntil] = useState(addDays(today, FRESHNESS_DAYS));
  const [showAdd, setShowAdd] = useState(false);
  const [draft, setDraft] = useState({ name: "", region: "", grape: "", sealedBottles: 1 });

  const submitWine = () => {
    if (!draft.name.trim()) return;
    onAddWine({
      name: draft.name.trim(),
      region: draft.region.trim() || "未填产区",
      grape: draft.grape.trim() || "未填品种",
      sealedBottles: Math.max(0, Math.floor(draft.sealedBottles) || 0),
    });
    setDraft({ name: "", region: "", grape: "", sealedBottles: 1 });
    setShowAdd(false);
  };

  return (
    <aside className="panel inventory">
      <div className="section-heading">
        <div>
          <p>样酒库存</p>
          <h2>整瓶 / 开瓶余量</h2>
        </div>
        <button onClick={() => setShowAdd((v) => !v)}>{showAdd ? "收起" : "新增酒款"}</button>
      </div>

      {showAdd && (
        <div className="inline-form">
          <input
            placeholder="酒款名称"
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
          <input
            placeholder="产区"
            value={draft.region}
            onChange={(e) => setDraft({ ...draft, region: e.target.value })}
          />
          <input
            placeholder="葡萄品种"
            value={draft.grape}
            onChange={(e) => setDraft({ ...draft, grape: e.target.value })}
          />
          <label className="inline-field">
            <span>整瓶数</span>
            <input
              type="number"
              min={0}
              value={draft.sealedBottles}
              onChange={(e) => setDraft({ ...draft, sealedBottles: Number(e.target.value) })}
            />
          </label>
          <button className="primary-action" onClick={submitWine}>
            保存酒款
          </button>
        </div>
      )}

      <div className="wine-list">
        {wines.map((wine) => {
          const usable = usableOpenedPours(wine, today);
          const expired = expiredPours(wine, today);
          return (
            <article key={wine.id} className="wine-card">
              <div className="wine-head">
                <div>
                  <h3>{wine.name}</h3>
                  <p>
                    {wine.region} · {wine.grape}
                  </p>
                </div>
                <div className="sealed-count">
                  <strong>{wine.sealedBottles}</strong>
                  <span>整瓶</span>
                </div>
              </div>

              <ul className="opened-list">
                {wine.opened.filter((o) => o.remainingPours > 0).length === 0 && (
                  <li className="opened-empty">暂无开瓶余量</li>
                )}
                {wine.opened
                  .filter((o) => o.remainingPours > 0)
                  .map((o) => {
                    const isExpired = o.freshUntil < today;
                    return (
                      <li key={o.id} className={isExpired ? "opened-expired" : ""}>
                        <span>余 {o.remainingPours} 份</span>
                        <span>
                          {isExpired ? "已过期 · " : "保鲜至 "}
                          {o.freshUntil}
                        </span>
                      </li>
                    );
                  })}
              </ul>

              <div className="wine-meta">
                <span>可用余量 {usable} 份</span>
                {expired > 0 && <span className="badge-danger">过期 {expired} 份</span>}
              </div>

              <div className="wine-actions">
                <button onClick={() => onRestock(wine.id, 1)}>补货 +1 瓶</button>
                <button
                  disabled={wine.sealedBottles <= 0}
                  onClick={() => {
                    setOpeningFor(openingFor === wine.id ? null : wine.id);
                    setFreshUntil(addDays(today, FRESHNESS_DAYS));
                  }}
                >
                  开瓶
                </button>
              </div>

              {openingFor === wine.id && (
                <div className="inline-form">
                  <label className="inline-field">
                    <span>保鲜截止</span>
                    <input
                      type="date"
                      value={freshUntil}
                      min={today}
                      onChange={(e) => setFreshUntil(e.target.value)}
                    />
                  </label>
                  <button
                    className="primary-action"
                    onClick={() => {
                      onOpenBottle(wine.id, freshUntil);
                      setOpeningFor(null);
                    }}
                  >
                    确认开瓶
                  </button>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </aside>
  );
}
