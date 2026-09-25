import {
  canComplete,
  damageComplete,
  edgeComplete,
  edgeSummary,
  fmtTime,
  OrderStatus,
  WorkOrder,
} from "../types";
import { BaseDiagram } from "./BaseDiagram";
import { EdgeSection } from "./EdgeSection";

interface Props {
  order: WorkOrder;
  onUpdate: (next: WorkOrder) => void;
  onChangeStatus: (id: string, to: OrderStatus) => void;
  onOpenHistory: (customer: string) => void;
}

const STATUS_ACTIONS: Record<OrderStatus, { label: string; to: OrderStatus; primary: boolean }[]> = {
  待维护: [{ label: "开始维护", to: "维护中", primary: true }],
  维护中: [{ label: "标记完工", to: "已完工", primary: true }],
  已完工: [
    { label: "交付客户", to: "已交付", primary: true },
    { label: "返工维护", to: "维护中", primary: false },
  ],
  已交付: [],
};

export function OrderDetail({ order, onUpdate, onChangeStatus, onOpenHistory }: Props) {
  const edgeOk = edgeComplete(order.edge);
  const damageOk = damageComplete(order);
  const missing: string[] = [];
  if (!edgeOk) missing.push("刃角检查");
  if (!damageOk) missing.push("损伤标记");

  return (
    <section className="panel detail-panel">
      <div className="heading">
        <div>
          <p>交板序号 #{String(order.seq).padStart(2, "0")} · {fmtTime(order.createdAt)} 登记</p>
          <h2>
            {order.id}
            <span className={`status-badge s-${order.status}`}>{order.status}</span>
          </h2>
        </div>
        <button type="button" onClick={() => onOpenHistory(order.customer)}>
          客户历史（{order.customer}）
        </button>
      </div>

      <div className="board-info">
        <div><small>客户</small><b>{order.customer}</b></div>
        <div><small>雪板品牌</small><b>{order.brand}</b></div>
        <div><small>长度</small><b>{order.length} cm</b></div>
        <div><small>板型</small><b>{order.boardType || "未登记"}</b></div>
        <div className="wide"><small>客户偏好</small><b>{order.preference || "—"}</b></div>
      </div>

      <div className="checklist">
        <span className={edgeOk ? "check ok" : "check"}>
          {edgeOk ? "✓" : "✗"} 刃角检查
        </span>
        <span className={damageOk ? "check ok" : "check"}>
          {damageOk ? "✓" : "✗"} 损伤标记
        </span>
        <span className="check-summary">{edgeSummary(order.edge)}</span>
      </div>

      <div className="detail-grid">
        <div className="detail-block">
          <h3>刃角参数</h3>
          <EdgeSection
            value={order.edge}
            onChange={(edge) => onUpdate({ ...order, edge })}
          />
        </div>

        <div className="detail-block">
          <h3>板底损伤标记</h3>
          <BaseDiagram
            marks={order.damages}
            onAdd={(mark) =>
              onUpdate({ ...order, damages: [...order.damages, mark], noDamage: false })
            }
            onRemove={(id) =>
              onUpdate({ ...order, damages: order.damages.filter((m) => m.id !== id) })
            }
          />
          <label className={order.damages.length > 0 ? "confirm-row disabled" : "confirm-row"}>
            <input
              type="checkbox"
              checked={order.noDamage}
              disabled={order.damages.length > 0}
              onChange={(e) => onUpdate({ ...order, noDamage: e.target.checked })}
            />
            <span>
              已检查板底，无划痕 / 压痕
              {order.damages.length > 0 && <em className="confirm-tip"> — 已有损伤标记</em>}
            </span>
          </label>
        </div>
      </div>

      <div className="action-bar">
        {STATUS_ACTIONS[order.status].map((a) => {
          const blocked = a.to === "已完工" && !canComplete(order);
          return (
            <button
              key={a.to}
              type="button"
              className={a.primary ? "primary" : ""}
              disabled={blocked}
              title={blocked ? `还差：${missing.join("、")}` : undefined}
              onClick={() => onChangeStatus(order.id, a.to)}
            >
              {a.label}
            </button>
          );
        })}
        {order.status === "维护中" && !canComplete(order) && (
          <span className="block-tip">完成{missing.join("与")}后才能进入完工状态</span>
        )}
        {order.status === "已交付" && <span className="block-tip done">工单已交付归档</span>}
      </div>

      <div className="timeline">
        <h3>状态留痕</h3>
        <ol>
          {order.history.map((h, i) => (
            <li key={`${h.at}-${i}`} className={i === order.history.length - 1 ? "latest" : ""}>
              <span className="t-time">{fmtTime(h.at)}</span>
              <span className="t-text">
                {h.from === "创建" ? "创建工单" : `${h.from} → ${h.to}`}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
