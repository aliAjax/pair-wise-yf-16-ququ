import { useState } from "react";
import { DAMAGE_LABEL, DamageMark, DamageType, describeMark, uid } from "../types";

interface Props {
  marks: DamageMark[];
  onAdd: (mark: DamageMark) => void;
  onRemove: (id: string) => void;
}

/** 板底示意图：选择损伤类型后点击板面打点，再点标记可删除 */
export function BaseDiagram({ marks, onAdd, onRemove }: Props) {
  const [mode, setMode] = useState<DamageType>("scratch");

  const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    onAdd({ id: uid(), type: mode, x, y });
  };

  return (
    <div className="diagram-wrap">
      <div className="diagram-toolbar">
        <span className="diagram-hint">先在下方选择损伤类型，再点击板面打点：</span>
        <div className="mode-toggle" role="group" aria-label="损伤类型">
          {(Object.keys(DAMAGE_LABEL) as DamageType[]).map((t) => (
            <button
              key={t}
              type="button"
              className={mode === t ? `mode-btn active ${t}` : `mode-btn ${t}`}
              onClick={() => setMode(t)}
            >
              {DAMAGE_LABEL[t]}
            </button>
          ))}
        </div>
      </div>

      <div className="diagram-body">
        <svg
          viewBox="0 0 120 380"
          className="board-svg"
          onClick={handleClick}
          role="img"
          aria-label="板底示意图，点击标记损伤位置"
        >
          {/* 板形：对称双板头轮廓 */}
          <path
            className="board-outline"
            d="M 60 6
               C 82 6 92 26 92 52
               L 92 120
               C 92 150 88 160 88 190
               C 88 220 92 230 92 260
               L 92 328
               C 92 354 82 374 60 374
               C 38 374 28 354 28 328
               L 28 260
               C 28 230 32 220 32 190
               C 32 160 28 150 28 120
               L 28 52
               C 28 26 38 6 60 6 Z"
          />
          {/* 板刃线 */}
          <path
            className="board-edge-line"
            d="M 60 14
               C 78 14 86 30 86 52
               L 86 118
               C 86 148 82 158 82 190
               C 82 222 86 232 86 262
               L 86 328
               C 86 350 78 366 60 366
               C 42 366 34 350 34 328
               L 34 262
               C 34 232 38 222 38 190
               C 38 158 34 148 34 118
               L 34 52
               C 34 30 42 14 60 14 Z"
          />
          {/* 固定器孔位 */}
          {[150, 230].map((cy) =>
            [-8, 8].map((dx) =>
              [-6, 6].map((dy) => (
                <circle key={`${cy}-${dx}-${dy}`} className="insert" cx={60 + dx} cy={cy + dy} r="2.4" />
              ))
            )
          )}
          <text className="board-label" x="60" y="34" textAnchor="middle">板头</text>
          <text className="board-label" x="60" y="362" textAnchor="middle">板尾</text>

          {/* 损伤标记 */}
          {marks.map((m) => {
            const cx = (m.x / 100) * 120;
            const cy = (m.y / 100) * 380;
            return (
              <g
                key={m.id}
                className={`mark ${m.type}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(m.id);
                }}
              >
                <title>{`${describeMark(m)}（点击删除）`}</title>
                {m.type === "scratch" ? (
                  <g>
                    <line x1={cx - 7} y1={cy - 10} x2={cx + 7} y2={cy + 10} />
                    <line x1={cx - 4} y1={cy - 11} x2={cx + 8} y2={cy + 7} className="thin" />
                  </g>
                ) : (
                  <g>
                    <circle cx={cx} cy={cy} r="7" />
                    <circle cx={cx} cy={cy} r="3" className="inner" />
                  </g>
                )}
              </g>
            );
          })}
        </svg>

        <div className="mark-list">
          <p className="mark-list-title">
            已标记 {marks.length} 处{marks.length > 0 && "（点击图中标记可删除）"}
          </p>
          {marks.length === 0 && <p className="mark-empty">尚无损伤点，若板底完好请勾选右侧「无损伤」。</p>}
          <ul>
            {marks.map((m, i) => (
              <li key={m.id}>
                <span className={`dot ${m.type}`} />
                <span>{`${i + 1}. ${describeMark(m)}`}</span>
                <button type="button" className="link-btn" onClick={() => onRemove(m.id)}>
                  删除
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
