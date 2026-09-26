import { useState, type Dispatch } from "react";
import { todayIso } from "../domain/dates";
import { SLOTS, type ClassLine, type Slot, type Wine } from "../domain/types";
import type { Action } from "../store/board";

export default function ScheduleForm({
  wines,
  dispatch,
}: {
  wines: Wine[];
  dispatch: Dispatch<Action>;
}) {
  const [title, setTitle] = useState("");
  const [instructor, setInstructor] = useState("");
  const [date, setDate] = useState(todayIso());
  const [slot, setSlot] = useState<Slot>("晚间");
  const [lines, setLines] = useState<ClassLine[]>([{ wineId: wines[0]?.id ?? "", servings: 12 }]);

  const setLine = (index: number, patch: Partial<ClassLine>) =>
    setLines((ls) => ls.map((l, i) => (i === index ? { ...l, ...patch } : l)));

  const submit = () => {
    const cleanLines = lines.filter((l) => l.wineId && l.servings > 0);
    if (!title.trim() || cleanLines.length === 0) return;
    dispatch({
      type: "schedule",
      draft: { title: title.trim(), instructor: instructor.trim() || "未定", date, slot, lines: cleanLines },
    });
    setTitle("");
    setLines([{ wineId: wines[0]?.id ?? "", servings: 12 }]);
  };

  return (
    <section className="panel schedule-form">
      <div className="section-heading">
        <div>
          <p>排课</p>
          <h2>申请样酒</h2>
        </div>
        <button className="primary-action" onClick={submit}>
          提交排课
        </button>
      </div>
      <div className="form-grid">
        <label>
          <span>课程名称</span>
          <input placeholder="如：波尔多进阶盲品" value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label>
          <span>讲师</span>
          <input placeholder="讲师姓名" value={instructor} onChange={(e) => setInstructor(e.target.value)} />
        </label>
        <label>
          <span>日期</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label>
          <span>时段</span>
          <select value={slot} onChange={(e) => setSlot(e.target.value as Slot)}>
            {SLOTS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="line-editor">
        {lines.map((line, i) => (
          <div className="line-row" key={i}>
            <select value={line.wineId} onChange={(e) => setLine(i, { wineId: e.target.value })}>
              {wines.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}（{w.region}）
                </option>
              ))}
            </select>
            <input
              type="number"
              min={1}
              value={line.servings}
              onChange={(e) => setLine(i, { servings: Number(e.target.value) })}
              aria-label="需要份数"
            />
            <button
              className="ghost"
              disabled={lines.length === 1}
              onClick={() => setLines((ls) => ls.filter((_, x) => x !== i))}
            >
              移除
            </button>
          </div>
        ))}
        <button
          className="ghost"
          onClick={() => setLines((ls) => [...ls, { wineId: wines[0]?.id ?? "", servings: 12 }])}
        >
          + 加一款酒
        </button>
      </div>
      <p className="form-hint">提交后先做占用判断：先用未过期余量再补整瓶，同一时段不够就进待配区并标注缺几份。</p>
    </section>
  );
}
