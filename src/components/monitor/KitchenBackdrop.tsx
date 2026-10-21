export function KitchenBackdrop({ calm }: { calm: boolean }) {
  return (
    <svg viewBox="0 0 1600 900" className="h-full w-full" aria-hidden>
      <defs>
        <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f8e6dc" />
          <stop offset="100%" stopColor="#ecd3c4" />
        </linearGradient>
        <linearGradient id="wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fde8e6" />
          <stop offset="100%" stopColor="#f7d4d0" />
        </linearGradient>
        <linearGradient id="wood" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f3d7b8" />
          <stop offset="100%" stopColor="#d7ae86" />
        </linearGradient>
        <linearGradient id="fridge" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#e8f7fb" />
          <stop offset="100%" stopColor="#c5e4ee" />
        </linearGradient>
      </defs>
      <rect width="1600" height="900" fill="url(#wall)" />
      <polygon points="0,390 1600,390 1600,900 0,900" fill="url(#floor)" />
      <polygon points="0,390 180,250 1420,250 1600,390" fill="#fce8e2" />
      <rect x="40" y="70" width="360" height="150" rx="18" fill="#fff" opacity="0.72" />
      <text x="80" y="130" fill="#c45b72" fontFamily="Georgia, serif" fontSize="36" fontWeight="700">Postres Tammy</text>
      <text x="80" y="168" fill="#a97880" fontFamily="sans-serif" fontSize="16">Un mundo más dulce</text>

      <g transform="translate(90,470)">
        <polygon points="20,40 250,10 480,40 250,80" fill="url(#wood)" />
        <polygon points="20,40 20,110 250,150 250,80" fill="#c89a6e" />
        <polygon points="250,80 250,150 480,110 480,40" fill="#e2bc90" />
      </g>
      <g transform="translate(520,175)">
        <polygon points="10,50 220,10 430,50 220,90" fill="url(#wood)" />
        <polygon points="10,50 10,130 220,170 220,90" fill="#c08962" />
        <polygon points="220,90 220,170 430,130 430,50" fill="#e6c39a" />
        <g className={calm ? "" : "tammy-ops-mixer"}>
          <rect x="175" y="20" width="70" height="18" rx="6" fill="#d9d4cf" />
          <rect x="198" y="-10" width="24" height="40" rx="8" fill="#b0aaa4" />
          <circle cx="210" cy="70" r="28" fill="#efeae4" stroke="#c9c0b8" />
        </g>
      </g>
      <g transform="translate(1020,145)">
        {[0, 1, 2].map((i) => (
          <g key={i} transform={`translate(${i * 165},0)`}>
            <rect x="0" y="20" width="140" height="280" rx="16" fill="url(#fridge)" stroke="#9cc9d6" />
            <rect x="12" y="40" width="116" height="200" rx="10" fill="#dff4f8" opacity="0.85" />
            <rect className={calm ? "" : "tammy-ops-glow"} x="18" y="48" width="104" height="184" rx="8" fill="#ffffff" />
            <circle cx="128" cy="160" r="5" fill="#7aa3b0" />
            <text x="70" y="270" textAnchor="middle" fill="#4d7c8a" fontSize="13" fontFamily="sans-serif">Heladera {i + 1}</text>
          </g>
        ))}
      </g>
      <g transform="translate(530,530)">
        <polygon points="10,40 200,8 390,40 200,78" fill="#dcc4ee" />
        <polygon points="10,40 10,110 200,148 200,78" fill="#b894d0" />
        <polygon points="200,78 200,148 390,110 390,40" fill="#e8d6f5" />
      </g>
      <g transform="translate(1040,545)">
        <polygon points="10,30 240,0 470,30 240,68" fill="#cfead8" />
        <polygon points="10,30 10,90 240,128 240,68" fill="#97c9ab" />
        <polygon points="240,68 240,128 470,90 470,30" fill="#e3f5ea" />
      </g>
      <rect x="70" y="400" width="150" height="28" rx="14" fill="#f4c2c8" />
      <text x="145" y="419" textAnchor="middle" fill="#8a3d4a" fontSize="13" fontFamily="sans-serif" fontWeight="700">Por hacer</text>
      <rect x="530" y="122" width="150" height="28" rx="14" fill="#f6d9a8" />
      <text x="605" y="141" textAnchor="middle" fill="#7a5a18" fontSize="13" fontFamily="sans-serif" fontWeight="700">Producción</text>
      <rect x="1020" y="108" width="130" height="28" rx="14" fill="#bfe6ef" />
      <text x="1085" y="127" textAnchor="middle" fill="#2f6d7c" fontSize="13" fontFamily="sans-serif" fontWeight="700">Heladeras</text>
      <rect x="540" y="478" width="130" height="28" rx="14" fill="#d4c0ee" />
      <text x="605" y="497" textAnchor="middle" fill="#5b3d86" fontSize="13" fontFamily="sans-serif" fontWeight="700">Despacho</text>
      <rect x="1048" y="508" width="150" height="28" rx="14" fill="#b8e0c8" />
      <text x="1123" y="527" textAnchor="middle" fill="#2f6b45" fontSize="13" fontFamily="sans-serif" fontWeight="700">Entregados</text>
    </svg>
  );
}
