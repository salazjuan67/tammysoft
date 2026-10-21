import { IsoFridge, IsoTable } from "./Iso";

export function KitchenBackdrop({ calm }: { calm: boolean }) {
  return (
    <svg viewBox="0 0 1600 900" className="h-full w-full" preserveAspectRatio="xMidYMid meet" aria-hidden>
      <defs>
        <pattern id="tile" width="48" height="28" patternUnits="userSpaceOnUse">
          <path d="M24 0 L48 14 L24 28 L0 14 Z" fill="#f6e4d6" stroke="#edd4c4" strokeWidth="1" />
        </pattern>
        <linearGradient id="backwall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fdece8" />
          <stop offset="100%" stopColor="#f4d3cc" />
        </linearGradient>
      </defs>

      <rect width="1600" height="900" fill="url(#backwall)" />
      <polygon points="0,250 1600,250 1600,900 0,900" fill="url(#tile)" />
      <polygon points="0,250 90,168 1510,168 1600,250" fill="#f8ddd6" />

      <rect x="48" y="54" width="420" height="108" rx="18" fill="#fff8f6" stroke="#f0cfd0" />
      <text x="78" y="102" fill="#d45a78" fontFamily="Georgia, serif" fontSize="34" fontWeight="700">Postres Tammy</text>
      <text x="80" y="132" fill="#b07a82" fontFamily="sans-serif" fontSize="14" letterSpacing="2">UN MUNDO MÁS DULCE</text>

      <g opacity="0.9">
        <rect x="720" y="70" width="70" height="90" rx="8" fill="#e8d5c8" />
        <rect x="800" y="58" width="70" height="102" rx="8" fill="#decdc0" />
        <rect x="880" y="78" width="64" height="82" rx="8" fill="#ead9cc" />
      </g>

      <g className={calm ? "" : "tammy-ops-mixer"}>
        <rect x="700" y="210" width="86" height="22" rx="8" fill="#d8d2cc" />
        <rect x="728" y="176" width="28" height="44" rx="8" fill="#b8b1aa" />
        <circle cx="742" cy="248" r="26" fill="#f4eee8" stroke="#c9c0b8" strokeWidth="3" />
      </g>
      <ellipse cx="640" cy="268" rx="28" ry="12" fill="#f3c4b0" />
      <ellipse cx="640" cy="258" rx="22" ry="16" fill="#e8a090" />
      <ellipse cx="790" cy="272" rx="32" ry="13" fill="#5a3328" />
      <ellipse cx="790" cy="260" rx="24" ry="14" fill="#3f241c" />

      <IsoTable x={90} y={560} w={360} d={150} h={42} top="#f4d7bb" />
      <IsoTable x={520} y={320} w={340} d={130} h={40} top="#efd0b0" />
      <IsoTable x={500} y={620} w={360} d={130} h={40} top="#e6d2f4" left="#b894d0" right="#d8c0ea" />
      <IsoTable x={1000} y={670} w={400} d={120} h={36} top="#d7f0e0" left="#8fc9a8" right="#c5e8d2" />

      <IsoFridge x={1028} y={188} label="Heladera 1" glow={!calm} />
      <IsoFridge x={1188} y={188} label="Heladera 2" glow={!calm} />
      <IsoFridge x={1348} y={188} label="Heladera 3" glow={!calm} />

      <ellipse cx="430" cy="780" rx="16" ry="8" fill="#7aa36a" />
      <rect x="424" y="720" width="12" height="60" fill="#6b8f52" />
      <ellipse cx="1500" cy="780" rx="16" ry="8" fill="#7aa36a" />
      <rect x="1494" y="720" width="12" height="60" fill="#6b8f52" />

      <g>
        <rect x="86" y="498" width="132" height="26" rx="13" fill="#f4c2c8" />
        <text x="152" y="516" textAnchor="middle" fill="#8a3d4a" fontSize="12" fontFamily="sans-serif" fontWeight="700">Por hacer</text>
        <rect x="528" y="258" width="132" height="26" rx="13" fill="#f6d9a8" />
        <text x="594" y="276" textAnchor="middle" fill="#7a5a18" fontSize="12" fontFamily="sans-serif" fontWeight="700">Producción</text>
        <rect x="1030" y="154" width="120" height="26" rx="13" fill="#bfe6ef" />
        <text x="1090" y="172" textAnchor="middle" fill="#2f6d7c" fontSize="12" fontFamily="sans-serif" fontWeight="700">Heladeras</text>
        <rect x="508" y="560" width="120" height="26" rx="13" fill="#d4c0ee" />
        <text x="568" y="578" textAnchor="middle" fill="#5b3d86" fontSize="12" fontFamily="sans-serif" fontWeight="700">Despacho</text>
        <rect x="1010" y="612" width="150" height="26" rx="13" fill="#b8e0c8" />
        <text x="1085" y="630" textAnchor="middle" fill="#2f6b45" fontSize="12" fontFamily="sans-serif" fontWeight="700">Entregados hoy</text>
      </g>
    </svg>
  );
}
