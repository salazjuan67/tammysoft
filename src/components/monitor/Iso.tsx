export function IsoTable({
  x, y, w = 280, d = 140, h = 48, top = "#f0d2b0", left = "#c49268", right = "#e2b888", edge = "#b07d52",
}: { x: number; y: number; w?: number; d?: number; h?: number; top?: string; left?: string; right?: string; edge?: string }) {
  const ox = d * 0.72;
  const oy = d * 0.38;
  return (
    <g>
      <ellipse cx={x + w / 2 + ox / 2} cy={y + h + 30} rx={w / 2 + ox / 2} ry={oy / 2 + 10} fill="#000" opacity="0.07" />
      <polygon points={`${x},${y + h} ${x + ox},${y + h - oy} ${x + ox},${y - oy} ${x},${y}`} fill={left} />
      <polygon points={`${x + w},${y + h} ${x + w + ox},${y + h - oy} ${x + w + ox},${y - oy} ${x + w},${y}`} fill={right} />
      <polygon points={`${x},${y + h} ${x + w},${y + h} ${x + w + ox},${y + h - oy} ${x + ox},${y + h - oy}`} fill={edge} />
      <polygon points={`${x},${y} ${x + w},${y} ${x + w + ox},${y - oy} ${x + ox},${y - oy}`} fill={top} stroke="rgba(255,255,255,.6)" strokeWidth="1.5" />
      <line x1={x + 18} y1={y + h} x2={x + 18} y2={y + h + 28} stroke={edge} strokeWidth="6" strokeLinecap="round" />
      <line x1={x + w - 10} y1={y + h} x2={x + w - 10} y2={y + h + 28} stroke={right} strokeWidth="6" strokeLinecap="round" />
      <line x1={x + ox + 12} y1={y + h - oy} x2={x + ox + 12} y2={y + h - oy + 28} stroke={left} strokeWidth="5" strokeLinecap="round" />
      <line x1={x + w + ox - 14} y1={y + h - oy} x2={x + w + ox - 14} y2={y + h - oy + 28} stroke={right} strokeWidth="5" strokeLinecap="round" />
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
      <ellipse cx={x + w / 2 + ox / 2} cy={y + h + 10} rx={w / 2 + 14} ry={14} fill="#000" opacity="0.08" />
      <polygon points={`${x},${y + h} ${x + ox},${y + h - oy} ${x + ox},${y - oy} ${x},${y}`} fill="#a9cbd6" />
      <polygon points={`${x + w},${y + h} ${x + w + ox},${y + h - oy} ${x + w + ox},${y - oy} ${x + w},${y}`} fill="#eef8fb" stroke="#bfdde6" />
      <polygon points={`${x},${y} ${x + w},${y} ${x + w + ox},${y - oy} ${x + ox},${y - oy}`} fill="#d7eef4" />
      <rect x={x + 10} y={y + 16} width={w - 18} height={h - 36} rx="8" fill="#bfe3ee" stroke="#8fb9c6" />
      <rect className={glow ? "tammy-ops-glow" : ""} x={x + 16} y={y + 24} width={w - 30} height={h - 52} rx="6" fill="#f4fcff" opacity="0.8" />
      {[0, 1, 2].map((s) => (
        <g key={s}>
          <rect x={x + 16} y={y + 60 + s * 48} width={w - 30} height="3" fill="#9cc9d4" />
          <text x={x + 22} y={y + 52 + s * 48} fill="#4d8392" fontSize="10" fontFamily="ui-monospace, monospace" fontWeight="700">{String.fromCharCode(65 + s)}</text>
        </g>
      ))}
      <rect x={x + w - 14} y={y + h / 2 - 16} width="4" height="32" rx="2" fill="#6f9aa6" />
      <text x={x + w / 2} y={y + h + 24} textAnchor="middle" fill="#2f6d7c" fontSize="12" fontFamily="sans-serif" fontWeight="700">{label}</text>
    </g>
  );
}

export function IsoShelf({ x, y, rows = 3, cols = 7, tint = "#f3c0c8" }: { x: number; y: number; rows?: number; cols?: number; tint?: string }) {
  const w = 260;
  return (
    <g>
      <rect x={x} y={y} width={w} height={rows * 40 + 14} rx="8" fill="#eadbd0" stroke="#d8c3b6" />
      {Array.from({ length: rows }, (_, r) => (
        <g key={r}>
          <rect x={x + 8} y={y + 36 + r * 40} width={w - 16} height="6" rx="3" fill="#c9ad98" />
          {Array.from({ length: cols }, (_, c) => (
            <g key={c} transform={`translate(${x + 18 + c * 34}, ${y + 14 + r * 40})`}>
              <rect x="0" y="4" width="22" height="18" rx="4" fill="#fff" stroke="#e3d6cf" />
              <rect x="0" y="0" width="22" height="7" rx="3" fill={c % 2 ? tint : "#d7a68d"} />
            </g>
          ))}
        </g>
      ))}
    </g>
  );
}

export function IsoPlant({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <ellipse cx="0" cy="26" rx="20" ry="8" fill="#000" opacity="0.08" />
      <path d="M-14 24 L14 24 L10 -4 L-10 -4 Z" fill="#d9a98a" />
      <ellipse cx="0" cy="-4" rx="10" ry="4" fill="#b8886c" />
      <path d="M0 -6 C-20 -26 -30 -40 -18 -58 C-6 -40 -2 -26 0 -6 Z" fill="#6f9e5c" />
      <path d="M0 -6 C18 -28 32 -40 22 -60 C8 -42 2 -26 0 -6 Z" fill="#88b571" />
      <path d="M0 -6 C-4 -30 2 -48 0 -66 C8 -48 6 -30 0 -6 Z" fill="#5d8d4c" />
    </g>
  );
}

export function IsoCrate({ fill, side, units }: { fill: string; side: string; units: number }) {
  const dots = Math.min(6, Math.max(1, Math.ceil(units / 4)));
  return (
    <svg width="84" height="70" viewBox="0 0 84 70" aria-hidden>
      <ellipse cx="42" cy="64" rx="34" ry="6" fill="#000" opacity="0.14" />
      <polygon points="6,30 42,12 78,30 42,48" fill={fill} />
      <polygon points="6,30 6,50 42,68 42,48" fill={side} />
      <polygon points="42,48 42,68 78,50 78,30" fill="#ffffff" opacity="0.3" />
      <polygon points="42,48 42,68 78,50 78,30" fill={side} opacity="0.35" />
      <polygon points="6,30 42,12 78,30 42,48" fill="none" stroke="#ffffff" strokeOpacity="0.8" strokeWidth="1.2" />
      {Array.from({ length: dots }, (_, i) => {
        const col = i % 3;
        const row = Math.floor(i / 3);
        const cx = 42 + (col - 1) * 11 + row * 10;
        const cy = 30 + (col - 1) * 5.5 - row * 5;
        return (
          <g key={i}>
            <ellipse cx={cx} cy={cy + 1} rx="5" ry="2.6" fill="#000" opacity="0.12" />
            <ellipse cx={cx} cy={cy} rx="5" ry="2.8" fill="#fff" />
            <ellipse cx={cx} cy={cy - 1} rx="3.4" ry="1.8" fill="#f2b7c0" />
          </g>
        );
      })}
    </svg>
  );
}
