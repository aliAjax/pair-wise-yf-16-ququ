export type BoardType = "全能板" | "公园板" | "竞速板" | "粉雪板";
export type DamageType = "scratch" | "dent";
export type OrderStatus = "待维护" | "维护中" | "已完工" | "已交付";

export interface DamageMark {
  id: string;
  type: DamageType;
  /** 距板底图左侧的百分比 0-100 */
  x: number;
  /** 距板底图顶部的百分比 0-100 */
  y: number;
}

export interface EdgeInfo {
  sideEdge: string;
  baseEdge: string;
  wax: string;
  /** 技师确认刃角检查完成 */
  done: boolean;
}

export interface StatusEvent {
  at: number;
  from: OrderStatus | "创建";
  to: OrderStatus;
}

export interface WorkOrder {
  id: string;
  /** 交板顺序号 */
  seq: number;
  customer: string;
  brand: string;
  length: string;
  boardType: BoardType | "";
  preference: string;
  edge: EdgeInfo;
  damages: DamageMark[];
  /** 技师确认板底无损伤 */
  noDamage: boolean;
  status: OrderStatus;
  createdAt: number;
  history: StatusEvent[];
}

export const BOARD_TYPES: BoardType[] = ["全能板", "公园板", "竞速板", "粉雪板"];

export const WAX_OPTIONS = ["低温蜡", "全温蜡", "高温蜡", "竞速氟蜡", "刮蜡抛光"];

/** 按板型给出的刃角默认值，选择板型后自动带出、可再修改 */
export const EDGE_DEFAULTS: Record<BoardType, { sideEdge: string; baseEdge: string }> = {
  全能板: { sideEdge: "89", baseEdge: "1" },
  公园板: { sideEdge: "89", baseEdge: "1.5" },
  竞速板: { sideEdge: "88", baseEdge: "0.5" },
  粉雪板: { sideEdge: "90", baseEdge: "1" },
};

export const DAMAGE_LABEL: Record<DamageType, string> = {
  scratch: "划痕",
  dent: "压痕",
};

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function fmtTime(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** 刃角检查是否完成：三项填写且技师已确认 */
export function edgeComplete(edge: EdgeInfo): boolean {
  return (
    edge.done &&
    edge.sideEdge.trim() !== "" &&
    edge.baseEdge.trim() !== "" &&
    edge.wax.trim() !== ""
  );
}

/** 损伤标记是否完成：有点选标记，或确认过无损伤 */
export function damageComplete(order: Pick<WorkOrder, "damages" | "noDamage">): boolean {
  return order.damages.length > 0 || order.noDamage;
}

export function canComplete(order: WorkOrder): boolean {
  return edgeComplete(order.edge) && damageComplete(order);
}

/** 把标记坐标翻译成位置描述，如「板头左侧·划痕」 */
export function describeMark(m: DamageMark): string {
  const zone = m.y < 33 ? "板头" : m.y > 67 ? "板尾" : "板腰";
  const side = m.x < 40 ? "左侧" : m.x > 60 ? "右侧" : "中部";
  return `${zone}${side} · ${DAMAGE_LABEL[m.type]}`;
}

export function edgeSummary(edge: EdgeInfo): string {
  if (edge.sideEdge.trim() === "" && edge.baseEdge.trim() === "") return "刃角未填";
  return `侧刃${edge.sideEdge || "?"}° / 底刃${edge.baseEdge || "?"}° · ${edge.wax || "未选蜡"}`;
}

/* ---------- 种子数据：首次打开时写入，之后以本地存储为准 ---------- */

const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;

function makeHistory(status: OrderStatus, createdAt: number): StatusEvent[] {
  const events: StatusEvent[] = [{ at: createdAt, from: "创建", to: "待维护" }];
  const flow: OrderStatus[] = ["维护中", "已完工", "已交付"];
  const target = flow.indexOf(status);
  for (let i = 0; i <= target; i++) {
    events.push({
      at: createdAt + (i + 1) * 2 * HOUR,
      from: i === 0 ? "待维护" : flow[i - 1],
      to: flow[i],
    });
  }
  return events;
}

function seed(partial: Omit<WorkOrder, "history" | "createdAt"> & { createdAt: number }): WorkOrder {
  return { ...partial, history: makeHistory(partial.status, partial.createdAt) };
}

export function seedOrders(): WorkOrder[] {
  const now = Date.now();
  return [
    seed({
      id: "ORD-106",
      seq: 1,
      customer: "林晓峰",
      brand: "Burton",
      length: "156",
      boardType: "全能板",
      preference: "偏好弱咬雪，回转灵活",
      edge: { sideEdge: "88", baseEdge: "1", wax: "低温蜡", done: true },
      damages: [],
      noDamage: true,
      status: "已交付",
      createdAt: now - 6 * DAY,
    }),
    seed({
      id: "ORD-109",
      seq: 2,
      customer: "林晓峰",
      brand: "Burton",
      length: "156",
      boardType: "全能板",
      preference: "上次反馈板尾略硬，本次照旧",
      edge: { sideEdge: "89", baseEdge: "1", wax: "全温蜡", done: true },
      damages: [{ id: uid(), type: "dent", x: 58, y: 78 }],
      noDamage: false,
      status: "已完工",
      createdAt: now - 2 * DAY,
    }),
    seed({
      id: "ORD-112",
      seq: 3,
      customer: "赵竞",
      brand: "Atomic",
      length: "165",
      boardType: "竞速板",
      preference: "要求锋利咬雪，出弯要快",
      edge: { sideEdge: "88", baseEdge: "0.5", wax: "竞速氟蜡", done: false },
      damages: [{ id: uid(), type: "scratch", x: 66, y: 52 }],
      noDamage: false,
      status: "维护中",
      createdAt: now - 1 * DAY,
    }),
    seed({
      id: "ORD-115",
      seq: 4,
      customer: "王菁",
      brand: "GNU",
      length: "154",
      boardType: "公园板",
      preference: "道具滑行多，底刃别太上翘",
      edge: { sideEdge: "", baseEdge: "", wax: "", done: false },
      damages: [],
      noDamage: false,
      status: "待维护",
      createdAt: now - 5 * HOUR,
    }),
    seed({
      id: "ORD-118",
      seq: 5,
      customer: "孙野",
      brand: "Jones",
      length: "158",
      boardType: "粉雪板",
      preference: "客户偏好弱咬雪",
      edge: { sideEdge: "90", baseEdge: "1", wax: "", done: false },
      damages: [],
      noDamage: false,
      status: "待维护",
      createdAt: now - 2 * HOUR,
    }),
  ];
}
