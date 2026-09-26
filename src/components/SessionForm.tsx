// 页面：排课表单 —— 选择日期时段与每款酒需要的份数

import { useState } from "react";
import { SLOTS, SessionLine, Wine } from "../domain/types";
import { SessionDraft } from "../domain/allocation";
import { isoToday } from "../domain/dates";

interface Props {
  wines: Wine[];
  onSchedule: (draft: SessionDraft) => void;
}

export default function SessionForm({ wines, onSchedule }: Props) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(isoToday());
  const [slot, setSlot] = useState<string>(SLOTS[2]);
  const [lines, setLines] = useState<SessionLine[]>([
    { wineId: wines[0]?.id ?? "", pours: 4 },
  ]);

  const setLine = (index: number, patch: Partial<SessionLine>) => {
    setLines(lines.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  };

  const submit = () => {
    const validLines = lines.filter((l) => l.wineId && l.pours > 0);
    if (!title.trim() || validLines.length === 0) return;
    onSchedule({ title: title.trim(), date, slot, lines: validLines });
    setTitle("");
    setLines([{ wineId: wines[0]?.id ?? "", pours: 4 }]);
  };

  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <p>排课</p>
          <h2>新课排酒</h2>
        </div>
      </div>
      <div className="session-form">
        <input
          placeholder="课程名称，如：波尔多对照品鉴"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <div className="form-row">
          <label className="inline-field">
            <span>日期</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label className="inline-field">
            <span>时段</span>
            <select value={slot} onChange={(e) => setSlot(e.target.value)}>
              {SLOTS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        </div>

        {lines.map((line, index) => (
          <div className="form-row" key={index}>
            <select
              value={line.wineId}
              onChange={(e) => setLine(index, { wineId: e.target.value })}
            >
              {wines.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}（{w.region}）
                </option>
              ))}
            </select>
            <label className="inline-field">
              <span>份数</span>
              <input
                type="number"
                min={1}
                value={line.pours}
                onChange={(e) => setLine(index, { pours: Number(e.target.value) })}
              />
            </label>
            <button
              className="ghost-button"
              disabled={lines.length <= 1}
              onClick={() => setLines(lines.filter((_, i) => i !== index))}
            >
              移除
            </button>
          </div>
        ))}

        <div className="form-actions">
          <button
            onClick={() =>
              setLines([...lines, { wineId: wines[0]?.id ?? "", pours: 4 }])
            }
          >
            + 加一款酒
          </button>
          <button className="primary-action" onClick={submit}>
            排课并占用份额
          </button>
        </div>
      </div>
    </section>
  );
}
