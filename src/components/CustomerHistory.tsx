import { useMemo } from "react";
import type { WorkOrder } from "../types";
import { formatDate, zoneLabel } from "../data";
import { BaseDiagram } from "./BaseDiagram";

interface CustomerHistoryProps {
  customer: string;
  orders: WorkOrder[];
  onClose: () => void;
  onPick: (id: string) => void;
}

/** 历次出现过的偏好，按最近一次记录时间从新到旧去重 */
function preferenceTimeline(orders: WorkOrder[]) {
  const seen = new Map<string, number>();
  for (const o of orders) {
    const p = o.preference.trim();
    if (p && (!seen.has(p) || o.droppedAt > (seen.get(p) ?? 0))) {
      seen.set(p, o.droppedAt);
    }
  }
  return [...seen.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([text, at]) => ({ text, at }));
}

/** 汇总历次修补位置，最新排在最前 */
function repairTimeline(orders: WorkOrder[]) {
  return orders
    .flatMap((o) =>
      o.damageMarks.map((m) => ({
        markId: m.id,
        orderId: o.id,
        seq: o.seq,
        brand: o.brand,
        lengthCm: o.lengthCm,
        boardType: o.boardType,
        kind: m.kind,
        x: m.x,
        y: m.y,
        note: m.note ?? "",
        at: m.createdAt,
      }))
    )
    .sort((a, b) => b.at - a.at);
}

export function CustomerHistory({
  customer,
  orders,
  onClose,
  onPick,
}: CustomerHistoryProps) {
  const customerOrders = useMemo(
    () =>
      orders
        .filter((o) => o.customer.trim() === customer.trim())
        .sort((a, b) => b.droppedAt - a.droppedAt),
    [orders, customer]
  );

  const prefs = useMemo(() => preferenceTimeline(customerOrders), [customerOrders]);
  const repairs = useMemo(() => repairTimeline(customerOrders), [customerOrders]);
  const latest = customerOrders[0];

  return (
    <div className="drawer-mask" onClick={onClose}>
      <aside className="drawer" onClick={(e) => e.stopPropagation()}>
        <header className="drawer-head">
          <div>
            <p className="eyebrow">客户历史 · {customerOrders.length} 张工单</p>
            <h2>{customer}</h2>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="关闭">
            ✕
          </button>
        </header>

        <div className="drawer-body">
          <section className="subpanel">
            <h3>最新偏好</h3>
            {prefs.length === 0 ? (
              <p className="hint">该客户还未登记偏好。</p>
            ) : (
              <ol className="pref-list">
                {prefs.map((p, i) => (
                  <li key={p.text} className={i === 0 ? "is-latest" : ""}>
                    <b>{i === 0 ? "最新" : formatDate(p.at)}</b>
                    <span>{p.text}</span>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section className="subpanel">
            <h3>历次修补位置（最新在前）</h3>
            {repairs.length === 0 ? (
              <p className="hint">暂无底板损伤标记。</p>
            ) : (
              <div className="repair-layout">
                <BaseDiagram
                  marks={repairs.map((r) => ({
                    id: r.markId,
                    kind: r.kind,
                    x: r.x,
                    y: r.y,
                    note: r.note,
                    createdAt: r.at,
                  }))}
                  selectedId={null}
                  tool="划痕"
                  readOnly
                  onAdd={() => undefined}
                  onSelect={() => undefined}
                />
                <ol className="repair-list">
                  {repairs.map((r) => (
                    <li
                      key={r.markId}
                      onClick={() => onPick(r.orderId)}
                      title="点击打开对应工单"
                    >
                      <b>{formatDate(r.at)}</b>
                      <span>
                        {r.kind} · {zoneLabel(r.x, r.y)}
                        <em>
                          {r.orderId}
                          {r.brand ? ` · ${r.brand}${r.lengthCm ? " " + r.lengthCm : ""}` : ""}
                        </em>
                        {r.note ? <em className="note">{r.note}</em> : null}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </section>

          <section className="subpanel">
            <h3>全部工单</h3>
            <ol className="history-orders">
              {customerOrders.map((o) => (
                <li key={o.id} onClick={() => onPick(o.id)}>
                  <div className="ho-main">
                    <b>{o.id}</b>
                    <span className={`status-badge status-${o.status}`}>
                      {o.status}
                    </span>
                  </div>
                  <p>
                    {formatDate(o.droppedAt)} ·{" "}
                    {[o.brand, o.lengthCm ? `${o.lengthCm}cm` : "", o.boardType]
                      .filter(Boolean)
                      .join(" ")}
                  </p>
                  <p className="ho-spec">
                    {o.sideEdge && o.baseEdge
                      ? `侧刃 ${o.sideEdge} / 底刃 ${o.baseEdge}`
                      : "刃角未检查"}
                    {o.waxMethod ? ` · ${o.waxMethod}` : ""}
                  </p>
                  {o.preference.trim() &&
                    latest?.id !== o.id &&
                    prefs[0]?.text !== o.preference.trim() && (
                      <p className="ho-pref">偏好：{o.preference}</p>
                    )}
                </li>
              ))}
            </ol>
          </section>
        </div>
      </aside>
    </div>
  );
}
