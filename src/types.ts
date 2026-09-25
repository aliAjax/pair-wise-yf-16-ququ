export type BoardType = "全地域" | "公园板" | "竞速板" | "粉雪板";

export type DamageKind = "划痕" | "压痕";

export type OrderStatus = "待维护" | "维护中" | "待交付" | "已交付";

export type WaxMethod =
  | "低温蜡"
  | "全温蜡"
  | "高温蜡"
  | "竞速粉蜡"
  | "仅清洁";

export interface DamageMark {
  id: string;
  kind: DamageKind;
  /** 相对板底示意图的横向位置，0-100（板头朝左） */
  x: number;
  /** 相对板底示意图的纵向位置，0-100（板头为 0） */
  y: number;
  note?: string;
  createdAt: number;
}

export interface StatusEvent {
  id: string;
  from: OrderStatus | "新建";
  to: OrderStatus;
  note?: string;
  at: number;
}

export interface WorkOrder {
  id: string;
  seq: number;
  createdAt: number;
  droppedAt: number;
  status: OrderStatus;
  customer: string;
  phone: string;
  brand: string;
  lengthCm: string;
  boardType: BoardType | "";
  preference: string;
  /** 侧刃角度，度 */
  sideEdge: string;
  /** 底刃角度，度 */
  baseEdge: string;
  waxMethod: WaxMethod | "";
  damageMarks: DamageMark[];
  /** 技师已完成底板检查（无损伤或已标记） */
  damageChecked: boolean;
  events: StatusEvent[];
}
