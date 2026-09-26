import { addDays, todayIso } from "./dates";
import { cancelClass, scheduleClass } from "./allocation";
import type { BoardState } from "./types";

/**
 * 初始资料：日期按今天偏移生成，任何时候打开都能看到
 * 未过期余量、已过期余量、待配缺额与已取消课程的完整演示。
 */
export function buildSeed(): BoardState {
  const today = todayIso();

  let state: BoardState = {
    wines: [
      {
        id: "w-bordeaux",
        name: "左岸混酿",
        region: "波尔多",
        grape: "赤霞珠混酿",
        vintage: "2018",
        fullBottles: 3,
        opened: [
          { id: "btl-bx-1", openedOn: addDays(today, -1), freshUntil: addDays(today, 2), servingsLeft: 5 },
        ],
      },
      {
        id: "w-burgundy",
        name: "勃艮第村级",
        region: "勃艮第",
        grape: "黑皮诺",
        vintage: "2020",
        fullBottles: 2,
        opened: [
          { id: "btl-bg-1", openedOn: addDays(today, -2), freshUntil: today, servingsLeft: 3 },
          { id: "btl-bg-2", openedOn: today, freshUntil: addDays(today, 4), servingsLeft: 8 },
        ],
      },
      {
        id: "w-rioja",
        name: "里奥哈珍藏",
        region: "里奥哈",
        grape: "丹魄",
        vintage: "2016",
        fullBottles: 1,
        opened: [
          { id: "btl-rj-1", openedOn: addDays(today, -5), freshUntil: addDays(today, -2), servingsLeft: 4 },
        ],
      },
      {
        id: "w-chard",
        name: "纳帕霞多丽",
        region: "纳帕",
        grape: "霞多丽",
        vintage: "2021",
        fullBottles: 4,
        opened: [],
      },
    ],
    classes: [],
    archived: [],
  };

  // 同一晚间时段连排三场，第三场会因可出库份数不足进入待配区
  state = scheduleClass(state, {
    title: "波尔多进阶盲品",
    instructor: "林岚",
    date: today,
    slot: "晚间",
    lines: [{ wineId: "w-bordeaux", servings: 14 }],
  });
  state = scheduleClass(state, {
    title: "产区对比训练",
    instructor: "周祁",
    date: today,
    slot: "晚间",
    lines: [
      { wineId: "w-bordeaux", servings: 10 },
      { wineId: "w-rioja", servings: 8 },
    ],
  });
  state = scheduleClass(state, {
    title: "考前冲刺串讲",
    instructor: "林岚",
    date: today,
    slot: "晚间",
    lines: [{ wineId: "w-bordeaux", servings: 30 }],
  });
  // 明天的课用不上今天到期的余量
  state = scheduleClass(state, {
    title: "勃艮第专题",
    instructor: "沈默",
    date: addDays(today, 1),
    slot: "上午",
    lines: [{ wineId: "w-burgundy", servings: 10 }],
  });
  // 排好后取消，演示退整瓶与重开
  state = scheduleClass(state, {
    title: "霞多丽入门",
    instructor: "周祁",
    date: today,
    slot: "下午",
    lines: [{ wineId: "w-chard", servings: 6 }],
  });
  state = cancelClass(state, state.classes[state.classes.length - 1].id);

  return state;
}
