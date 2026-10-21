import { IsoFridge, IsoPlant, IsoShelf, IsoTable } from "./Iso";

const W = 2200;
const H = 1100;
const WALL_Y = 262;
const PARTITIONS = [520, 1385];

export function KitchenBackdrop({ calm }: { calm: boolean }) {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full" preserveAspectRatio="xMidYMid meet" aria-hidden>
      <defs>
        <pattern id="tile" width="48" height="28" patternUnits="userSpaceOnUse">
          <path d="M24 0 L48 14 L24 28 L0 14 Z" fill="#f7e7da" stroke="#eed7c8" strokeWidth="1" />
        </pattern>
        <pattern id="tileProd" width="48" height="28" patternUnits="userSpaceOnUse">
          <path d="M24 0 L48 14 L24 28 L0 14 Z" fill="#fbeee6" stroke="#f0dbcf" strokeWidth="1" />
        </pattern>
        <pattern id="tileCold" width="48" height="28" patternUnits="userSpaceOnUse">
          <path d="M24 0 L48 14 L24 28 L0 14 Z" fill="#eef5f7" stroke="#dbe9ee" strokeWidth="1" />
        </pattern>
        <pattern id="wallTile" width="26" height="16" patternUnits="userSpaceOnUse">
          <rect width="26" height="16" fill="#fbe3e3" />
          <rect x="0.5" y="0.5" width="25" height="15" rx="2" fill="#fde9e9" stroke="#f3d1d3" strokeWidth="0.8" />
        </pattern>
        <linearGradient id="backwall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff1ee" />
          <stop offset="100%" stopColor="#f7dad4" />
        </linearGradient>
        <radialGradient id="light" cx="50%" cy="0%" r="80%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Pared de fondo + zócalo */}
      <rect width={W} height={H} fill="url(#backwall)" />
      <rect x="0" y="150" width={W} height="110" fill="url(#wallTile)" />
      <rect x="0" y={WALL_Y - 4} width={W} height="6" fill="#e8bfc0" />

      {/* Pisos por ambiente */}
      <rect x="0" y={WALL_Y} width={PARTITIONS[0]} height={H - WALL_Y} fill="url(#tile)" />
      <rect x={PARTITIONS[0]} y={WALL_Y} width={PARTITIONS[1] - PARTITIONS[0]} height={H - WALL_Y} fill="url(#tileProd)" />
      <rect x={PARTITIONS[1]} y={WALL_Y} width={W - PARTITIONS[1]} height={H - WALL_Y} fill="url(#tileCold)" />
      <rect width={W} height={H} fill="url(#light)" />

      {/* Tabiques bajos con vano de paso */}
      {PARTITIONS.map((px) => (
        <g key={px}>
          <rect x={px - 9} y={150} width="18" height={H - 150} fill="#f3d6d2" />
          <rect x={px - 9} y={150} width="6" height={H - 150} fill="#fff4f1" />
          <rect x={px + 3} y={150} width="6" height={H - 150} fill="#e4bcb8" />
          <rect x={px - 11} y={760} width="22" height="180" fill="url(#tile)" opacity="0.9" />
          <rect x={px - 11} y={756} width="22" height="4" fill="#d9a9a6" />
          <rect x={px - 11} y={940} width="22" height="4" fill="#d9a9a6" />
        </g>
      ))}

      {/* Cartel principal */}
      <g>
        <rect x="56" y="40" width="430" height="100" rx="20" fill="#fff" stroke="#f0cfd0" />
        <rect x="56" y="40" width="430" height="100" rx="20" fill="#fde7e7" opacity="0.5" />
        <circle cx="104" cy="90" r="24" fill="#f6c3cb" />
        <path d="M92 84 h24 l-3 18 h-18 z" fill="#fff" />
        <circle cx="104" cy="80" r="9" fill="#e78a9a" />
        <text x="144" y="86" fill="#d45a78" fontFamily="Georgia, serif" fontSize="34" fontWeight="700">Postres Tammy</text>
        <text x="146" y="114" fill="#b07a82" fontFamily="sans-serif" fontSize="12" letterSpacing="3">UN MUNDO MÁS DULCE</text>
      </g>

      {/* Pizarra de pedidos (ambiente izquierdo) */}
      <g>
        <rect x="120" y="296" width="300" height="130" rx="10" fill="#4a3b36" stroke="#8a6b5e" strokeWidth="6" />
        <text x="140" y="336" fill="#f7e6d8" fontFamily="Georgia, serif" fontSize="22" fontStyle="italic">Pedidos del día</text>
        {[0, 1, 2].map((i) => (
          <line key={i} x1="140" y1={358 + i * 20} x2={300 + (i % 2) * 60} y2={358 + i * 20} stroke="#8a7a72" strokeWidth="3" strokeLinecap="round" strokeDasharray="6 8" />
        ))}
      </g>

      {/* Sala de producción: estantes, placa, mesas, batidora */}
      <IsoShelf x={600} y={46} />
      <IsoShelf x={900} y={46} tint="#c9b8e8" />
      <g>
        <rect x="1190" y="90" width="170" height="40" rx="8" fill="#fff" stroke="#f0cfd0" />
        <text x="1275" y="116" textAnchor="middle" fill="#c45b72" fontFamily="sans-serif" fontSize="13" fontWeight="700" letterSpacing="2">PRODUCCIÓN</text>
      </g>
      <IsoTable x={580} y={300} w={620} d={130} h={40} top="#e8e4e0" left="#b9b1aa" right="#d9d2cb" edge="#a39b94" />
      <IsoTable x={580} y={560} w={620} d={130} h={40} top="#f6dcc0" left="#c99a70" right="#e6c29c" />
      <g className={calm ? "" : "tammy-ops-mixer"}>
        <rect x="1220" y="214" width="86" height="22" rx="8" fill="#f2b8c4" />
        <rect x="1248" y="180" width="28" height="44" rx="8" fill="#e38ea1" />
        <circle cx="1262" cy="252" r="26" fill="#f7f1ea" stroke="#d6cbc0" strokeWidth="3" />
      </g>
      <g>
        <ellipse cx="1300" cy="300" rx="30" ry="12" fill="#e9c2a8" />
        <ellipse cx="1300" cy="290" rx="24" ry="14" fill="#f0a89a" />
        <ellipse cx="1300" cy="280" rx="10" ry="4" fill="#fff" />
        <g className={calm ? "" : "tammy-ops-steam"}>
          <circle cx="1292" cy="266" r="4" fill="#fff" />
          <circle cx="1306" cy="260" r="5" fill="#fff" />
        </g>
      </g>

      {/* Mostrador de pedidos por hacer */}
      <IsoTable x={90} y={580} w={330} d={150} h={42} top="#f6dcc0" left="#c99a70" right="#e6c29c" />
      <g>
        <ellipse cx="400" cy="560" rx="34" ry="13" fill="#5a3328" />
        <ellipse cx="400" cy="548" rx="26" ry="14" fill="#3f241c" />
        <ellipse cx="400" cy="540" rx="12" ry="5" fill="#f6dbe0" />
      </g>

      {/* Cámara fría: heladeras, mesas de despacho y entregas */}
      <g>
        <rect x="1700" y="30" width="190" height="60" rx="12" fill="#dff1f8" stroke="#bcd8e2" />
        <line x1="1795" y1="30" x2="1795" y2="90" stroke="#bcd8e2" strokeWidth="3" />
        <rect x="2080" y="40" width="100" height="36" rx="8" fill="#e9e3dd" stroke="#cfc6bf" />
        <g className={calm ? "" : "tammy-ops-glow"}>
          <circle cx="2098" cy="58" r="4" fill="#5cc27a" />
        </g>
      </g>
      <IsoFridge x={1440} y={188} label="Heladera 1" glow={!calm} />
      <IsoFridge x={1700} y={188} label="Heladera 2" glow={!calm} />
      <IsoFridge x={1960} y={188} label="Heladera 3" glow={!calm} />
      <IsoTable x={1430} y={690} w={320} d={120} h={38} top="#e6d2f4" left="#b894d0" right="#d8c0ea" edge="#a27fc0" />
      <IsoTable x={1810} y={690} w={320} d={120} h={38} top="#d7f0e0" left="#8fc9a8" right="#c5e8d2" edge="#7cb894" />
      <g>
        <rect x="2110" y="880" width="46" height="60" rx="6" fill="#efe9e4" stroke="#d3cbc3" />
        <rect x="2118" y="887" width="30" height="20" rx="3" fill="#cfe6ee" />
        <rect x="2118" y="913" width="30" height="20" rx="3" fill="#e4dcd4" />
      </g>

      <IsoPlant x={60} y={1010} />
      <IsoPlant x={1330} y={1040} />
      <IsoPlant x={2150} y={1010} />
    </svg>
  );
}
