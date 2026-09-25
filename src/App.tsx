import { useEffect, useMemo, useState } from "react";
import "./styles.css";
import type { OrderStatus, WorkOrder } from "./types";
import {
  STATUS_FLOW,
  completionGate,
  damageCheckDone,
  edgeCheckDone,
  formatTime,
  loadOrders,
  saveOrders,
  uid,
} from "./data";
import { OrderForm } from "./components/OrderForm";
import { CustomerHistory } from "./components/CustomerHistory";

type SideFilter = "active" | "done";

function newOrder(seq: number): WorkOrder {
  const at = Date.now();
  return {
    id: `ORD-${seq}`,
    seq,
    createdAt: at,
    droppedAt: at,
    status: "待维护",
    customer: "",
    phone: "",
    brand: "",
    lengthCm: "",
    boardType: "",
    preference: "",
    sideEdge: "",
    baseEdge: "",
    waxMethod: "",
    damageMarks: [],
    damageChecked: false,
    events: [
      { id: uid("evt"), from: "新建", to: "待维护", at, note: "前台交板建档" },
    ],
  };
}

function App() {
  const [orders, setOrders] = useState<WorkOrder[]>(() => loadOrders());
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    const list = loadOrders();
    return list.find((o) => o.status !== "已交付")?.id ?? list[0]?.id ?? null;
  });
  const [sideFilter, setSideFilter] = useState<SideFilter>("active");
  const [keyword, setKeyword] = useState("");
  const [historyCustomer, setHistoryCustomer] = useState<string | null>(null);
  const [gateFlash, setGateFlash] = useState<string | null>(null);

  // 工单关闭再打开仍保留
  useEffect(() => {
    saveOrders(orders);
  }, [orders]);

  const selected = orders.find((o) => o.id === selectedId) ?? null;

  // 左侧始终按交板顺序（droppedAt 从早到晚）排列
  const sorted = useMemo(
    () => [...orders].sort((a, b) => a.droppedAt - b.droppedAt),
    [orders]
  );

  const activeOrders = sorted.filter((o) => o.status !== "已交付");
  const deliveredOrders = sorted.filter((o) => o.status === "已交付");

  const shownOrders = useMemo(() => {
    const base = sideFilter === "done" ? deliveredOrders : activeOrders;
    const k = keyword.trim();
    if (!k) return base;
    return base.filter((o) =>
      [o.id, o.customer, o.brand, o.boardType, o.lengthCm]
        .join(" ")
        .toLowerCase()
        .includes(k.toLowerCase())
    );
  }, [sideFilter, deliveredOrders, activeOrders, keyword]);

  const metrics = useMemo(() => {
    const waiting = orders.filter((o) => o.status === "待维护").length;
    const delivered = deliveredOrders.length;
    const sideAngles = orders
      .map((o) => parseFloat(o.sideEdge))
      .filter((n) => !Number.isNaN(n));
    const avgEdge = sideAngles.length
      ? (sideAngles.reduce((a, b) => a + b, 0) / sideAngles.length).toFixed(1)
      : "—";
    const repaired = orders.reduce((n, o) => n + o.damageMarks.length, 0);
    return { waiting, delivered, avgEdge, repaired };
  }, [orders, deliveredOrders]);

  function patchOrder(id: string, patch: Partial<WorkOrder>) {
    setOrders((prev) =>
      prev.map((o) => (o.id === id ? { ...o, ...patch } : o))
    );
  }

  function transition(id: string, to: OrderStatus) {
    const current = orders.find((o) => o.id === id);
    if (!current || current.status === to) return;
    const fromIndex = STATUS_FLOW.indexOf(current.status);
    const toIndex = STATUS_FLOW.indexOf(to);
    if (toIndex !== fromIndex + 1) return;
    // 进入完工（待交付）前强制刃角 + 损伤闸门
    if (to === "待交付") {
      const gate = completionGate(current);
      if (gate.missing.length > 0) {
        setGateFlash(gate.missing.join("、"));
        return;
      }
    }
    setGateFlash(null);
    if (to === "已交付") setSideFilter("done");
    setOrders((prev) =>
      prev.map((o) =>
        o.id === id
          ? {
              ...o,
              status: to,
              events: [
                ...o.events,
                {
                  id: uid("evt"),
                  from: o.status,
                  to,
                  at: Date.now(),
                  note: to === "已交付" ? "客户取板，工单归档" : undefined,
                },
              ],
            }
          : o
      )
    );
  }

  function createOrder() {
    const seq = orders.reduce((m, o) => Math.max(m, o.seq), 105) + 1;
    const order = newOrder(seq);
    setOrders((prev) => [...prev, order]);
    setSideFilter("active");
    setSelectedId(order.id);
  }

  return (
    <main className="app">
      <header className="topbar">
        <div>
          <h1>滑雪板调校 · 技师工作台</h1>
          <p>前台交板后按顺序作业：登记 → 刃角检查 → 底板损伤标记 → 完工交付</p>
        </div>
        <button className="primary" onClick={createOrder}>
          ＋ 新增交板工单
        </button>
      </header>

      <section className="metrics">
        <article>
          <small>待维护</small>
          <strong>{metrics.waiting}</strong>
        </article>
        <article>
          <small>完工工单（已交付）</small>
          <strong>{metrics.delivered}</strong>
        </article>
        <article>
          <small>平均侧刃角度</small>
          <strong>{metrics.avgEdge}°</strong>
        </article>
        <article>
          <small>底板修补标记</small>
          <strong>{metrics.repaired}</strong>
        </article>
      </section>

      <div className="layout">
        <aside className="sidebar">
          <div className="sidebar-tabs">
            <button
              className={sideFilter === "active" ? "is-active" : ""}
              onClick={() => setSideFilter("active")}
            >
              在职工单
              <i>{activeOrders.length}</i>
            </button>
            <button
              className={sideFilter === "done" ? "is-active" : ""}
              onClick={() => setSideFilter("done")}
            >
              完工记录
              <i>{deliveredOrders.length}</i>
            </button>
          </div>
          <input
            className="sidebar-search"
            placeholder="搜索工单号 / 客户 / 品牌"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
          {sideFilter === "done" && (
            <p className="filter-note">完工筛选仅显示已交付记录。</p>
          )}
          <div className="order-list">
            {shownOrders.length === 0 && (
              <p className="list-empty">
                {sideFilter === "done" ? "还没有已交付的完工记录" : "暂无在职工单"}
              </p>
            )}
            {shownOrders.map((o) => {
              const edge = edgeCheckDone(o);
              const damage = damageCheckDone(o);
              return (
                <button
                  key={o.id}
                  className={`order-card ${
                    selectedId === o.id ? "is-selected" : ""
                  }`}
                  onClick={() => setSelectedId(o.id)}
                >
                  <div className="oc-top">
                    <span className="oc-seq">#{o.seq}</span>
                    <b>{o.id}</b>
                    <span className={`status-badge status-${o.status}`}>
                      {o.status}
                    </span>
                  </div>
                  <p className="oc-board">
                    {[o.brand || "品牌待登记", o.lengthCm ? `${o.lengthCm}cm` : "",
                      o.boardType || "板型待选"]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  <p className="oc-customer">
                    {o.customer.trim() || "客户待登记"} · {formatTime(o.droppedAt)}
                  </p>
                  {o.status !== "已交付" && (
                    <div className="oc-checks">
                      <span className={edge ? "ok" : "miss"}>
                        {edge ? "✓ 刃角" : "! 刃角未查"}
                      </span>
                      <span className={damage ? "ok" : "miss"}>
                        {damage
                          ? `✓ 损伤${o.damageMarks.length ? `×${o.damageMarks.length}` : ""}`
                          : "! 损伤未标"}
                      </span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </aside>

        <section className="content">
          {selected ? (
            <>
              {gateFlash && (
                <div className="gate-flash">
                  无法进入完工状态，请先完成：{gateFlash}
                </div>
              )}
              <OrderForm
                key={selected.id}
                order={selected}
                onChange={(patch) => patchOrder(selected.id, patch)}
                onTransition={(to) => transition(selected.id, to)}
                onOpenCustomer={(name) => setHistoryCustomer(name)}
              />
            </>
          ) : (
            <div className="empty-detail">
              <h2>从左侧选择一张工单</h2>
              <p>或点击右上角「新增交板工单」开始登记。</p>
            </div>
          )}
        </section>
      </div>

      {historyCustomer && (
        <CustomerHistory
          customer={historyCustomer}
          orders={orders}
          onClose={() => setHistoryCustomer(null)}
          onPick={(id) => {
            const target = orders.find((o) => o.id === id);
            if (target) {
              setSideFilter(target.status === "已交付" ? "done" : "active");
              setSelectedId(id);
            }
            setHistoryCustomer(null);
          }}
        />
      )}
    </main>
  );
}

export default App;
