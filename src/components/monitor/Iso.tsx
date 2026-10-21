export function IsoTable({
  x, y, w = 280, d = 140, h = 48, top = "#f0d2b0", left = "#c49268", right = "#e2b888",
}: { x: number; y: number; w?: number; d?: number; h?: number; top?: string; left?: string; right?: string }) {
  const ox = d * 0.72;
  const oy = d * 0.38;
  return (
    <g>
      <polygon points={`${x},${y + h} ${x + ox},${y + h - oy} ${x + ox},${y - oy} ${x},${y}`} fill={left} />
      <polygon points={`${x + w},${y + h} ${x + w + ox},${y + h - oy} ${x + w + ox},${y - oy} ${x + w},${y}`} fill={right} />
      <polygon points={`${x},${y + h} ${x + w},${y + h} ${x + w + ox},${y + h - oy} ${x + ox},${y + h - oy}`} fill="#b07d52" />
      <polygon points={`${x},${y} ${x + w},${y} ${x + w + ox},${y - oy} ${x + ox},${y - oy}`} fill={top} stroke="#d7b08a" strokeWidth="1" />
      <line x1={x + 18} y1={y + h} x2={x + 18} y2={y + h + 28} stroke="#9a6b45" strokeWidth="6" />
      <line x1={x + w - 10} y1={y + h} x2={x + w - 10} y2={y + h + 28} stroke="#c4966c" strokeWidth="6" />
      <line x1={x + ox + 12} y1={y + h - oy} x2={x + ox + 12} y2={y + h - oy + 28} stroke="#8d6240" strokeWidth="5" />
      <line x1={x + w + ox - 14} y1={y + h - oy} x2={x + w + ox - 14} y2={y + h - oy + 28} stroke="#b8885c" strokeWidth="5" />
    </g>
  );
}

export function IsoFridge({ x, y, label, glow }: { x: number; y: number; label: string; glow: boolean }) {
  const w = 118;
  const d = 46;
  const h = 210;
  const ox = d * 0.72;
  const oy = d * 0.38;
  return (
    <g>
      <polygon points={`${x},${y + h} ${x + ox},${y + h - oy} ${x + ox},${y - oy} ${x},${y}`} fill="#b9d7e0" />
      <polygon points={`${x + w},${y + h} ${x + w + ox},${y + h - oy} ${x + w + ox},${y - oy} ${x + w},${y}`} fill="#eef8fb" />
      <polygon points={`${x},${y} ${x + w},${y} ${x + w + ox},${y - oy} ${x + ox},${y - oy}`} fill="#d7eef4" />
      <rect x={x + 10} y={y + 16} width={w - 18} height={h - 36} rx="8" fill="#c8ebf3" stroke="#8fb9c6" />
      <rect className={glow ? "tammy-ops-glow" : ""} x={x + 16} y={y + 24} width={w - 30} height={h - 52} rx="6" fill="#f4fcff" opacity="0.75" />
      {[0, 1, 2].map((s) => (
        <g key={s}>
          <line x1={x + 18} y1={y + 52 + s * 48} x2={x + w - 16} y2={y + 52 + s * 48} stroke="#9cc9d4" strokeWidth="2" />
          <text x={x + 24} y={y + 48 + s * 48} fill="#5e8b97" fontSize="10" fontFamily="sans-serif">{String.fromCharCode(65 + s)}</text>
        </g>
      ))}
      <circle cx={x + w - 8} cy={y + h / 2} r="4" fill="#7aa3b0" />
      <text x={x + w / 2} y={y + h + 18} textAnchor="middle" fill="#3e7382" fontSize="12" fontFamily="sans-serif" fontWeight="700">{label}</text>
    </g>
  );
}

export function IsoCrate({ fill, side }: { fill: string; side: string }) {
  return (
    <svg width="78" height="64" viewBox="0 0 78 64" aria-hidden>
      <polygon points="6,28 39,12 72,28 39,44" fill={fill} />
      <polygon points="6,28 6,46 39,62 39,44" fill={side} />
      <polygon points="39,44 39,62 72,46 72,28" fill="#ffffff" opacity="0.28" />
      <polygon points="6,28 39,12 72,28 39,44" fill="none" stroke="#ffffffaa" strokeWidth="1" />
    </svg>
  );
}
