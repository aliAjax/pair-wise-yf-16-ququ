import { EdgeInfo, WAX_OPTIONS } from "../types";

interface Props {
  value: EdgeInfo;
  onChange: (next: EdgeInfo) => void;
  /** 新工单里为 true 时不显示确认勾选（创建后再在工单里确认） */
  hideConfirm?: boolean;
}

/** 刃角参数表：侧刃、底刃、打蜡方式 + 技师确认 */
export function EdgeSection({ value, onChange, hideConfirm }: Props) {
  const filled =
    value.sideEdge.trim() !== "" && value.baseEdge.trim() !== "" && value.wax.trim() !== "";

  const patch = (p: Partial<EdgeInfo>) => {
    const next = { ...value, ...p };
    // 任一字段被清空时，已确认状态自动失效，防止带空值完工
    if (
      next.sideEdge.trim() === "" ||
      next.baseEdge.trim() === "" ||
      next.wax.trim() === ""
    ) {
      next.done = false;
    }
    onChange(next);
  };

  return (
    <div className="edge-section">
      <div className="edge-grid">
        <label>
          <span>侧刃角度（°）</span>
          <input
            type="number"
            step="0.5"
            min="85"
            max="92"
            placeholder="如 89"
            value={value.sideEdge}
            onChange={(e) => patch({ sideEdge: e.target.value })}
          />
        </label>
        <label>
          <span>底刃角度（°）</span>
          <input
            type="number"
            step="0.5"
            min="0"
            max="3"
            placeholder="如 1"
            value={value.baseEdge}
            onChange={(e) => patch({ baseEdge: e.target.value })}
          />
        </label>
        <label>
          <span>打蜡方式</span>
          <select value={value.wax} onChange={(e) => patch({ wax: e.target.value })}>
            <option value="">选择打蜡方式</option>
            {WAX_OPTIONS.map((w) => (
              <option key={w} value={w}>
                {w}
              </option>
            ))}
          </select>
        </label>
      </div>

      {!hideConfirm && (
        <label className={filled ? "confirm-row" : "confirm-row disabled"}>
          <input
            type="checkbox"
            checked={value.done && filled}
            disabled={!filled}
            onChange={(e) => onChange({ ...value, done: e.target.checked })}
          />
          <span>
            刃角检查完成（已按上表角度修刃、验角）
            {!filled && <em className="confirm-tip"> — 需先填齐侧刃、底刃和打蜡方式</em>}
          </span>
        </label>
      )}
    </div>
  );
}
