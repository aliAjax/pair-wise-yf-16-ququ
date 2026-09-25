import {
  describeMark,
  edgeSummary,
  fmtTime,
  WorkOrder,
} from "../types";

interface Props {
  customer: string;
  orders: WorkOrder[];
  onClose: () => void;
  onSelect: (id: string) => void;
}

/** 客户历史：按同一客户汇总历次工单，最新偏好与修补位置排在最前 */
export function CustomerHistory({ customer, orders, onClose, onSelect }: Props) {
  // 最新工单排最前（交板序号越大越新）
  const mine = orders
    .filter((o) => o.customer === customer)
    .sort((a, b) => b.seq - a.seq);

  const latestPreference = mine.find((o) => o.preference.trim() !== "")?.preference ?? "—";

  const repairs = mine.flatMap((o) =>
    o.damages.map((d) => ({ order: o, mark: d }))
  );

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <aside className="drawer" onClick={(e) => e.stopPropagation()}>
        <div className="heading">
          <div>
            <p>客户历史</p>
            <h2>{customer}</h2>
          </div>
          <button type="button" onClick={onClose}>关闭</button>
        </div>

        <div className="history-summary">
          <div>
            <small>累计工单</small>
            <b>{mine.length} 张</b>
          </div>
          <div className="wide">
            <small>最新偏好</small>
            <b>{latestPreference}</b>
          </div>
        </div>

        <div className="history-block">
          <h3>修补位置（最新在前）</h3>
          {repairs.length === 0 ? (
            <p className="mark-empty">历次工单均无损伤修补记录。</p>
          ) : (
            <ul className="repair-list">
              {repairs.map(({ order, mark }) => (
                <li key={mark.id}>
                  <span className={`dot ${mark.type}`} />
                  <span className="repair-pos">{describeMark(mark)}</span>
                  <span className="repair-meta">{order.id} · {fmtTime(order.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="history-block">
          <h3>历次工单（最新在前）</h3>
          <div className="history-orders">
            {mine.map((o) => (
              <article key={o.id}>
                <div className="ho-head">
                  <b>{o.id}</b>
                  <span className={`status-badge s-${o.status}`}>{o.status}</span>
                  <small>{fmtTime(o.createdAt)}</small>
                </div>
                <p>{o.brand} {o.length}cm · {o.boardType || "未登记板型"}</p>
                <p>{edgeSummary(o.edge)}</p>
                {o.preference && <p className="ho-pref">偏好：{o.preference}</p>}
                <button type="button" className="link-btn" onClick={() => onSelect(o.id)}>
                  打开此工单 →
                </button>
              </article>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}
