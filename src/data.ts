import type { BoardType, OrderStatus, WaxMethod, WorkOrder } from "./types";

export const BOARD_TYPES: BoardType[] = ["全地域", "公园板", "竞速板", "粉雪板"];

export const SIDE_EDGE_OPTIONS = ["85°", "86°", "87°", "88°", "89°", "90°"];
export const BASE_EDGE_OPTIONS = ["0°", "0.5°", "0.7°", "1°", "1.5°", "2°"];

export const WAX_METHODS: WaxMethod[] = [
  "低温蜡",
  "全温蜡",
  "高温蜡",
  "竞速粉蜡",
  "仅清洁",
];

export const STATUS_FLOW: OrderStatus[] = [
  "待维护",
  "维护中",
  "待交付",
  "已交付",
];

/** 常见板型的出厂调校参考，仅用于快速预填 */
export const BOARD_PRESET: Record<
  BoardType,
  { side: string; base: string; wax: WaxMethod }
> = {
  全地域: { side: "89°", base: "0.7°", wax: "全温蜡" },
  公园板: { side: "88°", base: "1°", wax: "低温蜡" },
  竞速板: { side: "87°", base: "0.5°", wax: "竞速粉蜡" },
  粉雪板: { side: "89°", base: "1°", wax: "低温蜡" },
};

const STORAGE_KEY = "ski-bench-workorders-v1";

export function uid(prefix = "id"): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 7)}`;
}

function event(to: OrderStatus, from: StatusEventFrom, at: number, note?: string) {
  return { id: uid("evt"), from, to, at, note };
}

type StatusEventFrom = OrderStatus | "新建";

function seedOrder(
  partial: Omit<WorkOrder, "events"> & { events?: WorkOrder["events"] }
): WorkOrder {
  return { ...partial, events: partial.events ?? [] };
}

/**
 * 刃角检查：选择板型后必须确认侧刃与底刃角度。
 */
export function edgeCheckDone(order: WorkOrder): boolean {
  return (
    order.boardType !== "" &&
    order.sideEdge.trim() !== "" &&
    order.baseEdge.trim() !== ""
  );
}

/**
 * 底板损伤检查：技师需确认“无损伤”，或至少标记一处损伤位置。
 */
export function damageCheckDone(order: WorkOrder): boolean {
  return order.damageChecked || order.damageMarks.length > 0;
}

export interface GateResult {
  edgeDone: boolean;
  damageDone: boolean;
  missing: string[];
}

export function completionGate(order: WorkOrder): GateResult {
  const edgeDone = edgeCheckDone(order);
  const damageDone = damageCheckDone(order);
  const missing: string[] = [];
  if (!order.brand.trim()) missing.push("登记雪板品牌");
  if (!order.lengthCm.trim()) missing.push("登记雪板长度");
  if (!edgeDone) {
    if (order.boardType === "") missing.push("选择板型");
    missing.push("完成侧刃 / 底刃刃角检查");
  }
  if (!damageDone) missing.push("在板底示意图上标记损伤或确认无损伤");
  if (!order.customer.trim()) missing.push("登记客户姓名");
  return { edgeDone, damageDone, missing };
}

const DAY = 24 * 60 * 60 * 1000;
const now = Date.now();

export function seedOrders(): WorkOrder[] {
  const orders: WorkOrder[] = [];

  orders.push(
    seedOrder({
      id: "ORD-106",
      seq: 106,
      createdAt: now - 5 * DAY,
      droppedAt: now - 5 * DAY,
      status: "已交付",
      customer: "陈雪",
      phone: "138****2046",
      brand: "Burton",
      lengthCm: "156",
      boardType: "全地域",
      preference: "弱咬雪，转弯容错高",
      sideEdge: "88°",
      baseEdge: "1°",
      waxMethod: "低温蜡",
      damageMarks: [],
      damageChecked: true,
      events: [
        event("维护中", "新建", now - 5 * DAY),
        event("待交付", "维护中", now - 4 * DAY),
        event("已交付", "待交付", now - 4 * DAY),
      ],
    })
  );

  orders.push(
    seedOrder({
      id: "ORD-112",
      seq: 112,
      createdAt: now - 3 * DAY,
      droppedAt: now - 3 * DAY,
      status: "维护中",
      customer: "刘铮",
      phone: "139****8810",
      brand: "Fischer",
      lengthCm: "165",
      boardType: "竞速板",
      preference: "大回转刻滑，刃要利",
      sideEdge: "87°",
      baseEdge: "0.5°",
      waxMethod: "竞速粉蜡",
      damageMarks: [
        {
          id: uid("dm"),
          kind: "划痕",
          x: 52,
          y: 38,
          note: "纵向划痕约 12cm，待补 P-Tex",
          createdAt: now - 2 * DAY,
        },
      ],
      damageChecked: true,
      events: [
        event("维护中", "新建", now - 2 * DAY),
      ],
    })
  );

  orders.push(
    seedOrder({
      id: "ORD-118",
      seq: 118,
      createdAt: now - 2 * DAY,
      droppedAt: now - 2 * DAY,
      status: "待维护",
      customer: "陈雪",
      phone: "138****2046",
      brand: "Jones",
      lengthCm: "158",
      boardType: "粉雪板",
      preference: "粉雪浮力优先，弱咬雪",
      sideEdge: "",
      baseEdge: "",
      waxMethod: "",
      damageMarks: [],
      damageChecked: false,
      events: [],
    })
  );

  orders.push(
    seedOrder({
      id: "ORD-121",
      seq: 121,
      createdAt: now - DAY,
      droppedAt: now - DAY,
      status: "待维护",
      customer: "赵鹏",
      phone: "137****5523",
      brand: "Nitro",
      lengthCm: "152",
      boardType: "公园板",
      preference: "道具多，底板要抗造",
      sideEdge: "",
      baseEdge: "",
      waxMethod: "",
      damageMarks: [
        {
          id: uid("dm"),
          kind: "压痕",
          x: 30,
          y: 72,
          note: "铁杆磕压痕",
          createdAt: now - DAY,
        },
      ],
      damageChecked: true,
      events: [],
    })
  );

  orders.push(
    seedOrder({
      id: "ORD-123",
      seq: 123,
      createdAt: now - 3 * 60 * 60 * 1000,
      droppedAt: now - 3 * 60 * 60 * 1000,
      status: "待交付",
      customer: "周琳",
      phone: "135****7790",
      brand: "Salomon",
      lengthCm: "148",
      boardType: "全地域",
      preference: "新手教学，刃角钝一些",
      sideEdge: "90°",
      baseEdge: "1°",
      waxMethod: "全温蜡",
      damageMarks: [
        {
          id: uid("dm"),
          kind: "划痕",
          x: 70,
          y: 20,
          note: "板头浅划痕，已补底",
          createdAt: now - 2 * 60 * 60 * 1000,
        },
      ],
      damageChecked: true,
      events: [
        event("维护中", "新建", now - 2 * 60 * 60 * 1000),
        event("待交付", "维护中", now - 60 * 60 * 1000),
      ],
    })
  );

  return orders;
}

export function loadOrders(): WorkOrder[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedOrders();
    const parsed = JSON.parse(raw) as WorkOrder[];
    if (!Array.isArray(parsed)) return seedOrders();
    return parsed;
  } catch {
    return seedOrders();
  }
}

export function saveOrders(orders: WorkOrder[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
  } catch {
    // 存储不可用时仍可内存内使用
  }
}

export function formatTime(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export function formatDate(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** 板底位置分区，用于客户历史里展示历次修补位置 */
export function zoneLabel(x: number, y: number): string {
  const vertical = y < 33 ? "板头" : y > 66 ? "板尾" : "板中";
  const side = x < 33 ? "左侧刃" : x > 66 ? "右侧刃" : "居中";
  return `${vertical} · ${side}`;
}
