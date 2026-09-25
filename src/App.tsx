import { useEffect, useMemo, useState } from "react";
import "./styles.css";
import { CustomerHistory } from "./components/CustomerHistory";
import { NewOrderForm, OrderDraft } from "./components/NewOrderForm";
import { OrderDetail } from "./components/OrderDetail";
import {
  BOARD_TYPES,
  BoardType,
  damageComplete,
  edgeComplete,
  OrderStatus,
  seedOrders,
  WorkOrder,
} from "./types";

const STORAGE_KEY = "ski-tune-workbench-v1";

interface Persisted {
  orders: WorkOrder[];
  selectedId: string | null;
}

function load(): Persisted {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Persisted;
      if (Array.isArray(parsed.orders)) return parsed;
    }
  } catch {
    /* 本地数据损坏时回退到种子数据 */
  }
  return { orders: seedOrders(), selectedId: null };
}

/** 状态筛选：「完工」筛选只显示已交付记录 */
const STATUS_FILTERS: { label: string; match: (s: OrderStatus) => boolean }[] = [
  { label: "全部", match: () => true },
  { label: "待维护", match: (s) => s === "待维护" },
  { label: "维护中", match: (s) => s === "维护中" },
  { label: "已完工", match: (s) => s === "已完工" },
  { label: "完工", match: (s) => s === "已交付" },
];

function App() {
  const [persisted] = useState(load);
  const [orders, setOrders] = useState<WorkOrder[]>(persisted.orders);
  const [selectedId, setSelectedId] = useState<string | null>(persisted.selectedId);
  const [creating, setCreating] = useState(false);
  const [statusFilter, setStatusFilter] = useState("全部");
  const [typeFilter, setTypeFilter] = useState<BoardType | "全部">("全部");
  const [historyCustomer, setHistoryCustomer] = useState<string | null>(null);

  // 工单与选中状态落盘：关闭再打开仍保留，状态留痕一并保存
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ orders, selectedId }));
  }, [orders, selectedId]);

  const selected = orders.find((o) => o.id === selectedId) ?? null;

  const queue = useMemo(() => {
    const sf = STATUS_FILTERS.find((f) => f.label === statusFilter) ?? STATUS_FILTERS[0];
    return orders
      .filter((o) => sf.match(o.status))
      .filter((o) => typeFilter === "全部" || o.boardType === typeFilter)
      .sort((a, b) => a.seq - b.seq); // 按交板顺序排列
  }, [orders, statusFilter, typeFilter]);

  const metrics = useMemo(() => {
    const backlog = orders.filter((o) => o.status === "待维护" || o.status === "维护中").length;
    const done = orders.filter((o) => o.status === "已完工" || o.status === "已交付").length;
    const edged = orders.filter((o) => edgeComplete(o.edge));
    const avgEdge =
      edged.length > 0
        ? (edged.reduce((sum, o) => sum + Number(o.edge.sideEdge), 0) / edged.length).toFixed(1) + "°"
        : "—";
    const repairs = orders.reduce((sum, o) => sum + o.damages.length, 0);
    return [
      { label: "待维护", value: String(backlog) },
      { label: "完工工单", value: String(done) },
      { label: "平均刃角", value: avgEdge },
      { label: "底板修补", value: String(repairs) },
    ];
  }, [orders]);

  const updateOrder = (next: WorkOrder) =>
    setOrders((prev) => prev.map((o) => (o.id === next.id ? next : o)));

  const changeStatus = (id: string, to: OrderStatus) =>
    setOrders((prev) =>
      prev.map((o) =>
        o.id === id
          ? { ...o, status: to, history: [...o.history, { at: Date.now(), from: o.status, to }] }
          : o
      )
    );

  const createOrder = (draft: OrderDraft) => {
    const maxNum = orders.reduce((m, o) => Math.max(m, Number(o.id.replace("ORD-", "")) || 0), 100);
    const maxSeq = orders.reduce((m, o) => Math.max(m, o.seq), 0);
    const now = Date.now();
    const order: WorkOrder = {
      ...draft,
      id: `ORD-${maxNum + 1}`,
      seq: maxSeq + 1,
      status: "待维护",
      createdAt: now,
      history: [{ at: now, from: "创建", to: "待维护" }],
    };
    // 新增后左侧队列与客户历史立即反映
    setOrders((prev) => [...prev, order]);
    setSelectedId(order.id);
    setCreating(false);
  };

  return (
    <main className="app">
      <section className="hero">
        <p>滑雪板调校店 · 技师工作台</p>
        <h1>滑雪板调校维护</h1>
        <span>
          左侧按交板顺序排列工单，缺刃角检查或损伤标记的工单会标红提醒；完工前必须两项齐全，完工筛选只显示已交付记录。
        </span>
      </section>

      <section className="metrics">
        {metrics.map((m) => (
          <article key={m.label}>
            <small>{m.label}</small>
            <strong>{m.value}</strong>
          </article>
        ))}
      </section>

      <div className="layout">
        <aside className="panel queue-panel">
          <div className="heading">
            <div>
              <p>交板队列</p>
              <h2>维护工单</h2>
            </div>
            <button
              type="button"
              className="primary"
              onClick={() => {
                setCreating(true);
                setSelectedId(null);
              }}
            >
              ＋ 登记
            </button>
          </div>

          <div className="chips">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.label}
                type="button"
                className={statusFilter === f.label ? "chip active" : "chip"}
                onClick={() => setStatusFilter(f.label)}
              >
                {f.label}
                <em className="chip-count">{orders.filter((o) => f.match(o.status)).length}</em>
              </button>
            ))}
          </div>
          <div className="chips">
            {(["全部", ...BOARD_TYPES] as const).map((t) => (
              <button
                key={t}
                type="button"
                className={typeFilter === t ? "chip active" : "chip"}
                onClick={() => setTypeFilter(t)}
              >
                {t === "全部" ? "全部板型" : t}
              </button>
            ))}
          </div>

          <div className="queue">
            {queue.length === 0 && <p className="queue-empty">当前筛选下没有工单。</p>}
            {queue.map((o) => {
              const missEdge = !edgeComplete(o.edge);
              const missDamage = !damageComplete(o);
              return (
                <button
                  key={o.id}
                  type="button"
                  className={o.id === selectedId ? "queue-item selected" : "queue-item"}
                  onClick={() => {
                    setSelectedId(o.id);
                    setCreating(false);
                  }}
                >
                  <span className="q-seq">#{String(o.seq).padStart(2, "0")}</span>
                  <span className="q-main">
                    <span className="q-line1">
                      <b>{o.id}</b>
                      <span className={`status-badge s-${o.status}`}>{o.status}</span>
                    </span>
                    <span className="q-line2">
                      {o.customer} · {o.brand} {o.length}cm · {o.boardType || "未登记板型"}
                    </span>
                    {(missEdge || missDamage) && o.status !== "已交付" && (
                      <span className="q-flags">
                        {missEdge && <em className="flag">缺刃角</em>}
                        {missDamage && <em className="flag">缺损伤标记</em>}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        {creating ? (
          <NewOrderForm
            onSubmit={createOrder}
            onCancel={() => setCreating(false)}
          />
        ) : selected ? (
          <OrderDetail
            order={selected}
            onUpdate={updateOrder}
            onChangeStatus={changeStatus}
            onOpenHistory={setHistoryCustomer}
          />
        ) : (
          <section className="panel detail-panel placeholder">
            <h2>从左侧队列选择一张工单</h2>
            <p>或点击「＋ 登记」为前台新交的雪板建单。</p>
          </section>
        )}
      </div>

      {historyCustomer && (
        <CustomerHistory
          customer={historyCustomer}
          orders={orders}
          onClose={() => setHistoryCustomer(null)}
          onSelect={(id) => {
            setSelectedId(id);
            setCreating(false);
            setHistoryCustomer(null);
          }}
        />
      )}
    </main>
  );
}

export default App;
