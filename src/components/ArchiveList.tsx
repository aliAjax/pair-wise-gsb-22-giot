import type { ClassSession, Wine } from "../domain/types";

export default function ArchiveList({
  archived,
  wines,
}: {
  archived: ClassSession[];
  wines: Wine[];
}) {
  const wineName = (id: string) => wines.find((w) => w.id === id)?.name ?? "未知酒款";

  return (
    <section className="panel archive">
      <div className="section-heading">
        <div>
          <p>存档</p>
          <h2>已归档课程（{archived.length}）</h2>
        </div>
      </div>
      {archived.length === 0 && <p className="empty-note">已上酒或已取消的课程存档后会出现在这里。</p>}
      <div className="archive-list">
        {archived.map((cls) => (
          <article key={cls.id} className="archive-row">
            <div>
              <h3>{cls.title}</h3>
              <p className="muted">
                {cls.instructor} · {cls.date} {cls.slot} ·{" "}
                {cls.lines.map((l) => `${wineName(l.wineId)} ${l.servings} 份`).join("、")}
              </p>
            </div>
            <span className={`tag tag-${cls.status}`}>
              {cls.status === "served" ? "已上酒" : "已取消"} · 存档于 {cls.archivedAt}
            </span>
          </article>
        ))}
      </div>
    </section>
  );
}
