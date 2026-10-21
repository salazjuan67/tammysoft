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

/** Vitrina frontal con leve costado isométrico; el cabezal y los renglones van en HTML encima. */
export function Vitrina({ x, y, w, h, headH, glow }: { x: number; y: number; w: number; h: number; headH: number; glow: boolean }) {
  const d = 22;
  return (
    <g>
      <ellipse cx={x + w / 2 + d / 2} cy={y + h + 12} rx={w / 2 + 10} ry={12} fill="#000" opacity="0.08" />
      <polygon points={`${x + w},${y} ${x + w + d},${y - d * 0.5} ${x + w + d},${y + h - d * 0.5} ${x + w},${y + h}`} fill="#a9cbd6" />
      <polygon points={`${x},${y} ${x + w},${y} ${x + w + d},${y - d * 0.5} ${x + d},${y - d * 0.5}`} fill="#d7eef4" />
      <rect x={x} y={y} width={w} height={h} rx="12" fill="#e6f4f8" stroke="#bcd8e2" strokeWidth="2" />
      <rect x={x} y={y} width={w} height={headH} rx="12" fill="#cfe7ef" />
      <rect x={x} y={y + headH - 10} width={w} height="10" fill="#cfe7ef" />
      <rect x={x + 8} y={y + headH + 2} width={w - 16} height={h - headH - 12} rx="8" fill="#f6fcfe" stroke="#cfe3ea" />
      <rect className={glow ? "tammy-ops-glow" : ""} x={x + 12} y={y + headH + 6} width="6" height={h - headH - 20} rx="3" fill="#9fd7e8" />
      <line x1={x + w - 30} y1={y + headH + 10} x2={x + w - 14} y2={y + h - 20} stroke="#fff" strokeWidth="6" strokeLinecap="round" opacity="0.8" />
      <rect x={x + w - 12} y={y + h / 2 - 20} width="5" height="40" rx="2.5" fill="#6f9aa6" />
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

const HAIR = ["#6b4a3a", "#2f2420", "#b9814f", "#8a5a3c", "#3d2b24"];

/**
 * Figura de ambiente vista de espaldas, trabajando hacia la mesa. `x,y` = pies.
 * Es decorativa: no representa personal real ni asignaciones.
 */
export function IsoWorker({ x, y, accent, variant = 0, courier = false, walking = false, working = false }: {
  x: number; y: number; accent: string; variant?: number; courier?: boolean; walking?: boolean;
  /** Mueve los brazos sobre la mesa mientras está parado en su estación. */
  working?: boolean;
}) {
  const arm = working && !walking ? "tammy-ops-arm" : "";
  const delay = `${(variant % 4) * -0.7}s`;
  const hair = HAIR[variant % HAIR.length];
  const jacket = courier ? accent : "#ffffff";
  return (
    <g transform={`translate(${x},${y})`}>
      <ellipse cx="0" cy="2" rx="24" ry="7" fill="#000" opacity="0.12" />
      <g className={walking ? "tammy-ops-walk" : ""}>
      <rect x="-12" y="-36" width="10" height="36" rx="4" fill="#4a3b36" />
      <rect x="2" y="-36" width="10" height="36" rx="4" fill="#3f322e" />
      <ellipse cx="-7" cy="0" rx="8" ry="4" fill="#2a201d" />
      <ellipse cx="7" cy="0" rx="8" ry="4" fill="#2a201d" />
      <g className={arm} style={{ animationDelay: delay }}>
        <rect x="-29" y="-84" width="11" height="34" rx="5.5" fill={jacket} stroke="#e3d3cc" transform="rotate(24 -23 -80)" />
      </g>
      <g className={arm && `${arm} tammy-ops-arm--r`} style={{ animationDelay: delay }}>
        <rect x="18" y="-84" width="11" height="34" rx="5.5" fill={jacket} stroke="#e3d3cc" transform="rotate(-24 23 -80)" />
      </g>
      <rect x="-21" y="-88" width="42" height="58" rx="15" fill={jacket} stroke={courier ? "rgba(0,0,0,.12)" : "#e3d3cc"} />
      {!courier && (
        <>
          <rect x="-21" y="-56" width="42" height="5" fill={accent} />
          <path d="M-4 -51 L-10 -40 M4 -51 L10 -40" stroke={accent} strokeWidth="4" strokeLinecap="round" />
        </>
      )}
      {courier && <rect x="-14" y="-80" width="28" height="34" rx="6" fill="#000" opacity="0.12" />}
      <rect x="-5" y="-94" width="10" height="8" rx="3" fill="#e8b89c" />
      <circle cx="0" cy="-104" r="15" fill={hair} />
      {courier ? (
        <path d="M-16 -106 Q0 -126 16 -106 Z" fill={accent} stroke="rgba(0,0,0,.15)" />
      ) : (
        <g fill="#fff" stroke="#e6dad4" strokeWidth="1.5">
          <rect x="-14" y="-122" width="28" height="12" rx="3" />
          <circle cx="-8" cy="-126" r="8" />
          <circle cx="8" cy="-126" r="8" />
          <circle cx="0" cy="-131" r="9" />
        </g>
      )}
      </g>
    </g>
  );
}

/** Cantidad de cajas apiladas según potes: ≤12 una, ≤28 dos, más de 28 tres. */
export function crateLayers(units: number) {
  return units > 28 ? 3 : units > 12 ? 2 : 1;
}

export const CRATE_W = 104;
const LAYER_DY = 17;

export function crateHeight(units: number) {
  return Math.round((70 + (crateLayers(units) - 1) * LAYER_DY) * (CRATE_W / 84));
}

export function IsoCrate({ fill, side, units }: { fill: string; side: string; units: number }) {
  const layers = crateLayers(units);
  const dots = Math.min(6, Math.max(1, Math.ceil(units / 4)));
  const H = 70 + (layers - 1) * LAYER_DY;
  const Layer = ({ ty, top }: { ty: number; top: boolean }) => (
    <g transform={`translate(0 ${ty})`}>
      <polygon points="6,30 42,12 78,30 42,48" fill={fill} />
      <polygon points="6,30 6,50 42,68 42,48" fill={side} />
      <polygon points="42,48 42,68 78,50 78,30" fill="#ffffff" opacity="0.3" />
      <polygon points="42,48 42,68 78,50 78,30" fill={side} opacity="0.35" />
      <line x1="6" y1="40" x2="42" y2="58" stroke="#000" strokeOpacity="0.08" strokeWidth="2" />
      <line x1="42" y1="58" x2="78" y2="40" stroke="#fff" strokeOpacity="0.35" strokeWidth="2" />
      <polygon points="6,30 42,12 78,30 42,48" fill="none" stroke="#ffffff" strokeOpacity="0.8" strokeWidth="1.2" />
      {top &&
        Array.from({ length: dots }, (_, i) => {
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
    </g>
  );
  return (
    <svg width={CRATE_W} height={Math.round(H * (CRATE_W / 84))} viewBox={`0 0 84 ${H}`} aria-hidden>
      <ellipse cx="42" cy={H - 6} rx="36" ry="7" fill="#000" opacity="0.16" />
      {Array.from({ length: layers }, (_, l) => (
        <Layer key={l} ty={(layers - 1 - l) * LAYER_DY} top={l === layers - 1} />
      ))}
    </svg>
  );
}
