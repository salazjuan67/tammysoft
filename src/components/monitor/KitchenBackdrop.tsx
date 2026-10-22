import { WALL_Y, type SceneLayout } from "@/lib/monitor/layout";
import { IsoPlant, IsoShelf, IsoTable, Vitrina } from "./Iso";

/** Pedidos por persona dibujada en cada ambiente (solo ambientación, no es dotación real). */
const ORDERS_PER_WORKER = { pending: 4, production: 3, cold: 5 };

export type Crew = { pending: number; production: number; cold: number };
export type CrewStation = { x: number; y: number };
/**
 * Frente de una mesa donde pueden pararse personas: `y` = pies, `x0..x1` = tramo caminable.
 * Los pies van lo bastante adelante como para que la cabeza quede debajo de las etiquetas de esa mesa.
 */
export type CrewTable = { y: number; x0: number; x1: number };
/** Un grupo por ambiente: `count` personas que se reparten entre los huecos libres de sus mesas. */
export type CrewGroup = {
  key: string;
  count: number;
  tables: CrewTable[];
  accent: string;
  courier?: boolean;
};
export type CrewGroupWithStations = Omit<CrewGroup, "tables"> & {
  stations: CrewStation[];
};

export function crewGroups(layout: SceneLayout, crew: Crew): CrewGroup[] {
  const { width: W, rooms, tables } = layout;
  const [, a] = rooms.pending;
  const [, b] = rooms.production;
  const prodTableW = Math.max(300, b - a - 120 - 130 * 0.72);
  const pendingTableW = Math.max(220, a - 110 - 150 * 0.72);
  const deliveredTableW = Math.max(200, W - b - 70 - 110 * 0.72);
  const showPending = a >= 400;
  const showCold = W - b >= 700;

  const groups: CrewGroup[] = [
    {
      key: "production",
      count: Math.min(
        6,
        Math.ceil(crew.production / ORDERS_PER_WORKER.production),
      ),
      tables: tables.production.map((ty) => ({
        y: ty + 140,
        x0: a + 80,
        x1: a + 60 + prodTableW + 40,
      })),
      accent: "#e38ea1",
    },
  ];
  if (showPending) {
    groups.push({
      key: "pending",
      count: Math.min(3, Math.ceil(crew.pending / ORDERS_PER_WORKER.pending)),
      tables: tables.pending.map((ty) => ({
        y: ty + 140,
        x0: 80,
        x1: 50 + pendingTableW + 30,
      })),
      accent: "#d7a68d",
    });
  }
  // Cámara fría: quienes acomodan heladeras y entregan. Solo frente a la mesa delantera:
  // las mesas de entregados están juntas y entre ellas taparían etiquetas.
  if (showCold) {
    groups.push({
      key: "cold",
      count: crew.cold > 0 ? Math.min(3, Math.max(1, Math.ceil(crew.cold / ORDERS_PER_WORKER.cold))) : 0,
      tables: tables.delivered.slice(-1).map((ty) => ({
        y: ty + 120,
        x0: b + 80,
        x1: b + 40 + deliveredTableW + 30,
      })),
      accent: "#7fb6c8",
    });
  }
  return groups;
}

const STATION_STEP = 20;
const STATION_SPACING = 90;

/**
 * Lugares frente a cada mesa sin quedar justo delante de una caja
 * (`clearance` = distancia horizontal mínima al centro de una caja de esa mesa).
 * Las mesas se intercalan para que las primeras personas queden repartidas.
 */
export function crewStations(
  group: CrewGroup,
  crates: CrewStation[],
  clearance: number,
): CrewGroupWithStations {
  const perTable = group.tables.map((t) => {
    const onTable = crates
      .filter((c) => c.y < t.y && c.y > t.y - 300)
      .map((c) => c.x);
    const picked: number[] = [];
    for (let x = t.x0; x <= t.x1; x += STATION_STEP) {
      if (onTable.some((cx) => Math.abs(cx - x) < clearance)) continue;
      if (picked.length && x - picked[picked.length - 1] < STATION_SPACING)
        continue;
      picked.push(x);
    }
    return picked.map((x) => ({ x, y: t.y }));
  });
  const stations: CrewStation[] = [];
  for (let k = 0; perTable.some((l) => k < l.length); k++) {
    for (const list of perTable) if (k < list.length) stations.push(list[k]);
  }
  const { tables: _tables, ...rest } = group;
  void _tables;
  return { ...rest, stations, count: Math.min(group.count, stations.length) };
}

export function KitchenBackdrop({
  calm,
  layout,
}: {
  calm: boolean;
  layout: SceneLayout;
}) {
  const {
    width: W,
    height: H,
    rooms,
    fridge,
    coldFloorY,
    tables,
  } = layout;
  const [, a] = rooms.pending;
  const [, b] = rooms.production;
  const partitions = [a, b];
  const prodW = b - a;
  const prodTableW = Math.max(300, prodW - 120 - 130 * 0.72);
  const shelfCount = Math.max(1, Math.floor((prodW - 300) / 300));
  const pendingTableW = Math.max(220, a - 110 - 150 * 0.72);
  const pizarraW = Math.min(300, a - 140);
  const deliveredTableW = Math.max(200, W - b - 70 - 110 * 0.72);
  // En la vista Producción los otros ambientes quedan como bordes angostos y no llevan mobiliario.
  const showPending = a >= 400;
  const showCold = W - b >= 700;
  const showProduction = prodW >= 500;

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
          id="tilePending"
          width="48"
          height="28"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M24 0 L48 14 L24 28 L0 14 Z"
            fill="#efe1c8"
            stroke="#e2cfae"
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
      <rect x="0" y={WALL_Y} width={a} height={H - WALL_Y} fill="url(#tilePending)" />
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
          {/* Pizarra de pedidos, colgada arriba en la pared */}
          <g>
            <rect
              x="60"
              y="40"
              width={pizarraW}
              height="100"
              rx="10"
              fill="#4a3b36"
              stroke="#8a6b5e"
              strokeWidth="6"
            />
            <text
              x="80"
              y="78"
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
                x1="80"
                y1={100 + i * 20}
                x2={60 + pizarraW * (0.55 + (i % 2) * 0.2)}
                y2={100 + i * 20}
                stroke="#8a7a72"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray="6 8"
              />
            ))}
          </g>

          {/* Mostradores de pedidos por hacer */}
          {tables.pending.map((ty) => (
            <IsoTable
              key={ty}
              x={50}
              y={ty}
              w={pendingTableW}
              d={150}
              h={42}
              top="#f6dcc0"
              left="#c99a70"
              right="#e6c29c"
            />
          ))}
        </>
      )}

      {/* Sala de producción: estantes, placa, mesas */}
      {showProduction && (
        <>
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
        </>
      )}

      {showCold && (
        <>
          {/* Cámara fría: heladeras y mesas de entregados */}
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
          {tables.delivered.map((ty) => (
            <IsoTable
              key={ty}
              x={b + 40}
              y={ty}
              w={deliveredTableW}
              d={110}
              h={34}
              top="#d7f0e0"
              left="#8fc9a8"
              right="#c5e8d2"
              edge="#7cb894"
            />
          ))}
        </>
      )}

      <IsoPlant x={30} y={1130} />
      <IsoPlant x={b - 40} y={1140} />
      <IsoPlant x={W - 40} y={1130} />
    </svg>
  );
}
