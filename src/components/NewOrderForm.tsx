import { useState } from "react";
import {
  BOARD_TYPES,
  BoardType,
  DamageMark,
  EDGE_DEFAULTS,
  EdgeInfo,
} from "../types";
import { BaseDiagram } from "./BaseDiagram";
import { EdgeSection } from "./EdgeSection";

export interface OrderDraft {
  customer: string;
  brand: string;
  length: string;
  boardType: BoardType | "";
  preference: string;
  edge: EdgeInfo;
  damages: DamageMark[];
  noDamage: boolean;
}

interface Props {
  onSubmit: (draft: OrderDraft) => void;
  onCancel: () => void;
}

const EMPTY_EDGE: EdgeInfo = { sideEdge: "", baseEdge: "", wax: "", done: false };

/** 登记新工单：基础信息 → 选板型后填刃角与打蜡 → 板底点选损伤 */
export function NewOrderForm({ onSubmit, onCancel }: Props) {
  const [customer, setCustomer] = useState("");
  const [brand, setBrand] = useState("");
  const [length, setLength] = useState("");
  const [boardType, setBoardType] = useState<BoardType | "">("");
  const [preference, setPreference] = useState("");
  const [edge, setEdge] = useState<EdgeInfo>(EMPTY_EDGE);
  const [damages, setDamages] = useState<DamageMark[]>([]);
  const [noDamage, setNoDamage] = useState(false);
  const [error, setError] = useState("");

  const pickBoardType = (t: BoardType) => {
    setBoardType(t);
    // 选择板型后带出该板型的常用刃角，技师可再改
    setEdge((prev) => ({ ...prev, ...EDGE_DEFAULTS[t] }));
  };

  const submit = () => {
    if (!customer.trim()) return setError("请填写客户姓名");
    if (!brand.trim()) return setError("请填写雪板品牌");
    if (!length.trim() || Number.isNaN(Number(length))) return setError("请填写有效的板长（cm）");
    if (!boardType) return setError("请选择板型");
    onSubmit({
      customer: customer.trim(),
      brand: brand.trim(),
      length: length.trim(),
      boardType,
      preference: preference.trim(),
      edge,
      damages,
      noDamage: damages.length === 0 && noDamage,
    });
  };

  return (
    <section className="panel detail-panel">
      <div className="heading">
        <div>
          <p>前台交板登记</p>
          <h2>新增维护工单</h2>
        </div>
        <button type="button" onClick={onCancel}>返回工单</button>
      </div>

      <div className="field-grid">
        <label>
          <span>客户姓名 *</span>
          <input value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="如 林晓峰" />
        </label>
        <label>
          <span>雪板品牌 *</span>
          <input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="如 Burton" />
        </label>
        <label>
          <span>长度（cm）*</span>
          <input type="number" value={length} onChange={(e) => setLength(e.target.value)} placeholder="如 156" />
        </label>
        <label>
          <span>客户偏好</span>
          <input value={preference} onChange={(e) => setPreference(e.target.value)} placeholder="如 弱咬雪、出弯快" />
        </label>
      </div>

      <div className="detail-block">
        <h3>板型 *</h3>
        <div className="chips">
          {BOARD_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              className={boardType === t ? "chip active" : "chip"}
              onClick={() => pickBoardType(t)}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {boardType && (
        <div className="detail-block">
          <h3>刃角与打蜡（{boardType}）</h3>
          <EdgeSection value={edge} onChange={setEdge} hideConfirm />
        </div>
      )}

      {boardType && (
        <div className="detail-block">
          <h3>板底损伤点选</h3>
          <BaseDiagram
            marks={damages}
            onAdd={(m) => {
              setDamages((prev) => [...prev, m]);
              setNoDamage(false);
            }}
            onRemove={(id) => setDamages((prev) => prev.filter((m) => m.id !== id))}
          />
          {damages.length === 0 && (
            <label className="confirm-row">
              <input
                type="checkbox"
                checked={noDamage}
                onChange={(e) => setNoDamage(e.target.checked)}
              />
              <span>交板目检无损伤（也可稍后由技师在工单中标记）</span>
            </label>
          )}
        </div>
      )}

      {error && <p className="form-error">{error}</p>}

      <div className="action-bar">
        <button type="button" className="primary" onClick={submit}>创建工单并加入队列</button>
        <button type="button" onClick={onCancel}>取消</button>
      </div>
    </section>
  );
}
