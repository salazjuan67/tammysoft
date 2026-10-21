import { IsoFridge, IsoPlant, IsoShelf, IsoTable } from "./Iso";

export function KitchenBackdrop({ calm }: { calm: boolean }) {
  return (
    <svg viewBox="0 0 1600 900" className="h-full w-full" preserveAspectRatio="xMidYMid meet" aria-hidden>
      <defs>
        <pattern id="tile" width="48" height="28" patternUnits="userSpaceOnUse">
          <path d="M24 0 L48 14 L24 28 L0 14 Z" fill="#f7e7da" stroke="#eed7c8" strokeWidth="1" />
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

      <rect width="1600" height="900" fill="url(#backwall)" />
      <rect x="0" y="150" width="1600" height="110" fill="url(#wallTile)" />
      <rect x="0" y="258" width="1600" height="6" fill="#e8bfc0" />
      <polygon points="0,262 1600,262 1600,900 0,900" fill="url(#tile)" />
      <rect width="1600" height="900" fill="url(#light)" />

      <g>
        <rect x="56" y="40" width="430" height="100" rx="20" fill="#fff" stroke="#f0cfd0" />
        <rect x="56" y="40" width="430" height="100" rx="20" fill="#fde7e7" opacity="0.5" />
        <circle cx="104" cy="90" r="24" fill="#f6c3cb" />
        <path d="M92 84 h24 l-3 18 h-18 z" fill="#fff" />
        <circle cx="104" cy="80" r="9" fill="#e78a9a" />
        <text x="144" y="86" fill="#d45a78" fontFamily="Georgia, serif" fontSize="34" fontWeight="700">Postres Tammy</text>
        <text x="146" y="114" fill="#b07a82" fontFamily="sans-serif" fontSize="12" letterSpacing="3">UN MUNDO MÁS DULCE</text>
      </g>

      <g>
        <rect x="1250" y="30" width="190" height="74" rx="12" fill="#dff1f8" stroke="#bcd8e2" />
        <line x1="1345" y1="30" x2="1345" y2="104" stroke="#bcd8e2" strokeWidth="3" />
        <rect x="1460" y="34" width="110" height="36" rx="8" fill="#e9e3dd" stroke="#cfc6bf" />
        <g className={calm ? "" : "tammy-ops-glow"}>
          <circle cx="1480" cy="52" r="4" fill="#5cc27a" />
        </g>
      </g>

      <IsoShelf x={560} y={60} />
      <IsoShelf x={850} y={60} tint="#c9b8e8" />

      <IsoTable x={90} y={560} w={360} d={150} h={42} top="#f6dcc0" left="#c99a70" right="#e6c29c" />
      <IsoTable x={520} y={320} w={340} d={130} h={40} top="#e8e4e0" left="#b9b1aa" right="#d9d2cb" edge="#a39b94" />
      <IsoTable x={500} y={620} w={360} d={130} h={40} top="#e6d2f4" left="#b894d0" right="#d8c0ea" edge="#a27fc0" />
      <IsoTable x={1000} y={670} w={400} d={120} h={36} top="#d7f0e0" left="#8fc9a8" right="#c5e8d2" edge="#7cb894" />

      <g className={calm ? "" : "tammy-ops-mixer"}>
        <rect x="770" y="214" width="86" height="22" rx="8" fill="#f2b8c4" />
        <rect x="798" y="180" width="28" height="44" rx="8" fill="#e38ea1" />
        <circle cx="812" cy="252" r="26" fill="#f7f1ea" stroke="#d6cbc0" strokeWidth="3" />
      </g>
      <g>
        <ellipse cx="640" cy="286" rx="30" ry="12" fill="#e9c2a8" />
        <ellipse cx="640" cy="276" rx="24" ry="14" fill="#f0a89a" />
        <ellipse cx="640" cy="266" rx="10" ry="4" fill="#fff" />
        <g className={calm ? "" : "tammy-ops-steam"}>
          <circle cx="632" cy="252" r="4" fill="#fff" />
          <circle cx="646" cy="246" r="5" fill="#fff" />
        </g>
      </g>
      <g>
        <ellipse cx="890" cy="300" rx="34" ry="13" fill="#5a3328" />
        <ellipse cx="890" cy="288" rx="26" ry="14" fill="#3f241c" />
        <ellipse cx="890" cy="280" rx="12" ry="5" fill="#f6dbe0" />
      </g>

      <IsoFridge x={1028} y={188} label="Heladera 1" glow={!calm} />
      <IsoFridge x={1188} y={188} label="Heladera 2" glow={!calm} />
      <IsoFridge x={1348} y={188} label="Heladera 3" glow={!calm} />

      <g>
        <rect x="560" y="705" width="46" height="60" rx="6" fill="#efe9e4" stroke="#d3cbc3" />
        <rect x="568" y="712" width="30" height="20" rx="3" fill="#cfe6ee" />
        <rect x="568" y="738" width="30" height="20" rx="3" fill="#e4dcd4" />
      </g>

      <IsoPlant x={60} y={800} />
      <IsoPlant x={470} y={830} />
      <IsoPlant x={1530} y={820} />
    </svg>
  );
}
