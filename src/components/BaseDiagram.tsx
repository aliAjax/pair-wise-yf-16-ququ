import { useRef } from "react";
import type { DamageKind, DamageMark } from "../types";

interface BaseDiagramProps {
  marks: DamageMark[];
  selectedId: string | null;
  tool: DamageKind;
  readOnly?: boolean;
  onAdd: (kind: DamageKind, x: number, y: number) => void;
  onSelect: (id: string | null) => void;
}

const VB_W = 180;
const VB_H = 620;
const PAD_X = 42; // 板身边界
const PAD_TOP = 10;

function toSvgX(x: number) {
  return PAD_X + (x / 100) * (VB_W - PAD_X * 2);
}

function toSvgY(y: number) {
  return PAD_TOP + (y / 100) * (VB_H - PAD_TOP * 2);
}

const BOARD_PATH = `
  M 90 10
  C 120 10 138 32 138 60
  C 138 180 118 250 108 310
  C 118 370 138 440 138 560
  C 138 588 120 610 90 610
  C 60 610 42 588 42 560
  C 42 440 62 370 72 310
  C 62 250 42 180 42 60
  C 42 32 60 10 90 10 Z`;

function MarkShape({ mark, selected }: { mark: DamageMark; selected: boolean }) {
  const cx = toSvgX(mark.x);
  const cy = toSvgY(mark.y);
  if (mark.kind === "划痕") {
    return (
      <g>
        {selected && <circle cx={cx} cy={cy} r={13} className="mark-halo" />}
        <polyline
          points={`${cx - 9},${cy - 7} ${cx},${cy + 3} ${cx + 9},${cy - 5}`}
          className="mark-scratch"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx={cx} cy={cy} r={12} fill="transparent" />
      </g>
    );
  }
  return (
    <g>
      {selected && <circle cx={cx} cy={cy} r={13} className="mark-halo" />}
      <circle cx={cx} cy={cy} r={8} className="mark-dent" />
      <path
        d={`M ${cx - 4} ${cy - 4} L ${cx + 4} ${cy + 4} M ${cx + 4} ${
          cy - 4
        } L ${cx - 4} ${cy + 4}`}
        stroke="#fff"
        strokeWidth={2}
        strokeLinecap="round"
      />
      <circle cx={cx} cy={cy} r={12} fill="transparent" />
    </g>
  );
}

export function BaseDiagram({
  marks,
  selectedId,
  tool,
  readOnly,
  onAdd,
  onSelect,
}: BaseDiagramProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  function handleClick(e: React.MouseEvent<SVGSVGElement>) {
    if (readOnly) return;
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = Math.min(97, Math.max(3, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.min(97, Math.max(3, ((e.clientY - rect.top) / rect.height) * 100));
    onAdd(tool, Math.round(x * 10) / 10, Math.round(y * 10) / 10);
  }

  return (
    <div className="diagram-wrap">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        className={`base-diagram${readOnly ? " is-readonly" : ""}`}
        onClick={handleClick}
        role="img"
        aria-label="板底示意图，点击添加损伤标记"
      >
        <path d={BOARD_PATH} className="board-shape" />
        {/* 固定器站位参考线 */}
        <ellipse cx="90" cy="220" rx="34" ry="26" className="binding-zone" />
        <ellipse cx="90" cy="400" rx="34" ry="26" className="binding-zone" />
        <line x1="20" y1="120" x2="160" y2="120" className="guide-line" />
        <line x1="20" y1="500" x2="160" y2="500" className="guide-line" />
        <text x="90" y="34" textAnchor="middle" className="board-label">
          板头
        </text>
        <text x="90" y="592" textAnchor="middle" className="board-label">
          板尾
        </text>
        {marks.map((m) => (
          <g
            key={m.id}
            className="mark-group"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(m.id === selectedId ? null : m.id);
            }}
          >
            <MarkShape mark={m} selected={m.id === selectedId} />
          </g>
        ))}
      </svg>
      <div className="diagram-legend">
        <span>
          <i className="legend-scratch" /> 划痕
        </span>
        <span>
          <i className="legend-dent" /> 压痕
        </span>
      </div>
    </div>
  );
}
