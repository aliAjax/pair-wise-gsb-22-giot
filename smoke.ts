import { buildSeed } from "./src/domain/seed";
import {
  availabilityFor,
  confirmClass,
  cancelClass,
  reopenClass,
  retryClass,
  addFullBottles,
  archiveClass,
} from "./src/domain/allocation";
import { todayIso, addDays } from "./src/domain/dates";

let failures = 0;
function check(name: string, cond: boolean, extra?: unknown) {
  if (cond) console.log(`ok   ${name}`);
  else {
    failures++;
    console.log(`FAIL ${name}`, extra ?? "");
  }
}

const today = todayIso();
let s = buildSeed();
const byTitle = (t: string) => s.classes.find((c) => c.title === t)!;

// 1. 排课：先用未过期余量，再补整瓶
const adv = byTitle("波尔多进阶盲品");
check("进阶班 pending?", adv.status === "scheduled");
check("进阶班 余量5+整瓶9", adv.allocations[0].fromOpened === 5 && adv.allocations[0].fromFull === 9, adv.allocations[0]);

// 2. 同一时段占用累加 → 第三场进待配区并写缺几份
const rush = byTitle("考前冲刺串讲");
check("冲刺班进待配区", rush.status === "pending");
check("冲刺班 缺13份", rush.allocations[0].shortage === 13, rush.allocations[0]);

// 3. 过期余量不可用（里奥哈开过期的瓶不算；明天的课用不上今天到期的余量）
const cmp = byTitle("产区对比训练");
const rioja = cmp.allocations.find((a) => a.wineId === "w-rioja")!;
check("里奥哈过期余量不算，全走整瓶8", rioja.fromOpened === 0 && rioja.fromFull === 8, rioja);
const burg = byTitle("勃艮第专题");
check("勃艮第 余量8+整瓶2（今日到期那瓶不算）", burg.allocations[0].fromOpened === 8 && burg.allocations[0].fromFull === 2, burg.allocations[0]);

// 4. 讲师确认上酒才扣减：确认前库存不动
check("确认前整瓶未动", s.wines.find((w) => w.id === "w-bordeaux")!.fullBottles === 3);
s = confirmClass(s, adv.id, addDays(today, 3));
const bx = s.wines.find((w) => w.id === "w-bordeaux")!;
check("确认后整瓶 3→2", bx.fullBottles === 2, bx.fullBottles);
check("旧开瓶5份扣光移除，新瓶余3份且带保鲜截止", bx.opened.length === 1 && bx.opened[0].servingsLeft === 3 && bx.opened[0].freshUntil === addDays(today, 3), bx.opened);
check("进阶班状态已上酒", byTitle("波尔多进阶盲品").status === "served");

// 5. 取消课程：整瓶占用退回，余量占用释放（同时段可出库份数回升）
const before = availabilityFor(s, "w-bordeaux", today, "晚间");
s = cancelClass(s, byTitle("产区对比训练").id);
const after = availabilityFor(s, "w-bordeaux", today, "晚间");
const freed = (after.opened + after.full) - (before.opened + before.full);
check("取消后同时段可出库合计 +10", freed === 10, { before, after });
check("确认前总量不超物理库存（开剩不被算重）", before.opened + before.full === 0, before);
check("取消的课状态已取消", byTitle("产区对比训练").status === "cancelled");

// 6. 待配课程：补足库存后重新调配转正
s = addFullBottles(s, "w-bordeaux", 2);
s = retryClass(s, byTitle("考前冲刺串讲").id);
check("补2瓶后冲刺班转正", byTitle("考前冲刺串讲").status === "scheduled", byTitle("考前冲刺串讲").allocations);

// 7. 重开取消的课程：重新占用判断接着排
s = reopenClass(s, byTitle("霞多丽入门").id);
check("霞多丽重开后排上", byTitle("霞多丽入门").status === "scheduled", byTitle("霞多丽入门").allocations);

// 8. 存档：已上酒课程归档
s = archiveClass(s, byTitle("波尔多进阶盲品").id);
check("已上酒课程入存档", s.archived.length === 1 && s.archived[0].title === "波尔多进阶盲品");
check("看板上不再出现该课", !s.classes.some((c) => c.title === "波尔多进阶盲品"));

console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
