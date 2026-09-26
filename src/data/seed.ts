// 资料：示例酒款与课程。排配结果通过占用判断实时算出，保证一致。

import { BoardState, Wine } from "../domain/types";
import { cancelSession, confirmSession, scheduleSession } from "../domain/allocation";
import { addDays, isoToday } from "../domain/dates";

export function seedState(): BoardState {
  const today = isoToday();
  const yesterday = addDays(today, -1);

  const wines: Wine[] = [
    {
      id: "w-left",
      name: "左岸混酿",
      region: "波尔多",
      grape: "赤霞珠",
      sealedBottles: 4,
      opened: [
        { id: "ob-1", remainingPours: 3, openedOn: addDays(today, -2), freshUntil: addDays(today, 1) },
        { id: "ob-2", remainingPours: 2, openedOn: addDays(today, -5), freshUntil: addDays(today, -1) },
      ],
    },
    {
      id: "w-burg",
      name: "勃艮第村级",
      region: "勃艮第",
      grape: "黑皮诺",
      sealedBottles: 2,
      opened: [
        { id: "ob-3", remainingPours: 4, openedOn: yesterday, freshUntil: addDays(today, 2) },
      ],
    },
    {
      id: "w-rioja",
      name: "里奥哈珍藏",
      region: "里奥哈",
      grape: "丹魄",
      sealedBottles: 1,
      opened: [],
    },
    {
      id: "w-napa",
      name: "纳帕赤霞珠",
      region: "纳帕",
      grape: "赤霞珠",
      sealedBottles: 3,
      opened: [
        { id: "ob-4", remainingPours: 1, openedOn: addDays(today, -2), freshUntil: today },
      ],
    },
  ];

  let state: BoardState = { wines, sessions: [] };

  // 昨晚已上酒的课：确认时扣减了 2 份勃艮第余量
  state = scheduleSession(state, {
    title: "起泡酒入门",
    date: yesterday,
    slot: "下午",
    lines: [{ wineId: "w-burg", pours: 2 }],
  });
  state = confirmSession(state, state.sessions[state.sessions.length - 1].id, yesterday).state;

  // 今晚三门课同一时段：里奥哈只有 1 瓶整瓶，8 份需求会缺 2 份留在待配区
  state = scheduleSession(state, {
    title: "波尔多对照品鉴",
    date: today,
    slot: "晚上",
    lines: [{ wineId: "w-left", pours: 4 }],
  });
  state = scheduleSession(state, {
    title: "黑皮诺的风土表达",
    date: today,
    slot: "晚上",
    lines: [{ wineId: "w-burg", pours: 5 }],
  });
  state = scheduleSession(state, {
    title: "里奥哈专场盲品",
    date: today,
    slot: "晚上",
    lines: [{ wineId: "w-rioja", pours: 8 }],
  });

  // 今天下午：用掉纳帕最后 1 份余量，再补 1 瓶整瓶
  state = scheduleSession(state, {
    title: "纳帕谷垂直品鉴",
    date: today,
    slot: "下午",
    lines: [{ wineId: "w-napa", pours: 3 }],
  });

  // 一门已取消的课：整瓶占用已退回，可重开续排
  state = scheduleSession(state, {
    title: "盲品模拟考",
    date: today,
    slot: "上午",
    lines: [{ wineId: "w-left", pours: 2 }],
  });
  state = cancelSession(state, state.sessions[state.sessions.length - 1].id);

  return state;
}
