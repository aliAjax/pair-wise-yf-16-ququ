import { useMemo, useState } from "react";
import type { DamageKind, OrderStatus, WorkOrder } from "../types";
import {
  BASE_EDGE_OPTIONS,
  BOARD_PRESET,
  BOARD_TYPES,
  SIDE_EDGE_OPTIONS,
  STATUS_FLOW,
  WAX_METHODS,
  completionGate,
  damageCheckDone,
  edgeCheckDone,
  formatTime,
  uid,
  zoneLabel,
} from "../data";
import { BaseDiagram } from "./BaseDiagram";

interface OrderFormProps {
  order: WorkOrder;
  onChange: (patch: Partial<WorkOrder>, note?: string) => void;
  onTransition: (to: OrderStatus) => void;
  onOpenCustomer: (customer: string) => void;
}

const STATUS_LABEL: Record<OrderStatus, string> = {
  待维护: "待维护",
  维护中: "维护中",
  待交付: "待交付",
  已交付: "已交付",
};

export function OrderForm({
  order,
  onChange,
  onTransition,
  onOpenCustomer,
}: OrderFormProps) {
  const [tool, setTool] = useState<DamageKind>("划痕");
  const [selectedMark, setSelectedMark] = useState<string | null>(null);
  const [markNote, setMarkNote] = useState("");

  const gate = useMemo(() => completionGate(order), [order]);
  const currentIndex = STATUS_FLOW.indexOf(order.status);

  const selected = order.damageMarks.find((m) => m.id === selectedMark) ?? null;

  function addMark(kind: DamageKind, x: number, y: number) {
    const mark = {
      id: uid("dm"),
      kind,
      x,
      y,
      note: "",
      createdAt: Date.now(),
    };
    onChange({
      damageMarks: [...order.damageMarks, mark],
      damageChecked: true,
    });
    setSelectedMark(mark.id);
    setMarkNote("");
  }

  function updateSelectedNote() {
    if (!selected) return;
    onChange({
      damageMarks: order.damageMarks.map((m) =>
        m.id === selected.id ? { ...m, note: markNote } : m
      ),
    });
  }

  function removeSelected() {
    if (!selected) return;
    onChange({
      damageMarks: order.damageMarks.filter((m) => m.id !== selected.id),
    });
    setSelectedMark(null);
  }

  const locked = order.status === "已交付";

  return (
    <div className="order-detail">
      <header className="detail-head">
        <div>
          <p className="eyebrow">交板顺序 #{order.seq}</p>
          <h2>{order.id}</h2>
          <span className={`status-badge status-${order.status}`}>
            {STATUS_LABEL[order.status]}
          </span>
          {order.customer.trim() && (
            <button
              className="link-btn"
              onClick={() => onOpenCustomer(order.customer.trim())}
            >
              查看「{order.customer}」客户历史 →
            </button>
          )}
        </div>
        <div className="status-flow">
          {STATUS_FLOW.map((s, i) => (
            <button
              key={s}
              className={`flow-step ${i <= currentIndex ? "is-on" : ""} ${
                i === currentIndex ? "is-current" : ""
              }`}
              disabled={i !== currentIndex + 1 || locked}
              onClick={() => onTransition(s)}
              title={
                i === currentIndex + 1
                  ? `推进到「${s}」`
                  : i <= currentIndex
                  ? `${STATUS_LABEL[s]}`
                  : "需按顺序推进"
              }
            >
              <i>{i + 1}</i>
              {STATUS_LABEL[s]}
            </button>
          ))}
        </div>
      </header>

      {locked && (
        <div className="lock-note">
          该工单已交付归档，字段不可编辑；可在客户历史中查看完整记录。
        </div>
      )}

      <div className="detail-grid">
        {/* 左：登记与调校 */}
        <div className="detail-col">
          <section className="subpanel">
            <h3>① 前台登记</h3>
            <div className="field-grid">
              <label>
                <span>雪板品牌 *</span>
                <input
                  value={order.brand}
                  disabled={locked}
                  placeholder="如 Burton / Nitro"
                  onChange={(e) => onChange({ brand: e.target.value })}
                />
              </label>
              <label>
                <span>长度（cm）*</span>
                <input
                  value={order.lengthCm}
                  disabled={locked}
                  inputMode="numeric"
                  placeholder="如 156"
                  onChange={(e) =>
                    onChange({ lengthCm: e.target.value.replace(/[^\d]/g, "") })
                  }
                />
              </label>
              <label>
                <span>客户姓名 *</span>
                <input
                  value={order.customer}
                  disabled={locked}
                  placeholder="用于汇总客户历史"
                  onChange={(e) => onChange({ customer: e.target.value })}
                />
              </label>
              <label>
                <span>联系电话</span>
                <input
                  value={order.phone}
                  disabled={locked}
                  placeholder="选填"
                  onChange={(e) => onChange({ phone: e.target.value })}
                />
              </label>
            </div>
            <label className="full-field">
              <span>客户偏好</span>
              <textarea
                value={order.preference}
                disabled={locked}
                rows={2}
                placeholder="如：弱咬雪、刻滑为主、新手教学"
                onChange={(e) => onChange({ preference: e.target.value })}
              />
            </label>
            <label className="full-field">
              <span>板型 *</span>
              <div className="seg">
                {BOARD_TYPES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    disabled={locked}
                    className={order.boardType === t ? "is-active" : ""}
                    onClick={() => {
                      const preset = BOARD_PRESET[t];
                      onChange({
                        boardType: t,
                        // 选择板型后预填刃角与打蜡，技师可再改
                        sideEdge: order.sideEdge || preset.side,
                        baseEdge: order.baseEdge || preset.base,
                        waxMethod: order.waxMethod || preset.wax,
                      });
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </label>
          </section>

          <section
            className={`subpanel ${order.boardType === "" ? "is-muted" : ""}`}
          >
            <h3>
              ② 刃角与打蜡
              {order.boardType === "" && <em>（先选择板型）</em>}
            </h3>
            <div className="field-grid">
              <label>
                <span>侧刃角度</span>
                <select
                  value={order.sideEdge}
                  disabled={locked || order.boardType === ""}
                  onChange={(e) => onChange({ sideEdge: e.target.value })}
                >
                  <option value="">待检查</option>
                  {SIDE_EDGE_OPTIONS.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>底刃角度</span>
                <select
                  value={order.baseEdge}
                  disabled={locked || order.boardType === ""}
                  onChange={(e) => onChange({ baseEdge: e.target.value })}
                >
                  <option value="">待检查</option>
                  {BASE_EDGE_OPTIONS.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>
              <label className="full-field">
                <span>打蜡方式</span>
                <div className="seg">
                  {WAX_METHODS.map((w) => (
                    <button
                      key={w}
                      type="button"
                      disabled={locked || order.boardType === ""}
                      className={order.waxMethod === w ? "is-active" : ""}
                      onClick={() => onChange({ waxMethod: w })}
                    >
                      {w}
                    </button>
                  ))}
                </div>
              </label>
            </div>
          </section>
        </div>

        {/* 中：板底损伤标记 */}
        <div className="detail-col">
          <section className="subpanel">
            <h3>③ 底板损伤标记</h3>
            <div className="damage-toolbar">
              <div className="seg">
                <button
                  type="button"
                  disabled={locked}
                  className={tool === "划痕" ? "is-active" : ""}
                  onClick={() => setTool("划痕")}
                >
                  划痕
                </button>
                <button
                  type="button"
                  disabled={locked}
                  className={tool === "压痕" ? "is-active" : ""}
                  onClick={() => setTool("压痕")}
                >
                  压痕
                </button>
              </div>
              <label
                className="no-damage"
                title={
                  order.damageMarks.length > 0
                    ? "已存在损伤标记，无需再勾选"
                    : undefined
                }
              >
                <input
                  type="checkbox"
                  checked={order.damageChecked && order.damageMarks.length === 0}
                  disabled={locked || order.damageMarks.length > 0}
                  onChange={(e) => onChange({ damageChecked: e.target.checked })}
                />
                底板无损伤，已目检
              </label>
            </div>

            <div className="diagram-layout">
              <BaseDiagram
                marks={order.damageMarks}
                selectedId={selectedMark}
                tool={tool}
                readOnly={locked}
                onAdd={addMark}
                onSelect={(id) => {
                  setSelectedMark(id);
                  const m = order.damageMarks.find((x) => x.id === id);
                  setMarkNote(m?.note ?? "");
                }}
              />
              <div className="mark-side">
                {!locked && (
                  <p className="hint">
                    选择「划痕 / 压痕」后，在板底示意图上点击对应位置打点；
                    再点标记可编辑备注或删除。
                  </p>
                )}
                {selected ? (
                  <div className="mark-editor">
                    <h4>
                      {selected.kind} · {zoneLabel(selected.x, selected.y)}
                    </h4>
                    <textarea
                      rows={3}
                      value={markNote}
                      disabled={locked}
                      placeholder="备注，如：纵向划痕约12cm，待补P-Tex"
                      onChange={(e) => setMarkNote(e.target.value)}
                    />
                    <div className="mark-editor-actions">
                      <button
                        className="primary sm"
                        disabled={locked}
                        onClick={updateSelectedNote}
                      >
                        保存备注
                      </button>
                      <button
                        className="danger sm"
                        disabled={locked}
                        onClick={removeSelected}
                      >
                        删除标记
                      </button>
                    </div>
                  </div>
                ) : (
                  <ul className="mark-list">
                    {order.damageMarks.length === 0 && (
                      <li className="empty">尚未标记损伤</li>
                    )}
                    {order.damageMarks.map((m, i) => (
                      <li
                        key={m.id}
                        onClick={() => {
                          setSelectedMark(m.id);
                          setMarkNote(m.note ?? "");
                        }}
                      >
                        <b>{i + 1}</b>
                        <span>
                          {m.kind} · {zoneLabel(m.x, m.y)}
                          {m.note ? <em>{m.note}</em> : null}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </section>

          <section className="subpanel gate-panel">
            <h3>完工检查</h3>
            <ul className="gate-list">
              <li className={gate.edgeDone ? "ok" : "todo"}>
                <i>{gate.edgeDone ? "✓" : "!"}</i>
                <span>
                  刃角检查
                  <em>
                    {edgeCheckDone(order)
                      ? `侧刃 ${order.sideEdge} / 底刃 ${order.baseEdge}`
                      : "侧刃、底刃未确认"}
                  </em>
                </span>
              </li>
              <li className={gate.damageDone ? "ok" : "todo"}>
                <i>{gate.damageDone ? "✓" : "!"}</i>
                <span>
                  底板损伤标记
                  <em>
                    {damageCheckDone(order)
                      ? order.damageMarks.length > 0
                        ? `已标记 ${order.damageMarks.length} 处`
                        : "已确认无损伤"
                      : "未标记且未确认无损伤"}
                  </em>
                </span>
              </li>
            </ul>
            <button
              className="primary finish-btn"
              disabled={
                locked || gate.missing.length > 0 || order.status === "待交付"
              }
              onClick={() => onTransition("待交付")}
            >
              {gate.missing.length > 0
                ? `不可完工：${gate.missing.join("、")}`
                : order.status === "待交付"
                ? "已进入待交付"
                : "检查通过 · 完工待交付"}
            </button>
          </section>
        </div>

        {/* 右：状态留痕 */}
        <div className="detail-col">
          <section className="subpanel timeline-panel">
            <h3>状态留痕</h3>
            {order.events.length === 0 ? (
              <p className="hint">暂无状态变更。</p>
            ) : (
              <ol className="timeline">
                {[...order.events].reverse().map((ev) => (
                  <li key={ev.id}>
                    <i />
                    <div>
                      <b>
                        {ev.from === "新建" ? "新建工单" : ev.from} → {ev.to}
                      </b>
                      <span>{formatTime(ev.at)}</span>
                      {ev.note ? <em>{ev.note}</em> : null}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
