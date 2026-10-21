import { WALL_Y, type SceneLayout } from "@/lib/monitor/layout";
import { IsoPlant, IsoShelf, IsoTable, IsoWorker, Vitrina } from "./Iso";

/** Pedidos por persona dibujada en cada ambiente (solo ambientación, no es dotación real). */
const ORDERS_PER_WORKER = { pending: 4, production: 3 };

export type Crew = { pending: number; production: number; dispatch: number };

export function KitchenBackdrop({
  calm,
  layout,
  crew,
}: {
  calm: boolean;
  layout: SceneLayout;
  crew: Crew;
}) {
  const {
    width: W,
    height: H,
    rooms,
    fridge,
    zones,
    coldSplitX,
    coldFloorY,
  } = layout;
  const [, a] = rooms.pending;
  const [, b] = rooms.production;
  const partitions = [a, b];
  const prodW = b - a;
  const prodTableW = Math.max(300, prodW - 120 - 130 * 0.72);
  const shelfCount = Math.max(1, Math.floor((prodW - 300) / 300));
  const pendingTableW = Math.max(220, a - 110 - 150 * 0.72);
  const pizarraW = Math.min(300, a - 140);
  const dispatchTableW = Math.max(200, coldSplitX - b - 70 - 110 * 0.72);
  const deliveredTableW = Math.max(200, W - coldSplitX - 60 - 110 * 0.72);
  const lowerTableY = zones.ready_dispatch.y + 40;
  // En la vista Producción los otros ambientes quedan como bordes angostos y no llevan mobiliario.
  const showPending = a >= 400;
  const showCold = W - b >= 700;

  const workers: { x: number; y: number; accent: string; courier?: boolean }[] = [];
  const prodCount = Math.min(6, Math.ceil(crew.production / ORDERS_PER_WORKER.production));
  for (let i = 0; i < prodCount; i++) {
    const table = i % 3;
    const spot = Math.floor(i / 3);
    workers.push({ x: a + 60 + prodTableW * (0.3 + spot * 0.45), y: 440 + table * 280, accent: "#e38ea1" });
  }
  if (showPending) {
    const pendCount = Math.min(2, Math.ceil(crew.pending / ORDERS_PER_WORKER.pending));
    for (let i = 0; i < pendCount; i++) workers.push({ x: 50 + pendingTableW * 0.55, y: 665 + i * 300, accent: "#d7a68d" });
  }
  if (showCold && crew.dispatch > 0) {
    workers.push({ x: b + 40 + dispatchTableW * 0.5, y: lowerTableY + 95, accent: "#a27fc0", courier: true });
  }

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width={W}
      height={H}
      className="h-full w-full"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden
    >
      <defs>
        <pattern id="tile" width="48" height="28" patternUnits="userSpaceOnUse">
          <path
            d="M24 0 L48 14 L24 28 L0 14 Z"
            fill="#f7e7da"
            stroke="#eed7c8"
            strokeWidth="1"
          />
        </pattern>
        <pattern
          id="tileProd"
          width="48"
          height="28"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M24 0 L48 14 L24 28 L0 14 Z"
            fill="#fbeee6"
            stroke="#f0dbcf"
            strokeWidth="1"
          />
        </pattern>
        <pattern
          id="tileCold"
          width="48"
          height="28"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M24 0 L48 14 L24 28 L0 14 Z"
            fill="#eef5f7"
            stroke="#dbe9ee"
            strokeWidth="1"
          />
        </pattern>
        <pattern
          id="wallTile"
          width="26"
          height="16"
          patternUnits="userSpaceOnUse"
        >
          <rect width="26" height="16" fill="#fbe3e3" />
          <rect
            x="0.5"
            y="0.5"
            width="25"
            height="15"
            rx="2"
            fill="#fde9e9"
            stroke="#f3d1d3"
            strokeWidth="0.8"
          />
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
      <rect x="0" y={WALL_Y} width={a} height={H - WALL_Y} fill="url(#tile)" />
      <rect
        x={a}
        y={WALL_Y}
        width={prodW}
        height={H - WALL_Y}
        fill="url(#tileProd)"
      />
      <rect
        x={b}
        y={WALL_Y}
        width={W - b}
        height={H - WALL_Y}
        fill="url(#tileCold)"
      />
      <rect width={W} height={H} fill="url(#light)" />

      {/* Tabiques bajos con vano de paso */}
      {partitions.map((px, i) => (
        <g key={i}>
          <rect x={px - 9} y={150} width="18" height={H - 150} fill="#f3d6d2" />
          <rect x={px - 9} y={150} width="6" height={H - 150} fill="#fff4f1" />
          <rect x={px + 3} y={150} width="6" height={H - 150} fill="#e4bcb8" />
          <rect
            x={px - 11}
            y={760}
            width="22"
            height="180"
            fill="url(#tile)"
            opacity="0.9"
          />
          <rect x={px - 11} y={756} width="22" height="4" fill="#d9a9a6" />
          <rect x={px - 11} y={940} width="22" height="4" fill="#d9a9a6" />
        </g>
      ))}

      {showPending && (
        <>
          {/* Cartel con el logo real */}
          <g>
            <rect
              x="40"
              y="28"
              width="360"
              height="124"
              rx="22"
              fill="#fff"
              stroke="#f0cfd0"
            />
            <image
              href="/brand/logo-tammy.png"
              x="56"
              y="36"
              width="328"
              height="110"
            />
          </g>

          {/* Pizarra de pedidos (ambiente izquierdo) */}
          <g>
            <rect
              x="100"
              y="282"
              width={pizarraW}
              height="100"
              rx="10"
              fill="#4a3b36"
              stroke="#8a6b5e"
              strokeWidth="6"
            />
            <text
              x="120"
              y="320"
              fill="#f7e6d8"
              fontFamily="Georgia, serif"
              fontSize="22"
              fontStyle="italic"
            >
              Pedidos del día
            </text>
            {[0, 1].map((i) => (
              <line
                key={i}
                x1="120"
                y1={342 + i * 20}
                x2={100 + pizarraW * (0.55 + (i % 2) * 0.2)}
                y2={342 + i * 20}
                stroke="#8a7a72"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray="6 8"
              />
            ))}
          </g>

          {/* Mostrador de pedidos por hacer */}
          <IsoTable
            x={50}
            y={560}
            w={pendingTableW}
            d={150}
            h={42}
            top="#f6dcc0"
            left="#c99a70"
            right="#e6c29c"
          />
          <IsoTable
            x={50}
            y={860}
            w={pendingTableW}
            d={150}
            h={42}
            top="#f6dcc0"
            left="#c99a70"
            right="#e6c29c"
          />
        </>
      )}

      {/* Sala de producción: estantes, placa, mesas, batidora */}
      {Array.from({ length: shelfCount }, (_, i) => (
        <IsoShelf
          key={i}
          x={a + 80 + i * 300}
          y={46}
          tint={i % 2 ? "#c9b8e8" : undefined}
        />
      ))}
      <g>
        <rect
          x={b - 200}
          y="90"
          width="170"
          height="40"
          rx="8"
          fill="#fff"
          stroke="#f0cfd0"
        />
        <text
          x={b - 115}
          y="116"
          textAnchor="middle"
          fill="#c45b72"
          fontFamily="sans-serif"
          fontSize="13"
          fontWeight="700"
          letterSpacing="2"
        >
          PRODUCCIÓN
        </text>
      </g>
      <IsoTable
        x={a + 60}
        y={340}
        w={prodTableW}
        d={130}
        h={40}
        top="#e8e4e0"
        left="#b9b1aa"
        right="#d9d2cb"
        edge="#a39b94"
      />
      <IsoTable
        x={a + 60}
        y={620}
        w={prodTableW}
        d={130}
        h={40}
        top="#f6dcc0"
        left="#c99a70"
        right="#e6c29c"
      />
      <IsoTable
        x={a + 60}
        y={900}
        w={prodTableW}
        d={130}
        h={40}
        top="#e8e4e0"
        left="#b9b1aa"
        right="#d9d2cb"
        edge="#a39b94"
      />
      <g className={calm ? "" : "tammy-ops-mixer"}>
        <rect
          x={b - 165}
          y="214"
          width="86"
          height="22"
          rx="8"
          fill="#f2b8c4"
        />
        <rect
          x={b - 137}
          y="180"
          width="28"
          height="44"
          rx="8"
          fill="#e38ea1"
        />
        <circle
          cx={b - 123}
          cy="252"
          r="26"
          fill="#f7f1ea"
          stroke="#d6cbc0"
          strokeWidth="3"
        />
      </g>

      {showCold && (
        <>
          {/* Cámara fría: heladeras, mesas de despacho y entregas */}
          <g>
            <rect
              x={W - 330}
              y="30"
              width="190"
              height="60"
              rx="12"
              fill="#dff1f8"
              stroke="#bcd8e2"
            />
            <line
              x1={W - 235}
              y1="30"
              x2={W - 235}
              y2="90"
              stroke="#bcd8e2"
              strokeWidth="3"
            />
            <rect
              x={W - 120}
              y="40"
              width="100"
              height="36"
              rx="8"
              fill="#e9e3dd"
              stroke="#cfc6bf"
            />
            <g className={calm ? "" : "tammy-ops-glow"}>
              <circle cx={W - 102} cy="58" r="4" fill="#5cc27a" />
            </g>
          </g>
          {fridge.xs.map((fx) => (
            <Vitrina
              key={fx}
              x={fx}
              y={fridge.y}
              w={fridge.w}
              h={fridge.h}
              headH={fridge.headH}
              glow={!calm}
            />
          ))}
          <rect
            x={b + 20}
            y={coldFloorY - 18}
            width={W - b - 40}
            height="4"
            rx="2"
            fill="#cfe2e8"
          />
          <IsoTable
            x={b + 40}
            y={lowerTableY}
            w={dispatchTableW}
            d={110}
            h={34}
            top="#e6d2f4"
            left="#b894d0"
            right="#d8c0ea"
            edge="#a27fc0"
          />
          <IsoTable
            x={coldSplitX + 30}
            y={lowerTableY}
            w={deliveredTableW}
            d={110}
            h={34}
            top="#d7f0e0"
            left="#8fc9a8"
            right="#c5e8d2"
            edge="#7cb894"
          />
        </>
      )}

      {workers.map((w, i) => (
        <IsoWorker key={i} x={w.x} y={w.y} accent={w.accent} courier={w.courier} variant={i} animate={!calm} />
      ))}

      <IsoPlant x={30} y={1130} />
      <IsoPlant x={b - 40} y={1140} />
      <IsoPlant x={W - 40} y={1130} />
    </svg>
  );
}
